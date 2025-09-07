const { OpenAI } = require('openai');
const { nombresComunes } = require('./nombresComunes');
const Configs = require("../../config/configs");


class ExtractionAgent {
    constructor() {
        this.openai = new OpenAI({ apiKey: Configs.OPENAI_API_KEY });

        this.commands = {
            OBTENER_NOMBRE: {
                prompt: `Eres un extractor de nombres. Tu trabajo es encontrar SOLO el nombre de la persona en el mensaje del usuario.
                        REGLAS ESTRICTAS:
                        - Si encuentras un nombre, responde ÚNICAMENTE con el nombre (sin apellidos si no están claros)
                        - Si no hay nombre claro, responde "NO_ENCONTRADO"
                        - No incluyas saludos, confirmaciones o texto adicional
                        - No válidos: "si", "ok", "bien", "hola", "gracias"
                        - Ignora completamente las palabras de cortesía
                        - El nombre puede estar al inicio, medio o final del mensaje
                        - Busca frases como "me llamo", "soy", "mi nombre es", "me dicen", "me llaman"
                        - No asumas nombres comunes, busca patrones claros
                        - Si el nombre es ambiguo o corto (menos de 2 letras), responde "NO_ENCONTRADO"
                        - No uses nombres de lugares, objetos o conceptos
                        + Si el mensaje contiene solo una o dos palabras, y una de ellas parece un nombre, responde con el nombre.
                        - Si el nombre es parte de una frase más larga, extrae solo el nombre
                        - El nombre puede venir en un mensaje compuestos por muchos mensajes unidos, por lo que debes buscar en el contexto general del mensaje a detalle.
                        
                        Ejemplos:
                        - "Valentina" → "Valentina"
                        - "Ok, me llamo Felipe muchas gracias" → "Felipe"
                        - "Si, me llamo Esteban, gracias por pregunta" → "Esteban"
                        - "Mi nombre es Ana María" → "Ana María"
                        - "Hola, me llamo Ramiro estoy muy mal" → "Ramiro"
                        - "Soy Carlos" → "Carlos"
                        - "Me dicen Juanito" → "Juanito"
                        - "ok bien" → "NO_ENCONTRADO"
                        - "si" → "NO_ENCONTRADO"
                        - "Hola, buenos días" → "NO_ENCONTRADO"
                        - "Juan" → "Juan"
                        - "María José" → "María José"
                        - "Pedro, gracias" → "Pedro"
                        - "ok" → "NO_ENCONTRADO"
                        - "yes" → "NO_ENCONTRADO"
                        
                        Mensaje del usuario: `,
                validate: (value) => {
                    if (!value || value === 'NO_ENCONTRADO') return false;
                    const forbiddenWords = ['ok', 'si', 'no', 'gracias', 'hola', 'bien', 'muchas', 'por', 'favor'];
                    const palabras = value.toLowerCase().split(/\s+/);
                    const contieneProhibidas = palabras.some(p => forbiddenWords.includes(p));
                    return !contieneProhibidas && /^[a-zA-ZáéíóúüñÁÉÍÓÚÜÑ\s]{2,}$/.test(value);
                },
                fallback: this.extractNameWithRegex
            },
            OBTENER_EMOCION: {
                prompt: `Eres un extractor de emociones. Tu trabajo es identificar la emoción principal en el mensaje del usuario.
                        REGLAS:
                        - Identifica la emoción predominante
                        - Responde con UNA palabra: triste, ansioso, enojado, feliz, confundido, estresado, calmado, etc.
                        - Si no hay emoción clara, responde "NO_ENCONTRADO"
                        
                        Ejemplos:
                        - "Me siento muy triste hoy" → "triste"
                        - "Estoy super ansioso por el trabajo" → "ansioso"
                        - "Todo está bien, gracias" → "calmado"
                        - "No sé qué hacer" → "confundido"
                        
                        Mensaje del usuario: `,
                validate: (v) => ['triste', 'ansioso', 'enojado', 'feliz', 'confundido', 'estresado', 'calmado', 'preocupado', 'solo', 'abrumado'].includes(v.toLowerCase())
            },
            OBTENER_SITUACION: {
                prompt: `Eres un extractor de situaciones. Tu trabajo es identificar la situación o problema principal que menciona el usuario.
                    REGLAS:
                    - Extrae la situación principal en máximo 10 palabras
                    - Enfócate en el problema o contexto central
                    - Si no hay situación clara, responde "NO_ENCONTRADO"
                    
                    Ejemplos:
                    - "Tengo problemas en el trabajo con mi jefe" → "problemas laborales con jefe"
                    - "Mi relación está pasando por un mal momento" → "problemas de pareja"
                    - "Estoy estresado por los exámenes" → "estrés por exámenes"
                    
                    Mensaje del usuario: `,
                validate: (v) => v && v.length > 5 && v.length < 50
            },
            OBTENER_INTERES_MEDITACION: {
                prompt: `Eres un extractor de intención. Tu tarea es decir si el usuario desea realizar una meditación guiada, con base en el mensaje actual Y el mensaje anterior enviado por Aura.
                        REGLAS:
                        - Si el usuario claramente acepta una meditación guiada o profunda → responde "SI"
                        - Si lo rechaza → responde "NO"
                        - Si no queda claro → responde "NO_ENCONTRADO"

                        Ejemplos:
                        - Aura: ¿Te gustaría una meditación guiada?  
                        Usuario: Sí → "SI"

                        - Aura: ¿Quieres hacer una práctica de meditación profunda?  
                        Usuario: Claro que sí → "SI"

                        - Aura: ¿Quieres una meditación ahora?  
                        Usuario: No, gracias → "NO"

                        - Aura: ¿Te gustaría algo más?  
                        Usuario: No estoy seguro → "NO_ENCONTRADO"

                        `,
                validate: (v) => ['SI', 'NO'].includes(v.trim().toUpperCase())
            }
        };
    }

