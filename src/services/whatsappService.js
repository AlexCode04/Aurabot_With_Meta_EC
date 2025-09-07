const axios = require("axios");
const Configs = require('../config/configs');

class WhatsAppService {
    constructor() {
        
    }

    async sendMessage(to, text) {
        await axios.post(
            `https://graph.facebook.com/v22.0/${Configs.PHONE_NUMBER_ID}/messages`,
            {
                messaging_product: "whatsapp",
                to,
                text: { body: text }
            },
            {
                headers: {
                    Authorization: `Bearer ${Configs.TOKEN}`,
                    "Content-Type": "application/json"
                }
            }
        );
    }

    async sendAudio(to, audioUrl) {
        await axios.post(
            `https://graph.facebook.com/v22.0/${Configs.PHONE_NUMBER_ID}/messages`,
            {
                messaging_product: "whatsapp",
                to,
                type: "audio",
                audio: { link: audioUrl }
            },
            {
                headers: {
                    Authorization: `Bearer ${Configs.TOKEN}`,
                    "Content-Type": "application/json"
                }
            }
        );
    }
}


module.exports = new WhatsAppService();