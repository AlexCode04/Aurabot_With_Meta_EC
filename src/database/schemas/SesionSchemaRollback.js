const mongoose = require('mongoose');
const respuestaSchema = require('./respuestaSchema'); // Importar el esquema de respuesta

const sesionSchemaRollback = new mongoose.Schema({
  numeroWhatsApp: { type: String, default: null },
  nombre: { type: String, default: null },
  edad: { type: Number, default: null },
  profesion: { type: String, default: null },
  circuloSocial: { type: String, default: null },
  ciudad: { type: String, default: null },
  familiares: { type: String, default: null },
  hobbies: { type: String, default: null },
  estadogeneral: { type: String, default: null },
  respuestas: [respuestaSchema],
  CantidadMensajes: { type: Number, default: 0 },
  audioEnviado: { type: Boolean, default: false },
  esperandoRespuestaMeditacion: { type: Boolean, default: false },
  invitadoComunidad: { type: Boolean, default: false },
  fechaCierreTemporal: { type: Date, default: null },
  fechaUltimaInteraccion: { type: Date, default: Date.now },
  interesMeditacion: { type: Boolean, default: false },
  emocionPrincipal: { type: String, default: null },
  situacionPrincipal: { type: String, default: null },
  necesitaApoyoProfesional: { type: Boolean, default: false },
  observacionFinal: { type: String, default: null },
  aceptoTratamientoDeDatos: { type: Boolean, default: false }, // Nuevo campo para consentimiento de tratamiento de datos
  fechaUltimaNotificacion: { type: Date, default: null }
});

module.exports = mongoose.model('SesionRollback', sesionSchemaRollback);