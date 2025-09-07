const geminiClient = require('./Clients/googleGeminiClient'); // asume que tienes un cliente Gemini creado
const { OpenAI } = require("openai");
const Configs = require("../config/configs");

const openai = new OpenAI({
    apiKey: Configs.OPENAI_API_KEY,
});

// Función para elegir proveedor IA según parámetros
async function generarRespuestaIA(parametros, promptUsuario, perfil, perfilDefault) {
    const empresa = parametros.empresa?.toLowerCase();

    if (empresa === 'google') {
        // GEMINI LOGIC

        const systemPrompt = perfil.descripcion || perfilDefault;

        const respuesta = await obtenerRespuestaGeminiConReintentos({
            promptUsuario,
            systemPrompt,
            parametros,
            maxIntentos: 5
        });

        return respuesta;

    } else if (empresa === 'openai') {

        const completion = await openai.chat.completions.create({
            model: parametros.modelo || "gpt-4o",
            max_tokens: parametros.maxTokens || 1200,
            temperature: parametros.temperature || 0.7,
            messages: [
                { role: "system", content: perfil.descripcion || perfilDefault },
                { role: "user", content: promptUsuario },
            ],
        });

        return completion.choices[0].message.content.trimStart();

    } else {
        throw new Error(`Empresa de IA no soportada: ${parametros.Empresa}`);
    }
}

async function obtenerRespuestaGeminiConReintentos({ promptUsuario, systemPrompt, parametros, maxIntentos = 3 }) {
    let intento = 0;
    let respuestaFinal = null;

    while (intento < maxIntentos) {
        try {

            const respuesta = await geminiClient.generar({
                prompt: promptUsuario,
                system: systemPrompt,
                modelo: parametros.modelo,
                temperature: parametros.temperature || 0.7,
                maxTokens: parametros.maxTokens || 1200,
            });

            if (typeof respuesta === "string") {
                respuestaFinal = respuesta.trimStart();
                return respuestaFinal;
            } else {
                console.warn("La respuesta no es una cadena válida:", respuesta);
            }
        } catch (error) {
            console.error(`Error en intento ${intento + 1} con Gemini:`, error.message);
        }

        intento++;
    }

    intento = 0;

    while (intento < maxIntentos) {
        try {
            const respuesta = await generarConGPTDefault({ promptUsuario, systemPrompt });

            if (respuesta && respuesta.choices && respuesta.choices.length > 0) {
                return respuesta.choices[0].message.content.trimStart();
            }
        } catch (error) {
            console.error(`Error en intento ${intento + 1} con GPT-4o:`, error.message);
        }

        intento++;
    }

    // Si llegamos aquí es porque todos los intentos fallaron
    console.warn("Todos los intentos fallaron. Se enviará un mensaje genérico.");
    return "Disculpame, no entiendo tu mensaje, ¿puedes volverme a explicar?";
}

function generarConGPTDefault({ promptUsuario, systemPrompt }) {
    return openai.chat.completions.create({
        model: "gpt-4o",
        max_tokens: 9600,
        temperature: 0.7,
        messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: promptUsuario },
        ],
    });
}

module.exports = { generarRespuestaIA };
