const axios = require('axios');
const Configs = require("../../config/configs");


async function obtenerPerfil() {

  try {
    const response = await axios.get(`${Configs.FRONTEND_URL}/perfil/perfil-activo`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Accept': 'application/json',
      },
      timeout: 10000,
    });
    return response.data;

  } catch (error) {
    console.error('❌ Error obteniendo perfil:', error.code || error.message);
  }
}

module.exports = { obtenerPerfil };
