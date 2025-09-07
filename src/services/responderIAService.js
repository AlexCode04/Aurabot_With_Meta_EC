const { responderConGPT } = require('./IAProcessService')
const { obtenerParametrosIA } = require('./Consumers/iaConfig')
const { obtenerPreguntas } = require('./Consumers/preguntas')
const { obtenerPerfil } = require('./Consumers/perfil')


async function responderIAService(historialRespuestas, mensajeUsuario, esmensajeFinal = false, rollbackUsuario, esSeguimiento = false) {
    try {
        const parametros = await obtenerParametrosIA();
        const preguntas = await obtenerPreguntas();
        const perfil = await obtenerPerfil();

        return await responderConGPT(historialRespuestas, parametros, preguntas, perfil, mensajeUsuario, esmensajeFinal, rollbackUsuario, esSeguimiento);
    } catch (err) {
        console.error("Error en wrapper legacy:", err);
        return "Dame un momento, escríbeme en algunos minutos.";
    }
}

module.exports = { responderIAService };