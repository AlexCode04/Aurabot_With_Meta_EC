const axios = require('axios');
const Configs = require('../../config/configs'); // importa donde definiste la clase Configs
const Logger = require('./Logger');

async function sendEmail(payload) {

    try {
        const response = await axios.post(Configs.EMAIL_API_URL, payload, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${payload.token}`
            }
        });

        if (response.data?.status !== 'sent') {
            console.log(`Error enviando email: ${response.data?.message || response.statusText}`);
        }

        return response.data;
    } catch (error) {
        console.error('Error enviando email:', error.response?.data || error.message);
        return { success: false, error: error.message };
    }
}


module.exports = { sendEmail };
