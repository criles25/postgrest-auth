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
    password: Joi.string().regex(/^[a-zA-Z0-9]{3,30}$/).required(),
    email: Joi.string().email().required()
  }
};

router.post("/email", validate(schema), async function(req, res, next) {
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

  // Change email
  let passDigest = await bcrypt.hash(req.body.password, 10);
  let usersUpdated = await knex("api.users")
    .where({
      username_lowercase: req.body.username.toLowerCase()
    })
    .update({
      email: req.body.email.toLowerCase()
    })
    .returning("*");

  return res.status(201).send({
    access_token: createToken(usersUpdated[0])
  });
});

module.exports = router;
