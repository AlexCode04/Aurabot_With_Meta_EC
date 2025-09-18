const { OpenAI } = require("openai");
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });


async function extraerInformacionUsuario(historial, datosPrevios) {
    const historialTexto = historial
        .map((r, i) => `${i + 1}. Usuario: ${r.respuesta}\n   Aura: ${r.pregunta}`)
        .join("\n\n");

    const prompt = `
A continuación se presenta un historial de conversación entre un asistente de bienestar y un usuario.

Tu tarea es **extraer información personal del usuario** en un formato JSON con los siguientes campos:
- nombre
- edad este es un numero, por ende si no lo encuentras debes poner 0
- profesion
- circuloSocial (personas cercanas o con las que interactúa. Si hay varias, sepáralas con "|")
- ciudad
- familiares (si menciona familia: madre, padre, hermanos, etc. Sepáralos con "|")
- hobbies (actividades que disfruta o realiza con frecuencia. Sepáralos con "|")
- estadogeneral (emociones o estado general que expresa: ejemplo, ansioso, triste, motivado, etc.)

con esta estructura exacta, no agregues más campos ni detalles adicionales y no uses comillas adicionales, tampoco markdown ni formato especial:

{
  "nombre": "...",
  "edad": ...,
  "profesion": "...",
  "circuloSocial": "...",
  "ciudad": "...",
  "familiares": "...",
  "hobbies": "...",
  "estadogeneral": "..."
}

También se te entrega un JSON con datos previos que ya fueron obtenidos:

Datos previos:
${JSON.stringify(datosPrevios, null, 2)}

Tu objetivo es:
- **Mantener los datos que ya están** en el JSON previo
- **Actualizar solo los que no tienen valor** ("null" o "No encontrado"), si logras inferirlos desde el historial
- Si no se puede determinar un campo, escribe exactamente: "No encontrado"

Devuelve únicamente el JSON final, sin explicaciones ni texto adicional.
No lo hagas en formato markdown ni uses comillas adicionales.
un ejemplo de respuesta correcta es:

{
  "nombre": "Carla",
  "edad": 28,
  "profesion": "Diseñadora gráfica",
  "circuloSocial": "Amigos del trabajo|Compañeros de yoga",
  "ciudad": "Madrid",
  "familiares": "Madre|Hermana",
  "hobbies": "Pintar|Correr|Leer",
  "estadogeneral": "Ansiosa"
}

Historial de conversación:
${historialTexto}
`;

    try {
        const completion = await openai.chat.completions.create({
            model: "gpt-4o",
            max_tokens: 400,
            temperature: 0.3,
            messages: [
                {
                    role: "system",
                    content: "Eres un extractor de información estructurada de conversaciones de bienestar."
                },
                {
                    role: "user",
                    content: prompt
                }
            ]
        });

        const texto = completion.choices[0].message.content.trim();

        // Intentar convertir a JSON
        try {
            const json = JSON.parse(texto);
            console.log("Información del usuario extraída:", json);
            return json;
        } catch (parseErr) {
            console.error("❌ Error al parsear JSON:", parseErr);
            console.log("Respuesta recibida:\n", texto);
            return null;
        }
    } catch (err) {
        console.error("❌ Error extrayendo información del usuario:", err);
        return null;
    }
}

