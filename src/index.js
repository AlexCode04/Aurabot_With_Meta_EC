const dotenv = require('dotenv');
const axios = require('axios');
const bodyParser = require('body-parser');
const express = require('express');
const { serverFunctionsActive } = require('./services/ServerActionService');
const Configs = require("./config/configs");
const ConectDB = require('./database/MongoClient');
const { processIncomingMessage } = require('./services/processIncomingMessage');
const { getCurrentClient, startBot } = require('./ClientsWp/Client_Wp_web');
const whatsappService = require("./services/WhatsAppServiceWeb");
const wpRoutes = require('./routes/ClientWp');
const usersRoutes = require('./routes/sesiones');
const cors = require('cors');
const Logger = require('./logs/service/Logger');
const { VerifyTimeBeforeSendEmail } = require('./logs/controller/LoggerController');
dotenv.config();
ConectDB();

const app = express();
let wsp;

app.use(cors({
    origin: [
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'http://54.39.7.181',
        'http://54.39.7.181:8080'
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(bodyParser.json());
app.use(cors());

app.use('/api/bot/', wpRoutes);
app.use('/api/sesiones/', usersRoutes);

const PORT = Configs.PORT;
const VERIFY_TOKEN = Configs.VERIFY_TOKEN;

// ✅ Ruta para verificar el Webhook
app.get("/webhook", (req, res) => {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    if (mode && token === VERIFY_TOKEN) {
        console.log("✅ Webhook verificado!");
        res.status(200).send(challenge);
    } else {
        res.sendStatus(403);
    }
});

// ✅ Recibir mensajes desde Meta Webhook
app.post("/webhook", async (req, res) => {
    const entry = req.body.entry?.[0];
    const changes = entry?.changes?.[0];
    const message = changes?.value?.messages?.[0];

    if (message) {
        await processIncomingMessage(message);
    }

    res.sendStatus(200);
});

// 👉 Configurar listeners del cliente de WhatsApp
function setupWhatsAppListeners() {
    const client = getCurrentClient();

    if (!client) {
        Logger.Log('No hay cliente disponible para configurar listeners', 'error', 'setupWhatsAppListeners');
        return;
    }
    Logger.Log('Configurando listeners de WhatsApp', 'info', 'setupWhatsAppListeners');
    // Solo configurar si no tiene listeners ya
    if (client.listenerCount('message') === 0) {
        client.on('message', async (msg) => {


            const MessageData = {
                from: msg.from,
                body: msg.body,
                timestamp: msg.timestamp,
                id: msg.id.id
            };

            await processIncomingMessage(MessageData, wsp);
            Logger.Log(`Mensaje recibido y procesado ${msg.body}`, 'info', 'setupWhatsAppListeners');
        });

        wsp = new whatsappService(client);
        Logger.Log('Listeners de WhatsApp configurados', 'info', 'setupWhatsAppListeners');
    }
}


setInterval(async () => {
    const client = getCurrentClient();
    if (client && client.info) {
        Logger.Log(`Cliente activo: ${client.info.pushname} - ${client.info.wid.user}`, 'info', 'ClientStatusCheck');
    }

    if (!client || client.status !== 'CONNECTED') {
        Logger.Log('Cliente no conectado', 'warn', 'ClientStatusCheck');

        const emailData = {
            subject: 'Error al reiniciar el cliente de WhatsApp',
            message: `Hubo un error al intentar reiniciar el cliente de WhatsApp: Ingresar y conectar Qr de nuevo.`,
            context: {
                subject: 'Error al reiniciar el cliente de WhatsApp',
                message: `Hubo un error al intentar reiniciar el cliente de WhatsApp: Ingresar y conectar Qr de nuevo.`,
                date: new Date().toLocaleDateString(),
            }
        };

        const canSend = await VerifyTimeBeforeSendEmail();
        if (!canSend) {
            Logger.Log('No ha pasado el tiempo mínimo para enviar otro email.', 'info', 'ClientStatusCheck');
            return;
        }

        Logger.sendNotification(emailData);
        return;
    }

    Logger.Log('Cliente no conectado. Intentando reiniciar...', 'warn', 'ClientStatusCheck');

}, 1 * 60 * 1000); // Cada 1 minuto


// Exportar la función para usarla en las rutas
global.setupWhatsAppListeners = setupWhatsAppListeners;

// Mantener funciones activas cada 5 minutos
setInterval(() => {serverFunctionsActive(wsp)}, 5 * 60 * 1000);


app.listen(PORT, () => console.log(`🚀 Servidor en puerto ${PORT}`));
