const axios = require("axios");
const Configs = require('../config/configs');
const { MessageMedia } = require('whatsapp-web.js');

class WhatsAppServiceWeb {
    constructor(Client) {
        this.client = Client;
    }

    async sendMessage(to, text) {
        await this.client.sendMessage(to, text);
    }

    async sendAudio(to, audioUrl) {
        const response = await axios.get(audioUrl, { responseType: 'arraybuffer' });
        const audioBase64 = Buffer.from(response.data).toString('base64');
        const media = new MessageMedia('audio/mp3', audioBase64, 'meditacion.mp3');
        await this.client.sendMessage(to, media, { sendAudioAsVoice: true });
    }
}


module.exports = WhatsAppServiceWeb;