async function evaluarInteresRespiracion(respuestaUsuario) {
    try {
        const prompt = `
                Eres un asistente que analiza si una persona acepta o no una sugerencia de hacer una práctica de respiración guiada.

                Analiza el siguiente mensaje del usuario y responde solo con "SI" si el usuario está interesado en practicar la respiración guiada y muestra cercania o motivacion de hacerlo, o "NO" si no lo esta complemente.

                Mensaje del usuario:
                "${respuestaUsuario}"
                `;

        const completion = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            max_tokens: 5,
            temperature: 0.1,
            messages: [{ role: "user", content: prompt }],
        });

        const respuesta = completion.choices[0].message.content.trim().toUpperCase();
        return respuesta === "SI";
    } catch (err) {
        console.error("Error evaluando intención de respiración:", err);
        return false;
    }
}
async function evaluarConsentimientoDatos(respuestaUsuario) {
    try {
        const prompt = `
Eres un asistente que analiza si una persona acepta o no el tratamiento de sus datos personales y comunicarse a través de este medio.

Responde estrictamente con:
- 1 si el usuario acepta expresamente el tratamiento de sus datos personales y comunicarse por este medio.
- 0 si el usuario no lo acepta.
- 2 si la respuesta es ambigua.

No escribas nada más.

Mensaje del usuario:
"${respuestaUsuario}"
        `;

        const completion = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            max_tokens: 1,
            temperature: 0,
            messages: [{ role: "user", content: prompt }],
        });

        return parseInt(completion.choices[0].message.content.trim(), 10);
    } catch (err) {
        console.error("Error evaluando consentimiento de datos:", err);
        return 2; // Ambiguo por defecto en caso de error
    }
}



async function detectarInteresComunidad(historial) {
    const historialTexto = historial
        .map((r, i) => `${i + 1}. Usuario: ${r.respuesta}\n   Aura: ${r.pregunta}`)
        .join("\n\n");

    const prompt = `
        Analiza esta conversación para detectar si el usuario muestra INTERÉS GENUINO Y EXPLÍCITO en unirse a grupos o comunidades de bienestar/mindfulness/meditación.

        CRITERIOS ESTRICTOS para responder "true":
        El usuario debe expresar CLARAMENTE interés en:
        - Unirse a un grupo/comunidad/círculo de apoyo
        - Participar en actividades grupales de bienestar
        - Conocer otras personas con intereses similares
        - Formar parte de una comunidad de práctica
        - Recibir apoyo grupal o comunitario

        EJEMPLOS que SÍ califican como "true":
        - "Me gustaría unirme a esa comunidad"
        - "Sí, quiero participar en el grupo"
        - "Me interesa conocer más sobre esa comunidad"
        - "¿Cómo puedo formar parte?"
        - "Suena interesante, me apunto"
        - "Quiero unirme al grupo de meditación"

        EJEMPLOS que NO califican (responde "false"):
        - "Ok", "Vale", "Entiendo", "Gracias"
        - "Me gusta la idea" (sin mencionar participación)
        - "Está bien" o cualquier respuesta genérica
        - Solo hablar de querer sentirse mejor sin mencionar grupos
        - Preguntas generales sobre meditación sin interés grupal
        - Respuestas de cortesía o confirmación simple

        IMPORTANTE: Si el usuario solo da respuestas cortas, genéricas o de cortesía (como "Ok", "Si", "Gracias"), esto NO indica interés genuino en comunidades.

        Historial de conversación:
        ${historialTexto}

        Responde exactamente "true" o "false". No agregues explicaciones ni comillas.
        `;

    try {
        const completion = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            max_tokens: 10,
            temperature: 0,
            messages: [
                {
                    role: "system",
                    content: "Eres un detector ultra-específico de interés genuino en comunidades. Solo respondes 'true' cuando hay interés explícito y claro en participar en grupos o comunidades."
                },
                {
                    role: "user",
                    content: prompt
                }
            ]
        });

        const respuesta = completion.choices[0].message.content.trim().toLowerCase();
        return respuesta === "true";
    } catch (err) {
        console.error("❌ Error detectando interés en comunidad:", err);
        return false;
    }
}


