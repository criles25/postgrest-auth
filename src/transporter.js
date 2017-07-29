const config = require("../config/config");
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport(config.nodemailer);

module.exports = transporter;
