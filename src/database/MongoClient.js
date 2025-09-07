// src/db.js
const mongoose = require('mongoose');
const Configs = require('../config/configs');

const connectDB = () => {
  try {
    return mongoose.connect(Configs.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
  }
};

module.exports = connectDB;
