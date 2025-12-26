const fs = require("fs");
const path = require("path");
const axios = require("axios");
const Sesion = require("../database/schemas/SesionSchema");
const SesionRollback = require("../database/schemas/SesionSchemaRollback");
const { responderIAService } = require("./responderIAService");
const { calcularDelayHumano } = require("../utils/helper");
const { obtenerSesionPorNumero, GenerarRollBack } = require("../controllers/SesionController");
const { generarMensajeConsentimientoAura, detectarIntencionMeditacion, generarMensajePreparacionMeditacion, evaluarConsentimientoDatos, extraerInformacionUsuario } = require("../utils/analisisChat");
const { obtenerPathAudioRandom } = require("./Consumers/Audios");
// const { extraerInformacionUsuario } = require("../utils/extractUserInfo");
// const { detectarIntencionMeditacion } = require("./NLPService");
// const { evaluarConsentimientoDatos } = require("./evaluarConsentimientoDatos");
// const { obtenerPathAudioRandom } = require("./audioService");

const mensajesPendientes = new Map();
const temporizadores = new Map();
const audiosEnProceso = new Set();

async function ProcesoFinalRespuesta(numero, sesion) {
    let infoUserSesion = await obtenerSesionPorNumero(numero);

    let informacionExtraida = await extraerInformacionUsuario(sesion.respuestas, infoUserSesion);

    if (informacionExtraida) {

      Object.assign(sesion, informacionExtraida); // asigna todos los campos de golpe
      await sesion.save();
    } else {
      console.warn("❌ La información no fue extraída correctamente.");
    }


    console.log(`✅ Respondido a ${numero} tras concatenar mensajes.`);

    await GenerarRollBack(sesion);
  }

async function processIncomingMessage(message, ServiceWhatsapp) {
    
    const numero = message.from;
    const texto = message.body;

    const Whatsapp = ServiceWhatsapp;

    console.log(`Texto recibido de ${numero}: ${texto}`);

    if (!texto) return;

    if (!mensajesPendientes.has(numero)) {
        mensajesPendientes.set(numero, []);
    }
    mensajesPendientes.get(numero).push(texto);

    if (temporizadores.has(numero)) {
        clearTimeout(temporizadores.get(numero));
    }

    const delayHumano = calcularDelayHumano(texto);

    const timeoutId = setTimeout(async () => {
        const mensajes = mensajesPendientes.get(numero);
        const mensajeConcatenado = mensajes.join(" ");

        mensajesPendientes.delete(numero);
        temporizadores.delete(numero);

        try {
            // Simulación de "escribiendo"
            await new Promise(res => setTimeout(res, 2000));

            let sesion = await Sesion.findOne({ numeroWhatsApp: numero });
            if (!sesion) sesion = new Sesion({ numeroWhatsApp: numero });

            let sesionRollback = await SesionRollback.findOne({ numeroWhatsApp: numero });
            if (!sesionRollback) sesionRollback = new SesionRollback({ numeroWhatsApp: numero });

            // ✅ Consentimiento de datos
            if (sesionRollback.aceptoTratamientoDeDatos === false && sesion.respuestas.length === 0) {
                const mensajeConsentimiento = "Antes de continuar, queremos asegurarnos de contar con tu autorización para tratar tus datos personales. Tu información será manejada con cuidado y solo para los fines que te hemos indicado. ¿Nos autorizas a continuar? Puedes responder de forma positiva o negativa, o simplemente escribir 'SI' o 'NO'.";
                await Whatsapp.sendMessage(numero, mensajeConsentimiento);

                sesion.respuestas.push({ pregunta: mensajeConsentimiento, respuesta: mensajeConcatenado });
                await sesion.save();

                await ProcesoFinalRespuesta(numero, sesion);
                return;
            }

            // ✅ Procesar aceptación de consentimiento
            if (sesionRollback.aceptoTratamientoDeDatos === false && sesion.respuestas.length > 0) {

                let mensaje;
                console.log("Mensaje para evaluar consentimiento:", mensajeConcatenado);

                const respuestaConsentimiento = await evaluarConsentimientoDatos(mensajeConcatenado);

                console.log("Respuesta consentimiento:", respuestaConsentimiento);

                if (respuestaConsentimiento == 1) {
                    sesionRollback.aceptoTratamientoDeDatos = true;
                    await sesionRollback.save();
                    mensaje = await generarMensajeConsentimientoAura('SI')
                    await Whatsapp.sendMessage(numero, mensaje);
                } else if (respuestaConsentimiento == 0) {
                    mensaje = await generarMensajeConsentimientoAura('NO');
                    await Whatsapp.sendMessage(numero, mensaje);
                    await ProcesoFinalRespuesta(numero, sesion);
                    return;
                } else {
                    await Whatsapp.sendMessage(numero, "🌿 No entendí muy bien tu respuesta. Para poder seguir con claridad y respetando nuestras políticas, agradecería que me lo compartieras de manera sencilla, con un 'sí' o un 'no'. Gracias por tu comprensión.");
                    await ProcesoFinalRespuesta(numero, sesion);
                    return;
                }
            }

            // ✅ Si pidió meditación
            if (!sesion.interesMeditacion && !sesion.audioEnviado) {

                const ultimaPregunta = sesion?.respuestas?.length > 0 ? sesion.respuestas[sesion.respuestas.length - 1]?.respuesta ?? "" : "";

                const resultadoIntencion = await detectarIntencionMeditacion(mensajeConcatenado, ultimaPregunta);
                if (resultadoIntencion === "PEDIR_MEDITACION") {
                    sesion.interesMeditacion = true;
                    await sesion.save();
                }
            }

            // ✅ Enviar audio si aplica
            if (sesion.interesMeditacion && !sesion.audioEnviado) {
                if (audiosEnProceso.has(numero)) return;

                audiosEnProceso.add(numero);
                try {
                    const mensajePreparacion = await generarMensajePreparacionMeditacion();
                    await Whatsapp.sendMessage(numero, mensajePreparacion);

                    const audioUrl = await obtenerPathAudioRandom();
                    console.log("URL del audio obtenido:", audioUrl);
                    if (!audioUrl) throw new Error("No se pudo obtener un audio válido");

                    await Whatsapp.sendAudio(numero, audioUrl);
                    await Whatsapp.sendMessage(numero, "Cuando termines, me dices cómo te sientes 🙏");

                    sesion.audioEnviado = true;
                    await sesion.save();
                } catch (err) {
                    console.error("Error al enviar meditación:", err);
                    await Whatsapp.sendMessage(numero, "Cuando termines, estaré atenta a tu respuesta. Tómate tu tiempo, estoy aquí para ti.");
                } finally {
                    audiosEnProceso.delete(numero);
                }

                await ProcesoFinalRespuesta(numero, sesion);

                return;
            }

            // ✅ GPT Respuesta
            const respuestaGPT = await responderIAService(sesion.respuestas, mensajeConcatenado, false, sesionRollback);
            await Whatsapp.sendMessage(numero, respuestaGPT);

            sesion.respuestas.push({ pregunta: respuestaGPT, respuesta: mensajeConcatenado });
            sesion.CantidadMensajes += 1;
            sesion.fechaUltimaInteraccion = new Date();
            await sesion.save();

            await ProcesoFinalRespuesta(numero, sesion);

        } catch (error) {
            console.error("Error procesando mensaje:", error);
            await Whatsapp.sendMessage(numero, "Dame un momento, por favor. Estoy aquí para ti.");
        }
    }, delayHumano);

    temporizadores.set(numero, timeoutId);
}

module.exports = { processIncomingMessage };
