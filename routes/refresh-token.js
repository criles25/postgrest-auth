const config = require("../config/config");
const createToken = require("../src/create-token");
const bcrypt = require("bcrypt");
const validate = require("express-validation");
const validations = require("../config/validations");
const jwt = require("jsonwebtoken");
const knex = require("../src/knex");
const express = require("express");

let router = express.Router();

const schema = {
  body: {
    username: validations.username,
    password: validations.password
  }
};

router.post("/refresh_token", validate(schema), async function(req, res, next) {
  if (req.body.username || req.body.password) {
    try {
      var user = await knex("api.users")
        .where({ username_lowercase: req.body.username.toLowerCase() })
        .first("*");

      let correctPass = await bcrypt.compare(req.body.password, user.password);

      if (!correctPass) {
        throw new Error("Username or password invalid");
      }
    } catch (err) {
      err.status = 400;

      return next(err);
    }
  } else if (req.token) {
    try {
      let decoded = jwt.verify(req.token, config.secret, { subject: "access" });

      var user = await knex("api.users")
        .where({ username_lowercase: decoded.aud.toLowerCase() })
        .first("*");

      if (user.token_count !== decoded.count) {
        throw new Error("Token invalid");
      }
    } catch (err) {
      err.status = 400;

      return next(err);
    }
  } else {
    let err = new Error("Require username and password or access_token");
    err.status = 400;

    return next(err);
  }

  return res.status(200).send({
    access_token: createToken({
      aud: user.username_lowercase,
      count: user.count,
      sub: "access"
    })
  });
});

module.exports = router;
