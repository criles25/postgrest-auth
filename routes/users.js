var config = require("./../config/config");

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
      iss: config.issuer,
      aud: config.audience,
      exp: Math.floor(Date.now() / 1000) + config.expiration,
      scope: config.scope,
      sub: config.subject || user.username_lowercase,
      jti: genJti(), // unique identifier for the token
      alg: config.algorithm,
      role: config.role
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
router.post("/users", function(req, res, next) {
  if (!req.body.username || !req.body.password || !req.body.email) {
    var err = new Error("You must send a username, email and password");
    err.status = 400;

    return next(err);
  }

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

        return next(err);
      }

      // Insert into db
      return knex("api.users")
        .insert({
          username: req.body.username,
          username_lowercase: req.body.username.toLowerCase(),
          email: req.body.email,
          password: req.body.password
        })
        .returning("*")
        .then(users => {
          return res.status(201).send({
            access_token: createAccessToken(users[0])
          });
        });
    })
    .catch(err => {
      console.error(err);

      var publicErr = new Error("There was a problem creating your account");
      publicErr.status = 500;

      return next(publicErr);
    });
});

module.exports = router;