async function recomendarGrupo(historial, gruposDisponibles) {
    const historialTexto = historial
        .map((r, i) => `${i + 1}. Usuario: ${r.respuesta}\n Aura: ${r.pregunta}`)
        .join("\n\n");

    const prompt = `Eres Aura Calmness, un psicólogo especializado en mindfulness. Tu estilo es profesional, humano, cercano y empático. 🍃✨ 

        Tu tarea es analizar el historial de conversación del usuario y recomendar siempre UN SOLO grupo de la lista proporcionada.  
        Nunca digas que no tienes grupos para recomendar.  
        Si no hay coincidencia exacta con lo que necesita el usuario, elige el grupo más cercano en tema o enfoque.  
        Si hay varias opciones cercanas, elige la que creas que puede generar mayor impacto positivo en su situación emocional.

        IMPORTANTE:
        - Evita repetir mensajes ya enviados. Cada recomendación debe ser nueva y única.
        - Tu análisis debe priorizar coincidencias semánticas, no solo palabras exactas.
        - Considera sinónimos, temas relacionados y beneficios indirectos.
        - Si el grupo no es exactamente para el problema del usuario, adapta el mensaje para explicar cómo AÚN ASÍ puede ayudarle.

        PROCESO DE ANÁLISIS:
        1. Lee cuidadosamente el historial del usuario e identifica:
        - Sus emociones actuales (tristeza, ansiedad, estrés, etc.)
        - Sus preocupaciones principales
        - Los temas que menciona
        - Su estado emocional general

        2. Analiza cada grupo disponible:
        - ¿Qué emociones o temas aborda?
        - ¿Qué beneficios ofrece?
        - ¿Qué técnicas o enfoques usa?
        - ¿Cómo puede ayudar, directa o indirectamente, al usuario?

        3. Haz matching dinámico:
        - Busca coincidencias semánticas entre lo que siente/menciona el usuario y lo que ofrece el grupo.
        - Considera beneficios indirectos (ej: un grupo de meditación puede ayudar aunque el usuario hable de estrés laboral).
        - Elige el más cercano si no hay exacto.

        IMPORTANTE: FORMATO DE RESPUESTA (sin markdown, sin corchetes, sin asteriscos) y separa cada sección con un salto de línea:
        Mensaje: [texto cálido de 2-3 líneas explicando la conexión específica entre lo que siente el usuario y cómo este grupo puede ayudarle, usando emojis de bienestar]
        Título: [nombre del grupo]
        URL: [url del grupo]

        Lista de grupos disponibles:
        ${JSON.stringify(gruposDisponibles, null, 2)}

        Historial de conversación:
        ${historialTexto}`;


    try {
        const completion = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            max_tokens: 300,
            temperature: 0.3,
            messages: [
                {
                    role: "system",
                    content: "Eres Aura Calmness, un psicólogo especializado en mindfulness. Respondes de forma breve, empática y cálida. SIEMPRE analiza si hay un grupo adecuado antes de decir que no tienes ninguno."
                },
                {
                    role: "user",
                    content: prompt
                }
            ]
        });

        const mensaje = completion.choices[0].message.content.trim();
        return mensaje;
        
    } catch (err) {
        console.error("❌ Error generando mensaje de Aura:", err);
        return "🌿 Disculpa, en este momento tengo dificultades técnicas. Por favor intenta de nuevo en un momento. Estoy aquí para apoyarte. ✨";
    }
}


async function generarMensajePreparacionMeditacion(usuarioMensaje) {
    const prompt = `
        Eres Aura, una guía de mindfulness. El usuario ha aceptado hacer una práctica de respiración guiada.
        De acuerdo con la intencion del usuario, que ha expresado su interés en una meditación guiada, y con base en el mensaje que te envió, crea un mensaje cálido y cercano para introducir la meditación.
        Con base en su mensaje:
        "${usuarioMensaje}"

        Genera una breve frase (una o dos oraciones) en tono cálido y empático para introducir el envío de un audio de meditación. No digas literalmente que vas a preparar el audio, sino expresa entusiasmo y cercanía, conectando con lo que el usuario dijo. No repitas el mensaje del usuario.

        Ejemplo de tono: "Qué bonito que te animes a probarlo. Prepara un espacio tranquilo, ahora te acompaño en una breve práctica 🌿"
        `;

    try {
        const completion = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            temperature: 0.7,
            max_tokens: 60,
            messages: [
                { role: "system", content: "Eres Aura, una guía de mindfulness empática y cercana." },
                { role: "user", content: prompt }
            ]
        });

        return completion.choices[0].message.content.trim();
    } catch (err) {
        console.error("❌ Error generando mensaje de introducción a meditación:", err);
        return "🌿 Me alegra que quieras intentarlo. Voy a acompañarte con una meditación especial ahora.";
    }
}

