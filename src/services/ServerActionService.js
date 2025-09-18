const { sendTextMessage } = require("./WhatsAppServiceWithMeta");
const Sesion = require("../database/schemas/SesionSchema");
const SesionRollback = require("../database/schemas/SesionSchemaRollback");
const { responderIAService } = require("./responderIAService")
const { ReiniciarSesionPorHora } = require('../controllers/SesionController')
const { obtenerGrupos } = require("./Consumers/Grupos");


async function notificarUsuariosInactivos(tiempo1, bandera_n_notificaciones, cliente) {
    try {
        console.log("Iniciando notificación de usuarios inactivos...");

        const limite = new Date(tiempo1);

        const sesionesInactivasNotificacion = await SesionRollback.find({
            fechaUltimaNotificacion: { $lt: limite }
        });

        const sesionesInactivas = await SesionRollback.find({
            fechaUltimaInteraccion: { $lt: limite }
        });

        const esSeguimiento = true;

        if (bandera_n_notificaciones) {
            for (const sesion of sesionesInactivasNotificacion) {
                try {
                    await cliente.sendMessage(
                        sesion.numeroWhatsApp,
                        `¡Hola! Ha sido un placer tenerte en la sesión anterior,🌿 Espero que la experiencia haya sido significativa para ti y que el mensaje haya resonado en tu conciencia y tu corazón. 💫
                        Me gustaría saber cómo te sientes, si tienes alguna pregunta, o solo quisieras que conversemos.
                        Sino, no importa estaré aquí para ti, cuando me necesites.! 🤗`
                        );  
                    sesion.fechaUltimaNotificacion = new Date();
                    await sesion.save();
                } catch (err) {
                    console.error(`Error notificando a ${sesion.numeroWhatsApp}:`, err);
                }
            }
            return;
        }

        if(sesionesInactivas.length === 0) {
            return;
        }

        for (const sesion of sesionesInactivas) {
            try {
                const respuesta = await responderIAService(esSeguimiento);
                await cliente.sendMessage(sesion.numeroWhatsApp, respuesta);
                sesion.fechaUltimaInteraccion = new Date();
                sesion.fechaUltimaNotificacion = new Date();
                await sesion.save();
            } catch (err) {
                console.error(`Error notificando a ${sesion.numeroWhatsApp}:`, err);
            }
        }
    } catch (err) {
        console.error("Error en notificación de usuarios inactivos:", err);
    }
}

async function notificarComunidad(tiempo, cliente) {
    try {
        console.log("Iniciando notificación de la comunidad...");
        const limite = new Date(tiempo);

        const grupos = await obtenerGrupos();
        const groupLink = grupos.length > 0
            ? grupos[Math.floor(Math.random() * grupos.length)].url
            : 'https://chat.whatsapp.com/J2g5DEXt3tm1FMHWndHSKt';

        const sesionesInactivas = await SesionRollback.find({
            fechaUltimaInteraccion: { $lt: limite },
            invitadoComunidad: false
        }).select('numeroWhatsApp');

        console.log(`Usuarios inactivos encontrados: ${sesionesInactivas.length}`);

        if(sesionesInactivas.length === 0) {
            return;
        }

        for (const sesion of sesionesInactivas) {
            try {
                const numero = sesion.numeroWhatsApp;
                await cliente.sendMessage(
                    numero,
                    `✨🌿 Únete a nuestra Comunidad de Mindfulness en WhatsApp 🌿
✨ Un espacio donde recibirás meditaciones, consejos prácticos y recordatorios para vivir con más calma y claridad cada día, donde trascenderás tus niveles de conciencia. 
👉 Haz parte de este grupo y comienza a transformar tu bienestar desde hoy. 

                    ${groupLink}`
                );
                sesion.invitadoComunidad = true;
                sesion.fechaUltimaInteraccion = new Date();

                const sesionback = await Sesion.findOne({ numeroWhatsApp: numero });
                if (sesionback) {
                    sesionback.invitadoComunidad = true;
                    await sesionback.save();
                }

                await sesion.save();
            } catch (err) {
                console.error(`Error notificando a ${sesion.numeroWhatsApp}:`, err);
            }
        }
    } catch (err) {
        console.error("Error en notificación de la comunidad:", err);
    }
}

async function serverFunctionsActive(cliente) {
    const ahora = new Date();
    const tiempo_notifiacion = ahora.getTime() - 2 * 24 * 60 * 60 * 1000;
    const tiempo_notifiacion_comunidad = ahora.getTime() - 60 * 60 * 1000; // 1 hora
    const tiempo_notificacion_2 = ahora.getTime() - 3 * 24 * 60 * 60 * 1000;

    if(!cliente || cliente == null) {
        console.error("Cliente no está definido. No se pueden ejecutar las funciones del servidor.");
        return;
    }

    await notificarUsuariosInactivos(tiempo_notifiacion, false, cliente);
    await notificarUsuariosInactivos(tiempo_notificacion_2, true, cliente);
    await ReiniciarSesionPorHora(24);
    await notificarComunidad(tiempo_notifiacion_comunidad, cliente);
}

module.exports = { serverFunctionsActive };


