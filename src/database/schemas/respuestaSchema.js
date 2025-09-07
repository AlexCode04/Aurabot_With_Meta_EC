const mongoose = require('mongoose');

const respuestaSchema = new mongoose.Schema({
  pregunta: String,
  respuesta: String,
  fecha: { type: Date, default: Date.now }
});

module.exports = respuestaSchema;
