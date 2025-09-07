const Sesion = require('../database/schemas/SesionSchema');
const SesionRollback = require('../database/schemas/SesionSchemaRollback');
const { generarObservacionFinal } = require('../utils/analisisChat');

// Obtener datos de una sesión por numero de WhatsApp
async function obtenerSesionPorNumero(numeroWhatsApp) {
    try {
        const sesion = await SesionRollback.findOne({ numeroWhatsApp });
        if (!sesion) {
            return { error: 'Sesión no encontrada' };
        }

        let res = sesion.respuestas.map(obj => ({
            nombre: obj.nombre,
            edad: obj.edad,
            profesion: obj.profesion,
            circuloSocial: obj.circuloSocial,
            ciudad: obj.ciudad,
            familiares: obj.familiares,
            hobbies: obj.hobbies,
            estadogeneral: obj.estadogeneral
        }));

        return res;
    } catch (err) {
        console.error('Error al obtener sesión:', err);
        return { error: 'Error al obtener la sesión' };
    }
}

async function ReiniciarSesionPorHora(tiempoHoras) {
    try {
        const ahora = new Date();
        const limite = new Date(ahora.getTime() - tiempoHoras * 60 * 60 * 1000);

        // Buscar sesiones con última interacción anterior al límite
        const sesiones = await Sesion.find({
            fechaUltimaInteraccion: { $lt: limite }
        });

        if (!sesiones || sesiones.length === 0) {
            return { mensaje: 'No hay sesiones para reiniciar' };
        }

        for (const sesion of sesiones) {
            try {


                await GenerarRollBack(sesion, true);

                sesion.fechaCierreTemporal = new Date().getDate();
                sesion.CantidadMensajes = 0;
                sesion.audioEnviado = false;
                sesion.esperandoRespuestaMeditacion = false;
                sesion.fechaUltimaInteraccion = new Date();
                sesion.interesMeditacion = false;
                sesion.emocionPrincipal = null;
                sesion.respuestas = [];

                await sesion.save();


                console.log(`Sesión de ${sesion.numeroWhatsApp} reiniciada correctamente y rollback guardado.`);
            } catch (error) {
                console.error("Error al reiniciar una sesión:", error);
            }
        }

        return {
            mensaje: `Se reiniciaron ${sesiones.length} sesión(es) inactiva(s) por más de ${tiempoHoras} hora(s).`
        };
    } catch (err) {
        console.error('Error general al reiniciar sesiones:', err);
        return { error: 'Error al reiniciar las sesiones' };
    }
}

async function GenerarRollBack(sesion, cierreSesion = false) {
    try {

        const existeSesion = await SesionRollback.findOne({ numeroWhatsApp: sesion.numeroWhatsApp });

        const { observacion, necesitaApoyoProfesional } = await generarObservacionFinal(sesion.respuestas);

        if (existeSesion) {

            existeSesion.nombre = sesion.nombre;
            existeSesion.edad = sesion.edad;
            existeSesion.profesion = sesion.profesion;
            existeSesion.circuloSocial = sesion.circuloSocial;
            existeSesion.ciudad = sesion.ciudad;
            existeSesion.familiares = sesion.familiares;
            existeSesion.hobbies = sesion.hobbies;
            existeSesion.estadogeneral = sesion.estadogeneral;
            existeSesion.respuestas = [
                ...existeSesion.respuestas,
                ...sesion.respuestas
            ];
            existeSesion.CantidadMensajes = sesion.CantidadMensajes;
            existeSesion.audioEnviado = sesion.audioEnviado;
            existeSesion.esperandoRespuestaMeditacion = sesion.esperandoRespuestaMeditacion;
            existeSesion.invitadoComunidad = sesion.invitadoComunidad;
            existeSesion.fechaCierreTemporal = sesion.fechaCierreTemporal;
            existeSesion.fechaUltimaInteraccion = sesion.fechaUltimaInteraccion;
            existeSesion.interesMeditacion = sesion.interesMeditacion;
            existeSesion.emocionPrincipal = sesion.emocionPrincipal;
            existeSesion.situacionPrincipal = sesion.situacionPrincipal;
            if (cierreSesion) {
                existeSesion.necesitaApoyoProfesional = necesitaApoyoProfesional;
                existeSesion.observacionFinal = observacion;
            }

            await existeSesion.save();

            return;
        }

        const sesionRollback = new SesionRollback({
            numeroWhatsApp: sesion.numeroWhatsApp,
            nombre: sesion.nombre,
            edad: sesion.edad,
            profesion: sesion.profesion,
            circuloSocial: sesion.circuloSocial,
            ciudad: sesion.ciudad,
            familiares: sesion.familiares,
            hobbies: sesion.hobbies,
            estadogeneral: sesion.estadogeneral,
            respuestas: sesion.respuestas,
            CantidadMensajes: sesion.CantidadMensajes,
            audioEnviado: sesion.audioEnviado,
            esperandoRespuestaMeditacion: sesion.esperandoRespuestaMeditacion,
            invitadoComunidad: sesion.invitadoComunidad,
            fechaCierreTemporal: sesion.fechaCierreTemporal,
            fechaUltimaInteraccion: sesion.fechaUltimaInteraccion,
            interesMeditacion: sesion.interesMeditacion,
            emocionPrincipal: sesion.emocionPrincipal,
            situacionPrincipal: sesion.situacionPrincipal,
            necesitaApoyoProfesional: cierreSesion ? necesitaApoyoProfesional : false,
            observacionFinal: cierreSesion ? observacion : null,
        });

        await sesionRollback.save();

        console.log(`Rollback de sesión ${sesion.numeroWhatsApp} generado correctamente.`);
    } catch (error) {
        console.error("Error al generar rollback de sesión:", error);
    }
}

module.exports = {
    obtenerSesionPorNumero,
    ReiniciarSesionPorHora,
    GenerarRollBack
};