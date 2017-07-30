const config = require("../config/config");
const transporter = require("../src/transporter");
const bcrypt = require("bcrypt");
const validate = require("express-validation");
const validations = require("../config/validations");
const createToken = require("../src/create-token");
const knex = require("../src/knex");
const express = require("express");

let router = express.Router();

/* Create user */
const schema = {
  body: {
    username: validations.username.required(),
    password: validations.password.required(),
    email: validations.email
  }
};

router.post("/users", validate(schema), async function(req, res, next) {
  try {
    let digest = await bcrypt.hash(req.body.password, 10);

    let usersInserted = await knex("api.users")
      .insert({
        username: req.body.username,
        username_lowercase: req.body.username.toLowerCase(),
        email: req.body.email ? req.body.email.toLowerCase() : null,
        password: digest
      })
      .returning("*");

    var user = usersInserted[0];
  } catch (err) {
    err.status = 400;

    return next(err);
  }

  res.status(201).send({
    access_token: createToken({
      aud: user.username_lowercase,
      count: user.count,
      sub: "access"
    })
  });

  if (user.email) {
    let mailOptions = {
      from: `"${config.app}" <${config.email}>`,
      to: user.email,
      subject: "Welcome!",
      text:
        `Your username for ${config.app} is: ${user.username}\n\n` +
        `If you are having a problem with your account, please email ${config.email}.\n\n` +
        "Thank you for using the site!\n\n" +
        `-${config.app} Team`
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error(error);
      }
      console.log("Message %s sent: %s", info.messageId, info.response);
    });
  }
});

module.exports = router;
