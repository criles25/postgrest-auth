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
    username: Joi.string().alphanum().min(3).max(20).required()
  }
};

router.post("/forgot_password", validate(schema), async function(
  req,
  res,
  next
) {
  let user = await knex("api.users")
    .where({
      username_lowercase: req.body.username.toLowerCase()
    })
    .first("*");

  if (user == null) {
    let err = new Error(
      `No username ${req.body.username.toLowerCase()} exists`
    );
    err.status = 400;
    err.errors = [
      { messages: ["`No username ${req.body.username.toLowerCase()} exists`"] }
    ];

    return next(err);
  }

  let transporter = nodemailer.createTransport(config.nodemailer);

  let mailOptions = {
    from: '"A Game of Theories" <contact@agameoftheories.com>',
    to: user.email,
    subject: "Password reset ✔",
    text: `
    Your password has been requested to be reset on A Game of Theories.

    Use this reset token:

    ${createToken({
      aud: user.username_lowercase,
      count: user.token_count,
      exp: 3600,
      sub: "reset"
    })}

    If you did not make this request, you can safely ignore this email.

    A password reset request can be made by anyone, and it does not indicate that your account is in any danger of being accessed by someone else.

    Thank you for using the site! Valar Dohaeris!

    -A Game of Theories Team`
  };

  return transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error(error);

      let err = new Error(`Error sending password reset`);
      err.status = 500;
      err.errors = [{ messages: [`Error sending password reset`] }];

      return next(err);
    }
    console.log("Message %s sent: %s", info.messageId, info.response);

    return res.status(200).send({
      message: "Password reset email sent"
    });
  });
});

module.exports = router;
