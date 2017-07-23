var config = require("./../config/config");
var bcrypt = require("bcrypt");
var validate = require("express-validation");
var Joi = require("joi");
var jwt = require("jsonwebtoken");
var knex = require("knex")({
  client: "postgresql",
  connection: config.connection_string || config.connection,
  pool: config.connection_pool
});

var express = require("express");
var router = express.Router();

function createAccessToken(user) {
  return jwt.sign(
    {
      iss: config.payload.issuer,
      aud: config.payload.audience,
      exp: Math.floor(Date.now() / 1000) + config.payload.expiration,
      scope: config.payload.scope,
      sub: config.payload.subject || user.username_lowercase,
      jti: genJti(), // unique identifier for the token
      alg: config.payload.algorithm,
      role: config.payload.role
    },
    config.secret
  );
}

// Generate Unique Identifier for the access token
function genJti() {
  let jti = "";
  let possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 16; i++) {
    jti += possible.charAt(Math.floor(Math.random() * possible.length));
  }

  return jti;
}

/* Create account */
var schema = {
  body: {
    username: Joi.string().alphanum().min(3).max(20).required(),
    password: Joi.string().regex(/^[a-zA-Z0-9]{3,30}$/).required(),
    email: Joi.string().email().required()
  }
};

router.post("/users", validate(schema), function(req, res, next) {
  // Check if user exists in db
  return knex("api.users")
    .where("username", req.body.username)
    .orWhere("email", req.body.email)
    .then(users => {
      if (users.length > 0) {
        var err = new Error(
          "A user with that username or email already exists"
        );
        err.status = 400;
        err.errors = [
          { messages: ["A user with that username or email already exists"] }
        ];

        return next(err);
      }

      // Insert into db
      return bcrypt.hash(req.body.password, 10).then(function(hash) {
        return knex("api.users")
          .insert({
            username: req.body.username,
            username_lowercase: req.body.username.toLowerCase(),
            email: req.body.email,
            password: hash
          })
          .returning("*")
          .then(users => {
            return res.status(201).send({
              access_token: createAccessToken(users[0])
            });
          });
      });
    })
    .catch(err => {
      err.status = 500;
      err.errors = [
        { messages: ["There was a problem creating your account"] }
      ];

      return next(err);
    });
});

module.exports = router;