async function generarObservacionFinal(historial) {
    const historialTexto = historial
        .map((r, i) => `${i + 1}. Usuario: ${r.respuesta}\n   Aura: ${r.pregunta}`)
        .join("\n\n");

    const prompt = `
                Eres un analizador especializado en conversaciones de bienestar mental.

                Tu función es evaluar esta conversación para determinar el nivel de apoyo que necesita la persona.

                Analiza específicamente:
                - Indicadores de crisis o riesgo emocional
                - Patrones de pensamiento preocupantes
                - Nivel de funcionalidad en la vida diaria
                - Capacidad de afrontamiento actual
                - Necesidad de intervención profesional

                Conversación:
                ${historialTexto}

               Genera un análisis objetivo de máximo 50 palabras indicando:
                    1. Estado emocional general
                    2. Nivel de riesgo (bajo/medio/alto)
                    3. Justificación breve
                    4. Recomendación de apoyo profesional (sí/no)
                `;

    const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        max_tokens: 200,
        temperature: 0.6,
        messages: [
            { role: "system", content: "Eres un analizador especializado en conversaciones de bienestar mental." },
            { role: "user", content: prompt }
        ]
    });

    const respuesta = completion.choices[0].message.content.trim();

    // Extraer si recomienda apoyo profesional
    const necesitaApoyo = respuesta.toLowerCase().includes("recomendación de apoyo profesional: sí");

    // Extraer solo la justificación (punto 4)
    const matchJustificacion = respuesta.match(/4\.\s*Justificación breve:\s*(.+)/i);
    const justificacion = matchJustificacion ? matchJustificacion[1].trim() : respuesta;

    return {
        observacion: justificacion,
        necesitaApoyoProfesional: necesitaApoyo,
        textoCompleto: respuesta // opcional para guardar si deseas el análisis completo
    };
}

async function registrarNombreBD(historial) {
    const historialTexto = historial
        .map((r, i) => `${i + 1}. Usuario: ${r.respuesta}\n   Aura: ${r.pregunta}`)
        .join("\n\n");

    const prompt = `
                A continuación se presenta un historial de conversación entre un asistente y un usuario.
                Tu tarea es extraer únicamente el nombre del usuario, si lo menciona en alguna parte del diálogo.
                Devuelve solo el nombre propio, sin explicaciones, saludos ni ningún otro texto.
                Si hay múltiples nombres, elige el que el usuario usa para referirse a sí mismo (por ejemplo: “Me llamo Carla”).
                Si no se menciona ningún nombre, responde únicamente con: NOMBRE NO ENCONTRADO.

                Conversación:
                ${historialTexto}

                `;

    const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        max_tokens: 50,
        temperature: 0.2,
        messages: [
            { role: "system", content: "Eres un modelo especializado en analizar historiales de conversación entre un asistente virtual y un usuario con el objetivo unicamente de obtener el nombre del usuario." },
            { role: "user", content: prompt }
        ]
    });

    return completion.choices[0].message.content.trim();

}

async function detectarIntencionMeditacion(ultimaRespuesta, ultimaPregunta) {

    const prompt = `
                    A continuación se muestra la ultima respuesta registrada entre un usuario y un asistente de mindfulness.
                    Tu tarea es detectar si en algún punto el usuario ha **pedido explícitamente** o **aceptado hacer** una meditación guiada (en formato de audio). Esto incluye frases como: "quiero meditar", "pon el audio", "quiero escuchar la meditación", etc.
                    Ten en cuenta que aplica para toda petición de que envie un audio, frases como "quiero un audio", "quiero escuchar un audio", "quiero una meditación", "quiero hacer una meditación", "quiero probar la meditación", "quiero intentar la meditación", "me gustaría hacer una meditación", etc. son todas indicativas de que el usuario quiere hacer una meditación guiada.

                    REGLAS:
                    - Si el usuario muestra intención clara de hacer o escuchar una meditación, responde solo con: PEDIR_MEDITACION
                    - Si no hay ninguna señal clara de intención, responde solo con: NO_ENCONTRADO
                    - No des ninguna explicación adicional.

                    Ultima respuesta del sistema:
                    ${ultimaPregunta}

                   Ultima respuesta del usuario de la conversación:
                    ${ultimaRespuesta}
                    `;

    const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        max_tokens: 10,
        temperature: 0,
        messages: [
            { role: "system", content: "Eres un modelo que analiza conversaciones para detectar si el usuario quiere realizar una meditación guiada o escuchar un audio de meditación." },
            { role: "user", content: prompt }
        ]
    });

    return completion.choices[0].message.content.trim();
}



