const config = require("./../config/config");
const nodemailer = require("nodemailer");
const bcrypt = require("bcrypt");
const validate = require("express-validation");
const Joi = require("joi");
const createToken = require("./../src/create-token");
const knex = require("knex")({
  client: "postgresql",
  connection: config.connection_string || config.connection,
  pool: config.connection_pool
});
const express = require("express");

let router = express.Router();

/* Create user */
const schema = {
  body: {
    username: Joi.string().alphanum().min(3).max(20).required(),
    password: Joi.string().regex(/^[a-zA-Z0-9]{3,30}$/).required(),
    email: Joi.string().email()
  }
};

router.post("/users", validate(schema), async function(req, res, next) {
  let existingUsers = await knex("api.users")
    .where("username_lowercase", req.body.username.toLowerCase())
    .orWhere("email", req.body.email ? req.body.email.toLowerCase() : "");

  if (existingUsers.length > 0) {
    let err = new Error("A user with that username or email already exists");
    err.status = 400;
    err.errors = [
      { messages: ["A user with that username or email already exists"] }
    ];

    return next(err);
  }

  // Insert user into db
  try {
    let passDigest = await bcrypt.hash(req.body.password, 10);
    let usersInserted = await knex("api.users")
      .insert({
        username: req.body.username,
        username_lowercase: req.body.username.toLowerCase(),
        email: req.body.email ? req.body.email.toLowerCase() : null,
        password: passDigest
      })
      .returning("*");
    let newUser = usersInserted[0];

    if (newUser.email) {
      let transporter = nodemailer.createTransport(config.nodemailer);

      let mailOptions = {
        from: '"A Game of Theories" <contact@agameoftheories.com>',
        to: newUser.email,
        subject: "Welcome!",
        text: `
        Your username for A Game of Theories is: ${newUser.username}

        If you are having a problem with your account, please email contact@agameoftheories.com.

        Thank you for using the site! Valar Dohaeris!

        -A Game of Theories Team`
      };

      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          console.error(error);
        }
        console.log("Message %s sent: %s", info.messageId, info.response);
      });
    }

    return res.status(201).send({
      access_token: createToken({
        aud: newUser.username_lowercase,
        count: newUser.count,
        sub: "access"
      })
    });
  } catch (err) {
    err.status = 500;
    err.errors = [{ messages: ["There was a problem creating your account"] }];

    return next(err);
  }
});

module.exports = router;
