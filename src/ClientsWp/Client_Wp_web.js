// bot/whatsappBot.js - Adaptación de tu código actual
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fs = require("fs");
const path = require("path");

let client = null;
let sessionStatus = 'DISCONNECTED';
let currentQR = null;

function initializeClient() {
    if (client) return client;

    client = new Client({
        authStrategy: new LocalAuth(),
        puppeteer: { headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] }
    });

    client.on('qr', qr => {
        currentQR = qr;
        sessionStatus = 'QR_REQUIRED';
    });

    client.on('ready', () => {
        console.log('WhatsApp listo');
        sessionStatus = 'CONNECTED';
        currentQR = null;

        // Configurar listeners cuando esté listo
        if (global.setupWhatsAppListeners) {
            global.setupWhatsAppListeners();
        }
    });

    client.on('disconnected', () => {
        console.log('WhatsApp desconectado');
        sessionStatus = 'DISCONNECTED';
        currentQR = null;
    });

    return client;
}

async function startBot() {
    if (!client) {
        initializeClient();
    }

    if (sessionStatus === 'CONNECTED') {
        return { success: true, status: 'ALREADY_CONNECTED' };
    }

    await client.initialize();
    return { success: true, status: 'INITIALIZING' };
}

async function forceLogin() {
    if (sessionStatus === 'CONNECTED') {
        return null;
    }

    if (!client) {
        await startBot();
    }

    // Esperar a que se genere el QR
    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
            reject(new Error('Timeout esperando QR'));
        }, 30000);

        const checkQR = () => {
            if (currentQR) {
                clearTimeout(timeout);
                resolve(currentQR);
            } else if (sessionStatus === 'CONNECTED') {
                clearTimeout(timeout);
                resolve(null);
            } else {
                setTimeout(checkQR, 1000);
            }
        };

        checkQR();
    });
}

function getSessionStatus() {
    return sessionStatus;
}

function getCurrentQR() {
    return currentQR;
}

function getCurrentClient() {
    console.log('Obteniendo cliente actual:', sessionStatus);
    return client;
}

async function killBot() {
    if (client) {
        try {
            // cerrar cliente y navegador puppeteer
            await client.destroy();

            if (client.pupBrowser) {
                await client.pupBrowser.close(); // cierra chromium
            }
        } catch (err) {
            console.error("Error al destruir cliente:", err);
        }
        client = null;
    }


    const sessionPath = path.join(__dirname, "../../.wwebjs_auth");
    if (fs.existsSync(sessionPath)) {
        fs.rmSync(sessionPath, { recursive: true, force: true });
    }

    sessionStatus = "DISCONNECTED";
    currentQR = null;

    return { success: true, status: "DISCONNECTED" };
}


// Función para obtener grupos (equivalente a tu obtenerGrupos)
async function obtenerGrupos() {
    if (sessionStatus !== 'CONNECTED') {
        throw new Error('Bot no está conectado');
    }

    const chats = await client.getChats();
    const grupos = chats.filter(chat => chat.isGroup);

    return grupos.map(grupo => ({
        id: grupo.id._serialized,
        name: grupo.name,
        participantCount: grupo.participants ? grupo.participants.length : 0
    }));
}

module.exports = {
    startBot,
    forceLogin,
    getSessionStatus,
    getCurrentQR,
    getCurrentClient,
    killBot,
    obtenerGrupos
};