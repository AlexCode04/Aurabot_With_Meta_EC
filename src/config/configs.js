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
        this.FRONTEND_URL_SERVER = process.env.FRONTEND_URL_SERVER || 'http://frontend:3000/api';
        this.EMAIL_API_URL = process.env.EMAIL_API_URL || 'http://email_service:3000/send';
        this.EMAIL_TO = process.env.EMAIL_TO || '';
        this.EMAIL_CC = process.env.EMAIL_CC
            ? process.env.EMAIL_CC.split(',').map(c => c.trim())
            : [];
        this.EMAIL_BCC = process.env.EMAIL_BCC
            ? process.env.EMAIL_BCC.split(',').map(c => c.trim())
            : [];
        this.EMAIL_COMPANY_URL = process.env.EMAIL_COMPANY_URL || 'http://54.39.7.181/';
        this.EMAIL_COMPANY_NAME = process.env.EMAIL_COMPANY_NAME || 'Aura Bot - FundHAF';
        this.EMAIL_COMPANY_SITE = process.env.EMAIL_COMPANY_SITE || 'https://mindfulness.fundhaf.org/';
        this.EMAIL_SUPPORT = process.env.EMAIL_SUPPORT || 'contacto@fundhaf.com';
        this.EMAIL_APP_NAME = process.env.EMAIL_APP_NAME || 'Aura Bot - FundHAF';
        this.JWT_SECRET = process.env.JWT_SECRET || 'MI_SECRETO';
        this.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';
        this.USER = process.env.USER || 'aura_bot';
        this.ROLE = process.env.ROLE || 'service';
        this.EMAIL_MINUTES_BETWEEN = parseInt(process.env.EMAIL_MINUTES_BETWEEN) || 10;
    }

}

module.exports = new Configs();