    async extractInformation(command, userMessage) {
        const config = this.commands[command];
        if (!config) throw new Error(`Comando desconocido: ${command}`);

        const fullPrompt = config.prompt + userMessage;

        try {
            const result = await this.callGPT(fullPrompt);
            const clean = result.trim();

            if (config.validate(clean)) {
                return { success: true, extracted: clean };
            } else if (command === "OBTENER_NOMBRE" && this.looksLikeName(clean)) {
                // Acepta el nombre aunque no pase el validador, si parece un nombre real
                return { success: true, extracted: clean };
            }

            if (config.fallback) {
                const fallback = config.fallback(userMessage);
                if (fallback) return { success: true, extracted: fallback };
            }

            return { success: false, extracted: null };
        } catch (err) {
            console.error("❌ Error GPT:", err);

            if (config.fallback) {
                const fallback = config.fallback(userMessage);
                if (fallback) return { success: true, extracted: fallback };
            }

            return { success: false, extracted: null, error: err.message };
        }
    }


    looksLikeName(value) {
        if (!value || value === 'NO_ENCONTRADO') return false;

        const forbiddenWords = ['ok', 'si', 'no', 'gracias', 'hola', 'bien', 'muchas', 'por', 'favor', 'yes'];
        const palabras = value.toLowerCase().split(/\s+/);
        const contieneProhibidas = palabras.some(p => forbiddenWords.includes(p));
        if (contieneProhibidas) return false;

        // Validación de forma: solo letras y espacios, mínimo 2 caracteres
        if (!/^[a-zA-ZáéíóúüñÁÉÍÓÚÜÑ\s]{2,}$/.test(value)) return false;

        // Validación contra diccionario
        const nombresValidos = value.toLowerCase().split(/\s+/).filter(nombre => nombresComunes.has(nombre));
        return nombresValidos.length > 0;
    }

    async callGPT(prompt) {
        const completion = await this.openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            max_tokens: 50,
            temperature: 0.3,
            messages: [
                { role: 'system', content: 'Eres un extractor de información preciso. Sigue las instrucciones exactamente y responde solo con la información solicitada.' },
                { role: 'user', content: prompt }
            ]
        });
        return completion.choices[0].message.content;
    }

    extractNameWithRegex(message) {
        const patterns = [
            /(?:me llamo|soy|mi nombre es)\s+([A-Za-zÁÉÍÓÚáéíóúñÑ\s]+?)(?:[,.]|$)/i,
            /(?:me dicen|llaman)\s+([A-Za-zÁÉÍÓÚáéíóúñÑ\s]+?)(?:[,.]|$)/i
        ];

        for (const pattern of patterns) {
            const match = message.match(pattern);
            if (match) {
                let name = match[1].trim().replace(/(muchas gracias|gracias|por preguntar)?$/i, '').trim();
                if (name.length > 1) return name;
            }
        }
        return null;
    }

    async extractFromAllMessages(command, allMessages) {
        for (let i = allMessages.length - 1; i >= 0; i--) {
            const result = await this.extractInformation(command, allMessages[i]);
            if (result.success) return result;
        }
        return { success: false, extracted: null };
    }

    async extractMultipleCommands(commands, userMessage) {
        const results = {};
        for (const command of commands) {
            results[command] = await this.extractInformation(command, userMessage);
        }
        return results;
    }

    async getMissingInformation(sesion) {
        const missing = {};
        const mensajes = sesion.respuestas.map(r => r.respuesta);

        if (!sesion.nombre) {
            const res = await this.extractFromAllMessages('OBTENER_NOMBRE', mensajes);
            if (res.success) missing.nombre = res.extracted;
        }

        if (!sesion.emocionPrincipal) {
            const res = await this.extractFromAllMessages('OBTENER_EMOCION', mensajes);
            if (res.success) missing.emocionPrincipal = res.extracted;
        }

        if (!sesion.situacionPrincipal) {
            const res = await this.extractFromAllMessages('OBTENER_SITUACION', mensajes);
            if (res.success) missing.situacionPrincipal = res.extracted;
        }

        return missing;
    }
}

module.exports = ExtractionAgent;
