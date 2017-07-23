const config = require("./../config/config");
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
    email: Joi.string().email().required()
  }
};

router.post("/users", validate(schema), async function(req, res, next) {
  let existingUsers = await knex("api.users")
    .where("username_lowercase", req.body.username.toLowerCase())
    .orWhere("email", req.body.email.toLowerCase());

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
        email: req.body.email.toLowerCase(),
        password: passDigest
      })
      .returning("*");

    return res.status(201).send({
      access_token: createToken(usersInserted[0])
    });
  } catch (err) {
    err.status = 500;
    err.errors = [{ messages: ["There was a problem creating your account"] }];

    return next(err);
  }
});

module.exports = router;
