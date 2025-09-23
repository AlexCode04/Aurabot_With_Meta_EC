const Log = require("../../database/schemas/LogSchema");
const Configs = require('../../config/configs');

async function VerifyTimeBeforeSendEmail() {
    // Ejemplo: buscar último log de tipo "EMAIL_SENT"
    const lastLog = await Log.findOne({ level: "EMAIL_SENT" })
        .sort({ timestamp: -1 })
        .exec();

    if (!lastLog) return true; // nunca se envió correo, se puede enviar

    const diffMinutes = (Date.now() - lastLog.timestamp.getTime()) / 1000 / 60;

    // permitir si pasaron al menos EMAIL_MINUTES_BETWEEN minutos
    return diffMinutes >= Configs.EMAIL_MINUTES_BETWEEN;
}

module.exports = { VerifyTimeBeforeSendEmail };
