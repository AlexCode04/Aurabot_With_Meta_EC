const dotenv = require('dotenv')
const path = require('path');

class Configs {
    constructor() {
        dotenv.config({ path: path.resolve(__dirname, '../../.env') });
        this.PORT = process.env.PORT || 3000;
        this.TOKEN = process.env.WHATSAPP_API_TOKEN;
        this.PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
        this.VERIFY_TOKEN = process.env.VERIFY_TOKEN;
        this.MONGO_URI = process.env.MONGO_URI;
        this.GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
        this.OPENAI_API_KEY = process.env.OPENAI_API_KEY;
        this.FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
    }

}

module.exports = new Configs();