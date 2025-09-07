// routes/sesiones.js
const express = require('express');
const router = express.Router();
const Sesion = require('../database/schemas/SesionSchema'); // Asegúrate que 'db.js' exporta tu modelo Mongoose
const SesionRollback = require('../database/schemas/SesionSchemaRollback');

router.get('/get-all', async (req, res) => {
  try {
    const sesiones = await SesionRollback.find({}).sort({ fechaUltimaInteraccion: -1 });
    res.json(sesiones);
  } catch (err) {
    console.error('Error al obtener sesiones:', err);
    res.status(500).json({ error: 'Error al obtener las sesiones' });
  }
});

router.get('/delete-all', async (req, res) => {
  try {
    const result = await Sesion.deleteMany({});
    res.json({ message: 'Todas las sesiones han sido eliminadas', result });
  } catch (err) {
    console.error('Error al eliminar sesiones:', err);
    res.status(500).json({ error: 'Error al eliminar las sesiones' });
  }
});

module.exports = router;
