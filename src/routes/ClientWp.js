const express = require('express');
const router = express.Router();
const wsp = require('../ClientsWp/Client_Wp_web'); // Cambiar la ruta de importación
const QRCode = require('qrcode');




router.get('/status', (req, res) => {
    res.json({
        status: wsp.getSessionStatus(), // Cambiar getStatus() por getSessionStatus()
        qr: wsp.getCurrentQR(),         // Cambiar getQR() por getCurrentQR()
        connected: wsp.getSessionStatus() === 'CONNECTED'
    });
});

router.get('/qr', async (req, res) => {
    if (wsp.getSessionStatus() === 'CONNECTED') { // Cambiar getStatus()
        return res.json({ status: 'CONNECTED', message: 'Ya conectado ✅' });
    }

    // Si ya hay QR pendiente
    if (wsp.getCurrentQR()) { // Cambiar getQR()
        const qrFinal = await QRCode.toDataURL(wsp.getCurrentQR());
        console.log('qrFinal:', qrFinal);
        return res.json({ status: 'QR_REQUIRED', qr: qrFinal });
    }

    // Forzar login y obtener QR
    try {
        const qr = await wsp.forceLogin();
        
        if (!qr) {
            return res.json({ status: 'CONNECTED', message: 'Conectado automáticamente ✅' });
        }
        const qrFinal = await QRCode.toDataURL(wsp.getCurrentQR());
        console.log('qrFinal:', qrFinal);
        res.json({ status: 'QR_REQUIRED', qr: qrFinal });
    } catch (error) {
        res.status(500).json({ status: 'ERROR', message: 'No se pudo generar QR' });
    }
});

router.post('/kill', async (req, res) => {
    await wsp.killBot(); // Cambiar kill() por killBot()
    res.json({ status: 'DISCONNECTED' });
});

module.exports = router;