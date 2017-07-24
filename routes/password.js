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

let router = express.Router();

const schema = {
  body: {
    username: Joi.string().alphanum().min(3).max(20).required(),
    current_password: Joi.string().regex(/^[a-zA-Z0-9]{3,30}$/).required(),
    new_password: Joi.string().regex(/^[a-zA-Z0-9]{3,30}$/).required(),
    new_password_confirm: Joi.string().regex(/^[a-zA-Z0-9]{3,30}$/).required()
  }
};

router.post("/password", validate(schema), async function(req, res, next) {
  if (req.body.new_password !== req.body.new_password_confirm) {
    let err = new Error("Password do not match");
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

  return res.status(201).send({
    access_token: createToken(usersUpdated[0])
  });
});

module.exports = router;