function decidirMensajeFinal(necesitaApoyo) {
    if (necesitaApoyo) {
        return `Gracias por compartir este espacio conmigo. Con base en lo que hemos hablado, creo que podría ser muy valioso que consideres acompañamiento profesional además del grupo. \nSi lo deseas, también puedes unirte a nuestro grupo de WhatsApp para seguir en contacto 💬✨`;
    }

    return `Ha sido un gusto acompañarte en esta sesión. Si quieres seguir explorando el mindfulness en comunidad, puedes unirte a nuestro grupo de WhatsApp 💬✨`;
}

async function generarMensajeConsentimientoAura(tipoRespuesta) {
  const sistema = `Eres Aura Calmness, un psicólogo especializado en Mindfulness. Tu forma de hablar es cálida, empática, profesional y cercana. Usas un lenguaje claro y accesible, adornado ocasionalmente con emojis relacionados con calma y bienestar (🍃, 🌬️, ✨, 😊, 🙏). Estás en una sesión profesional de atención a través de chat en maximo 3 lineas.`;

  const instrucciones = {
    SI: `El usuario ha aceptado el tratamiento de datos personales. Agradécele de manera cálida, profesional y humana, no dejes preguntas abiertas, no digas que estas para el usuario, simplemente se claro y agradece su confianza.`,

    NO: `El usuario ha rechazado el tratamiento de datos personales. Explícale con respeto y amabilidad que no puedes continuar sin su consentimiento. Anímale a reconsiderar si se siente cómodo y lo indique en el próximo mensaje, pero sin presionarlo. Transmite contención, cuidado y límites profesionales.`,

    INVALIDO: `El usuario ha respondido de forma ambigua o no clara respecto al tratamiento de datos personales. Pídele amablemente que confirme si acepta o no, usando una pregunta cordial y clara. Ofrece contexto de por qué es necesario su consentimiento, y mantén un tono cercano, tranquilo y profesional.`
  };

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      temperature: 0.5,
      messages: [
        { role: "system", content: sistema },
        { role: "user", content: instrucciones[tipoRespuesta] }
      ]
    });

    return completion.choices[0].message.content.trim();
  } catch (error) {
    console.error("❌ Error al generar mensaje con Aura Calmness:", error);

    // Fallbacks por si GPT falla
    if (tipoRespuesta === "SI") {
      return "Gracias por tu confianza 🍃. Podemos continuar con tranquilidad, cuidando siempre tu bienestar.";
    } else if (tipoRespuesta === "NO") {
      return "Entiendo y respeto tu decisión 🙏. No podré continuar sin tu consentimiento, pero si cambias de opinión estaré aquí para acompañarte.";
    } else {
      return "¿Podrías confirmarme si estás de acuerdo con el tratamiento de tus datos personales? Es importante para poder continuar con esta sesión 🌿.";
    }
  }
}


module.exports = { generarObservacionFinal, 
    decidirMensajeFinal, 
    evaluarInteresRespiracion, 
    generarMensajePreparacionMeditacion, 
    registrarNombreBD, 
    detectarIntencionMeditacion, 
    extraerInformacionUsuario,
    detectarInteresComunidad,
    recomendarGrupo,
    evaluarConsentimientoDatos,
    generarMensajeConsentimientoAura
};
