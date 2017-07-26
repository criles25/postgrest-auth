const config = require("./../config/config");
const createToken = require("./../src/create-token");
const bcrypt = require("bcrypt");
const validate = require("express-validation");
const Joi = require("joi");
const knex = require("knex")({
  client: "postgresql",
  connection: config.connection_string || config.connection,
  pool: config.connection_pool
});
const express = require("express");
const nodemailer = require("nodemailer");

let router = express.Router();

const schema = {
  body: {
    email: Joi.string().email().required()
  }
};

router.post("/forgot_user", validate(schema), async function(req, res, next) {
  let user = await knex("api.users")
    .where({
      email: req.body.email.toLowerCase()
    })
    .first("*");
  if (user == null) {
    let err = new Error(`No username exists with email ${req.body.email}`);
    err.status = 400;
    err.errors = [
      { messages: [`No username exists with email ${req.body.email}`] }
    ];

    return next(err);
  }

  // create reusable transporter object using the default SMTP transport
  let transporter = nodemailer.createTransport(config.nodemailer);

  // setup email data with unicode symbols
  let mailOptions = {
    from: '"A Game of Theories" <contact@agameoftheories.com>', // sender address
    to: user.email, // list of receivers
    subject: "Forgot username ✔", // Subject line
    text: `
    Your username has been requested for A Game of Theories: ${user.username}

    If you did not make this request, you can safely ignore this email.
    A username request can be made by anyone, and it does not indicate that your account is in any danger of being accessed by someone else.

    Thank you for using the site! Valar Dohaeris!

    -A Game of Theories Admin` // plain text body
    // html: "<b>Hello world ?</b>" // html body
  };

  // send mail with defined transport object
  return transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.log(error);

      let err = new Error(`Error sending username`);
      err.status = 500;
      err.errors = [{ messages: [`Error sending username`] }];

      return next(err);
    }
    console.log("Message %s sent: %s", info.messageId, info.response);

    return res.status(200).send({
      message: "Username Email sent"
    });
  });
});

module.exports = router;
