const mongoose = require('mongoose');

const logSchema = new mongoose.Schema({
    level: { type: String, required: true },
    message: { type: String, required: true },
    functionName: { type: String },
    timestamp: { type: Date, default: Date.now }
});

const Log = mongoose.model('Log', logSchema);

module.exports = Log;