const dotenv = require('dotenv')
const axios = require('axios');
const bodyParser = require('body-parser');
const express = require('express');
const { serverFunctionsActive } = require('./services/ServerActionService');
const Configs = require("./config/configs");
const ConectDB = require('./database/MongoClient');
const { processIncomingMessage } = require('./services/processIncomingMessage');

dotenv.config();
ConectDB();

const app = express();
app.use(bodyParser.json());

const PORT = Configs.PORT;
const VERIFY_TOKEN = Configs.VERIFY_TOKEN;


// ✅ Ruta para verificar el Webhook (Meta la llama una vez)
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

// ✅ Recibir mensajes
app.post("/webhook", async (req, res) => {
    const entry = req.body.entry?.[0];
    const changes = entry?.changes?.[0];
    const message = changes?.value?.messages?.[0];

    if (message) {
            await processIncomingMessage(message);
        }

    
    res.sendStatus(200);
});

setInterval(serverFunctionsActive, 1 * 60 * 1000); // Cada 1 minuto

app.listen(PORT, () => console.log(`🚀 Servidor en puerto ${PORT}`));
