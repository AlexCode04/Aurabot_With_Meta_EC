const axios = require('axios');
const Configs = require("../../config/configs");

require("dotenv").config();


async function obtenerGrupos() {

  try {
    const response = await axios.get(`${Configs.FRONTEND_URL}/grupos`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Accept': 'application/json',
      },
      timeout: 10000, // 10 segundos de espera
    });

    return response.data;

  } catch (error) {
    console.log('❌ Error obteniendo los parámetros del sistema externo:', error.code || error.message);
    return [];
  }
}

module.exports = {
  obtenerGrupos
};
