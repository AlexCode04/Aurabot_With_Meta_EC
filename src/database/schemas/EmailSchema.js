const mongoose = require('mongoose');

const logSchema = new mongoose.Schema({
    subject: { type: String, required: true },
    template: { type: String, required: true },
    to: { type: [String], required: true },
    timestamp: { type: Date, default: Date.now }
});

const Email = mongoose.model('Email', emailSchema);

module.exports = Email;

// Hacer validación que cierta cantidad de tiempo, no envie la notificación si 
// no que valide desde el ultimo que mando hasta la fecha actual y si ya se abrio o no.