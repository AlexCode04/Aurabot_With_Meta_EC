const axios = require('axios');
const Configs = require("../../config/configs");


async function obtenerParametrosIA() {

  try {
    const response = await axios.get(`${Configs.FRONTEND_URL}/ia-config`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Accept': 'application/json',
      },
      timeout: 10000, // 10 segundos de espera
    });

    response.data.Empresa = response.data.Empresa?.toLowerCase() || 'google'; //

    return response.data;

  } catch (error) {
    console.log('❌ Error obteniendo los parámetros del sistema externo:', error.code || error.message);
    return {
      modelo: 'gpt-3.5-turbo',
      temperatura: 0.3,
      maxTokens: 200,
    };
  }
}

module.exports = {
  obtenerParametrosIA
};
