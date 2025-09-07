const { GoogleGenAI } = require("@google/genai");
const Configs = require("../../config/configs");
require("dotenv").config();

const ai = new GoogleGenAI({
  apiKey: Configs.GOOGLE_API_KEY,
});

async function generar({ prompt, system, modelo, temperature, maxTokens }) {
  if (!modelo) throw new Error("Modelo no definido para Gemini");

  try {
    // Combine system and user prompts
    const fullPrompt = `${system}\n\n${prompt}`;

    const response = await ai.models.generateContent({
      model: modelo,
      contents: fullPrompt,
      config: {
        generationConfig: {
          temperature: temperature,
          maxOutputTokens: maxTokens,
        },
        thinkingConfig: {
          thinkingBudget: 0, // Ajusta según tus necesidades
        },
      },
    });

    return response.text;

  } catch (error) {
    console.error("Error en Gemini:", error);
    throw error;
  }
}

module.exports = { generar };