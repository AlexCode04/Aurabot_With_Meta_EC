const jwt = require("jsonwebtoken");
const Configs = require('../config/configs');

function generateJWTToken(payload, secret = Configs.JWT_SECRET, expiresIn = Configs.JWT_EXPIRES_IN) {
    return jwt.sign(payload, secret, { algorithm: "HS256", expiresIn });
}
module.exports = { generateJWTToken };