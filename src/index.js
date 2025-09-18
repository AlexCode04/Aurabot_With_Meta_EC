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
        console.log('⚠️ Cliente no inicializado aún');
        return;
    }

    // Solo configurar si no existen ya
    if (client.listenerCount('message') === 0) {
        client.on('message', async (msg) => {
            console.log('📩 Mensaje recibido:', msg.body);

            const MessageData = {
                from: msg.from,
                body: msg.body,
                timestamp: msg.timestamp,
                id: msg.id.id
            };

            await processIncomingMessage(MessageData, wsp);
        });

        wsp = new whatsappService(client);
        console.log('✅ Listeners de WhatsApp configurados');
    }
}

global.setupWhatsAppListeners = setupWhatsAppListeners;

// 👉 Enganchamos eventos del cliente
// const client = getCurrentClient();

// if (client) {
//     client.on('ready', () => {
//         console.log("✅ WhatsApp listo, configurando listeners...");
//         setupWhatsAppListeners();

//         // Mantener funciones activas cada 5 minutos
//         setInterval(() => {
//             if (client.info && wsp) {
//                 serverFunctionsActive(wsp);
//             } else {
//                 console.log("⚠️ Cliente no disponible, se omite ejecución.");
//             }
//         }, 5 * 60 * 1000);
//     });

//     client.on('disconnected', (reason) => {
//         console.log("⚠️ WhatsApp desconectado:", reason);
//         console.log("♻️ Reiniciando cliente...");
//         startBot();
//     });

//     client.on('auth_failure', (msg) => {
//         console.error("❌ Fallo de autenticación:", msg);
//     });
// }

app.listen(PORT, () => console.log(`🚀 Servidor en puerto ${PORT}`));
