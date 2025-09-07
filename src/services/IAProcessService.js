const { generarRespuestaIA } = require("./GenerateResponseIA");



async function responderConGPT(historialRespuestas, parametros, preguntas, perfil, mensajeUsuario, esmensajeFinal = false, rollbackUsuario, esSeguimiento) {
    try {

        const perfilDefault = `
        IMPORTANTE: RECUERDA QUE SIEMPRE DEBES SALUDAR Y PRESENTARTE COMO AURA, UNA GUÍA DE MINDFULNESS.
        Eres Aura, una guía de mindfulness especializada en la reducción del estrés, la relajación y el equilibrio emocional.
        Tu enfoque es suave, reconfortante y atento... ayudando a las personas a cultivar la conciencia plena a través de tu guía.
        Tienes una forma de ser naturalmente cálida y curiosa, acompañando a cada persona a encontrar calma y claridad mediante la respiración consciente, la visualización y la presencia en el aquí y ahora.
        Eres muy intuitiva y perceptiva, y adaptas tu guía según las necesidades y disposición únicas de cada persona.
        Según el momento, integras palabras de ánimo o validación de forma suave, manteniendo siempre una presencia calmada y comprensiva.
        Eres atenta y flexible, adaptándote al nivel de energía y comodidad del usuario—con dulzura, paciencia y apoyo—sin forzar nunca más allá de lo que estén listos para explorar.
        Tienes una conversación muy fluida: natural, humana y envolvente.

        Estás ofreciendo sesiones de mindfulness guiadas en un entorno tranquilo donde la persona puede enfocarse con comodidad.
        La persona puede estar buscando meditaciones guiadas, técnicas para calmarse o perspectivas sobre una vida más consciente.
        Confías en la escucha atenta y un enfoque intuitivo, ajustando cada sesión al ritmo y nivel de comodidad de la persona.

        Reconoces con delicadeza las dificultades que pueden surgir al practicar... y brindas tranquilidad, validación y apoyo para fomentar confianza.
        Te anticipas a los retos comunes en el mindfulness, ofreciendo consejos prácticos y palabras amables para mantener la constancia en la práctica.
        Tus respuestas son reflexivas, concisas y conversacionales... usualmente de tres frases o menos, salvo que se requiera mayor profundidad.
        Reflejas activamente lo que la persona ha compartido antes... para demostrar escucha atenta, crear conexión y evitar repeticiones innecesarias.
        Si percibes incomodidad o resistencia, ajustas tu enfoque con sensibilidad.
        `

        if (esSeguimiento) {
            const prompt = `Realiza un mensaje preguntando al usuario, como continua y como esta el día de hoy basandote en tu perfil`;

            const respuesta = await generarRespuestaIA(parametros, prompt, perfil, perfilDefault);

            return respuesta;
        }

        if (typeof historialRespuestas === 'string') {
            try {
                historialRespuestas = JSON.parse(historialRespuestas);
            } catch {
                historialRespuestas = [];
            }
        }

        if (!Array.isArray(historialRespuestas)) {
            historialRespuestas = [];
        }

        const historial = historialRespuestas
            .map(
                (r, i) =>
                    `${i + 1}. \nRespuesta del usuario: ${r.respuesta} \nRespuesta de GPT: ${r.pregunta}`
            )
            .join("\n\n");

        const ultimoMensaje =
            historialRespuestas.length > 0
                ? historialRespuestas[historialRespuestas.length - 1].respuesta
                : "";

        const ultimaRespuesta =
            historialRespuestas.length > 0
                ? historialRespuestas[historialRespuestas.length - 1].pregunta
                : "";

        const mencionoRespiracion = historialRespuestas
            .slice(0, 7)
            .some(
                (r) =>
                    r.respuesta.toLowerCase().includes("respirar") ||
                    r.respuesta.toLowerCase().includes("respiración")
            );

        const usuarioInfo = {
            nombre: rollbackUsuario?.nombre || "",
            edad: rollbackUsuario?.edad || "",
            profesion: rollbackUsuario?.profesion || "",
            circulosocial: rollbackUsuario?.circulosocial || "",
            ciudad: rollbackUsuario?.ciudad || "",
            familiares: rollbackUsuario?.familiares || "",
            hobbies: rollbackUsuario?.hobbies || "",
            estadogeneral: rollbackUsuario?.estadogeneral || "",
        };

        var mensajeFinalizar = "";

        if (esmensajeFinal) {
            mensajeFinalizar = "ESTE ES EL ÚLTIMO MENSAJE QUE ENVIARÁS, ASÍ QUE ASEGÚRATE DE QUE SEA CLARO Y COMPLETO SIN DEJAR PREGUNTAS ABIERTAS."
        }

        const promptUsuario = `
        Historial de la conversación hasta ahora:
        ${historial}

        IMPORTANTE: Recuerda continuar la conversación de una manera fluida y natural, Lee y analiza con atención el historial, No hagas saludos redundantes.

        Información conocida:
        del usuario se conoce esta información, asi que no le preguntes sobre lo que ya conoces:
        ${Object.entries(usuarioInfo).map(([key, value]) => `• ${key}: ${value}`).join("\n")}

        Último mensaje del usuario:"${ultimoMensaje}"

        Tu última respuesta:"${ultimaRespuesta}"

        Ahora el usuario te ha enviado un nuevo mensaje:
        "${mensajeUsuario}"

        IMPORTANTE: "${mensajeFinalizar}"

        Inicia la sesión de manera cordial y respetuosa. Luego, sí o sí, debes hacer las siguientes preguntas en el orden indicado, integrándolas de manera muy charlada y natural en la conversación:
        Recuerda 2 preguntas como máximo por respuesta.
        ${preguntas.map((p, i) => `• ${p.contenido || p}`).join("\n")} 

        Si el historial no está vacío, no repitas lo que ya se ha dicho, nunca vuelvas a mencionar lo que ya se ha conversado y evita redundancias, maneja una lógica conversacional fluida como si estuvieran conversando en persona.
        De igual forma, no saludes de nuevo si ya lo saludaste en la conversación, lo ideal es que se pueda conversar lo más humanamente posible.

        No finalices la conversación al primer intento, siempre busca mantener el diálogo abierto y fluido.
        Solo cierra la sesión con el usuario cuando él se despida primero.
        `;

        const respuesta = await generarRespuestaIA(parametros, promptUsuario, perfil, perfilDefault);

        return respuesta;

    } catch (err) {
        console.error("Error en OpenAI:", err);
        return "Dame un momento, escríbeme en algunos minutos.";
    }
}

module.exports = { responderConGPT };