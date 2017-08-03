const config = require("../config/config");
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport(config.email);

module.exports = transporter;
