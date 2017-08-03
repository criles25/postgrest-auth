const config = require("../config/config");
const transporter = require("../src/transporter");
const bcrypt = require("bcrypt");
const validate = require("express-validation");
const validations = require("../config/validations");
const createToken = require("../src/create-token");
const knex = require("../src/knex");
const express = require("express");

let router = express.Router();

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

    // Create user and role
    var user = await knex.transaction(trx => {
      return trx
        .insert({
          username: req.body.username,
          username_lowercase: req.body.username.toLowerCase(),
          email: req.body.email ? req.body.email.toLowerCase() : null,
          password: digest
        })
        .into(`${config.db.schema}.${config.db.table}`)
        .returning("*")
        .then(usersInserted => {
          return trx
            .raw("CREATE ROLE ??;", usersInserted[0].username_lowercase)
            .then(() => {
              if (config.roles.user) {
                return trx
                  .raw("GRANT ??, ?? TO ??", [
                    config.roles.user,
                    config.roles.anonymous,
                    usersInserted[0].username_lowercase
                  ])
                  .then(() => usersInserted[0]);
              }

              return trx
                .raw("GRANT ?? TO ??", [
                  config.roles.anonymous,
                  usersInserted[0].username_lowercase
                ])
                .then(() => usersInserted[0]);
            });
        });
    });
  } catch (err) {
    err.status = 400;

    return next(err);
  }

  res.status(201).send({
    access_token: createToken({
      aud: user.username_lowercase,
      count: user.count,
      role: user.username_lowercase,
      sub: "access"
    })
  });

  if (user.email) {
    let mailOptions = {
      from: `"${config.app_name}" <${config.email.from}>`,
      to: user.email,
      subject: "Welcome!",
      text:
        `Your username for ${config.app_name} is: ${user.username}\n\n` +
        `If you are having a problem with your account, please email ${config
          .email.from}.\n\n` +
        "Thank you for using the site!\n\n" +
        `-${config.app_name} Team`
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
