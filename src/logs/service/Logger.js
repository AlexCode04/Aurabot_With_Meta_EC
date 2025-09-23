const Log = require('../../database/schemas/LogSchema');
const { sendEmail } = require('./ConsumerEmailApi');
const { createSendEmailAuraDto } = require('../schema/emailData');
const Configs = require('../../config/configs');
const {generateJWTToken} = require('../../utils/JsonWebTokens');
const { user } = require('@elevenlabs/elevenlabs-js/api');

class Logger {
    constructor() { }

    async Log(message, level = 'info', functionName = '') {

        try {
            level = level.toUpperCase();

            console.log(`[${level}]|[${new Date().toISOString()}] ${functionName ? `[${functionName}] ` : ''}${message}`);

            const logEntry = new Log({
                level: level,
                message: message,
                functionName: functionName,
            });
            await logEntry.save();
        } catch (error) {
            console.error("Error logging message:", error);
        }

    }

    async sendNotification(email) {

        const token = generateJWTToken(
            { user: Configs.USER, role: Configs.ROLE },
            Configs.JWT_SECRET,
            Configs.JWT_EXPIRES_IN
        );


        const emailPayload = createSendEmailAuraDto();

        // Rellenar los detalles del email
        emailPayload.subject = email.subject || "Notificación de Aura Bot";
        emailPayload.template = email.template || "Information";

        // Rellenar el contexto del email
        emailPayload.context.subject = email.subject || "Notificación de Aura Bot";
        emailPayload.context.message = email.message || "Este es un mensaje de notificación de Aura Bot.";
        emailPayload.context.date = new Date().toLocaleDateString();

        emailPayload.token = token;

        // Enviar correo
        const result = await sendEmail(emailPayload);

        // Registrar log solo si se envió sin error
        if (result.status === 'sent') {
            this.Log(`Email enviado a ${emailPayload.to || "destinatario"}`, "EMAIL_SENT", "sendNotification");
        } else {
            this.Log(`Error al enviar email a ${emailPayload.to || "destinatario"}`, "EMAIL_ERROR", "sendNotification");
        }

        return result;
    }
}

module.exports = new Logger();