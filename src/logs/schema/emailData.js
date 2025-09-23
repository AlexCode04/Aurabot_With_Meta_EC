const Configs = require('../../config/configs');

function createSendEmailAuraDto() {
    return {
        to: Configs.EMAIL_TO ? Configs.EMAIL_TO : "",
        cc: Configs.EMAIL_CC ? Configs.EMAIL_CC : [],
        bcc: Configs.EMAIL_BCC ? Configs.EMAIL_BCC : [],
        subject: "",
        template: "",
        context: {
            appName: Configs.EMAIL_APP_NAME || "Aurabot",
            subject: "",
            message: "",
            date: "",
            companyName: Configs.EMAIL_COMPANY_NAME || "FundHAF",
            companyUrl: Configs.EMAIL_COMPANY_URL || "http://54.39.7.181/",
            companySite: Configs.EMAIL_COMPANY_SITE || "https://mindfulness.fundhaf.org/",
            supportEmail: Configs.EMAIL_SUPPORT || "contacto@fundhaf.com",
            logoUrl: ""
        }
    };
}


module.exports = { createSendEmailAuraDto };