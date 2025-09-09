const axios = require("axios");
const Configs = require("../../config/configs");

async function obtenerPathAudioRandom() {
  try {
    // 1️⃣ Obtener la lista de audios del frontend
    const response = await axios.get(`${Configs.FRONTEND_URL}/audios`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        Accept: "application/json",
      },
      timeout: 10000, // 10 segundos
    });

    const audios = response.data; // ✅ Aquí ya tenemos el array de audios

    if (!audios || audios.length === 0) {
      throw new Error("No hay audios disponibles");
    }

    let selectedAudio;
    if (audios.length === 1) {
      selectedAudio = audios[0];
    } else {
      const randomIndex = Math.floor(Math.random() * audios.length);
      selectedAudio = audios[randomIndex];
    }

    const filename = selectedAudio.path.split('/').pop();
    const pathSelectedAudio = `${Configs.FRONTEND_URL_SERVER}/${filename}`;

    return pathSelectedAudio;
  } catch (error) {
    console.error(
      "❌ Error obteniendo los audios del sistema externo:",
      error.code || error.message
    );
    return null;
  }
}

module.exports = {
  obtenerPathAudioRandom,
};