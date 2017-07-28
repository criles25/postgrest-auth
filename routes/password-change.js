const config = require("./../config/config");
const createToken = require("./../src/create-token");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const validate = require("express-validation");
const Joi = require("joi");
const knex = require("knex")({
  client: "postgresql",
  connection: config.connection_string || config.connection,
  pool: config.connection_pool
});
const express = require("express");

let router = express.Router();

const schema = {
  body: {
    username: Joi.string().alphanum().min(3).max(20).required(),
    current_password: Joi.string().regex(/^[a-zA-Z0-9]{3,30}$/),
    new_password: Joi.string().regex(/^[a-zA-Z0-9]{3,30}$/).required(),
    new_password_confirm: Joi.string().regex(/^[a-zA-Z0-9]{3,30}$/).required(),
    reset_token: Joi.string().regex(
      /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_.+/=]*$/
    )
  }
};

router.post("/password_change", validate(schema), async function(
  req,
  res,
  next
) {
  if (req.body.current_password == null && req.body.reset_token == null) {
    let err = new Error("Request requires current_password or reset_token");
    err.status = 400;
    err.errors = [
      { messages: ["Request requires current_password or reset_token"] }
    ];

    return next(err);
  }

  if (req.body.new_password !== req.body.new_password_confirm) {
    let err = new Error("Passwords do not match");
    err.status = 400;
    err.errors = [{ messages: ["Passwords do not match"] }];

    return next(err);
  }

  let user = await knex("api.users")
    .where({
      username_lowercase: req.body.username.toLowerCase()
    })
    .first("*");

  if (user == null) {
    let err = new Error("Username or password invalid");
    err.status = 400;
    err.errors = [{ messages: ["Username or password invalid"] }];

    return next(err);
  }

  if (req.body.current_password) {
    let correctPass = await bcrypt.compare(
      req.body.current_password,
      user.password
    );
    if (!correctPass) {
      let err = new Error("Username or password invalid");
      err.status = 400;
      err.errors = [{ messages: ["Username or password invalid"] }];

      return next(err);
    }
  } else {
    let verify = new Promise((resolve, reject) => {
      jwt.verify(
        req.body.reset_token,
        config.secret,
        { subject: "reset" },
        async (err, decoded) => {
          if (err) {
            err.status = 400;
            err.errors = [{ messages: ["Token invalid"] }];

            reject(err);
          }

          // Check token count
          let user = await knex("api.users")
            .where({
              username_lowercase: decoded.aud.toLowerCase()
            })
            .first("*");

          if (user.token_count != decoded.count) {
            var errTokenCount = new Error("Token invalid");
            errTokenCount.status = 400;
            errTokenCount.errors = [{ messages: ["Token invalid"] }];

            reject(errTokenCount);
          }

          resolve(false);
        }
      );
    });

    let verifyErr = await verify;
    if (verifyErr) {
      return next(verifyErr);
    }
  }

  // Change password, increment token_count
  let passDigest = await bcrypt.hash(req.body.new_password, 10);
  let usersUpdated = await knex("api.users")
    .where({
      username_lowercase: req.body.username.toLowerCase()
    })
    .update({
      password: passDigest,
      token_count: knex.raw("token_count + 1")
    })
    .returning("*");

  return res.status(200).send({
    access_token: createToken({
      aud: usersUpdated[0].username_lowercase,
      count: usersUpdated[0].count,
      sub: "access"
    })
  });
});

module.exports = router;
