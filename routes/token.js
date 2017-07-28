const config = require("./../config/config");
const createToken = require("./../src/create-token");
const bcrypt = require("bcrypt");
const validate = require("express-validation");
const Joi = require("joi");
const jwt = require("jsonwebtoken");
const knex = require("knex")({
  client: "postgresql",
  connection: config.connection_string || config.connection,
  pool: config.connection_pool
});
const express = require("express");

let router = express.Router();

const tokenSchema = {
  body: {
    username: Joi.string().alphanum().min(3).max(20),
    password: Joi.string().regex(/^[a-zA-Z0-9]{3,30}$/)
  }
};

router.post("/token", validate(tokenSchema), async function(req, res, next) {
  if (req.body.username || req.body.password) {
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

    let correctPass = await bcrypt.compare(req.body.password, user.password);
    if (!correctPass) {
      let err = new Error("Username or password invalid");
      err.status = 400;
      err.errors = [{ messages: ["Username or password invalid"] }];

      return next(err);
    }

    return res.status(200).send({
      access_token: createToken({
        aud: user.username_lowercase,
        count: user.count,
        sub: "access"
      })
    });
  } else if (req.token) {
    return jwt.verify(
      req.token,
      config.secret,
      { subject: "access" },
      async (err, decoded) => {
        if (err) {
          err.status = 400;
          err.errors = [{ messages: ["Token invalid"] }];

          return next(err);
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

          return next(errTokenCount);
        }

        return res.status(200).send({
          access_token: createToken({
            aud: user.username_lowercase,
            count: user.count,
            sub: "access"
          })
        });
      }
    );
  }

  let err = new Error("Username or password invalid");
  err.status = 400;
  err.errors = [{ messages: ["Username or password invalid"] }];

  return next(err);
});

module.exports = router;
