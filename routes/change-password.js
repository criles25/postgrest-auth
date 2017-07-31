const config = require("../config/config");
const createToken = require("../src/create-token");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const validate = require("express-validation");
const validations = require("../config/validations");
const knex = require("../src/knex");
const express = require("express");

let router = express.Router();

const schema = {
  body: {
    username: validations.username.required(),
    current_password: validations.password,
    new_password: validations.password.required(),
    new_password_confirm: validations.password.required(),
    reset_token: validations.token
  }
};

router.post("/change_password", validate(schema), async function(
  req,
  res,
  next
) {
  if (req.body.current_password) {
    try {
      let user = await knex("api.users")
        .where({ username_lowercase: req.body.username.toLowerCase() })
        .first("*");

      let correctPass = await bcrypt.compare(
        req.body.current_password,
        user.password
      );

      if (!correctPass) {
        throw new Error("Username or password invalid");
      }
    } catch (err) {
      err.status = 400;
      return next(err);
    }
  } else if (req.body.reset_token) {
    try {
      let user = await knex("api.users")
        .where({ username_lowercase: req.body.username.toLowerCase() })
        .first("*");
      let decoded = jwt.verify(req.body.reset_token, config.secret, {
        subject: "reset"
      });

      if (user.token_count !== decoded.count) {
        throw new Error("Invalid token");
      }
    } catch (err) {
      err.status = 400;
      return next(err);
    }
  } else {
    let err = new Error("Require current_password or reset_token");
    err.status = 400;

    return next(err);
  }

  // Change password, increment token_count
  let digest = await bcrypt.hash(req.body.new_password, 10);
  let usersUpdated = await knex("api.users")
    .where({ username_lowercase: req.body.username.toLowerCase() })
    .update({ password: digest, token_count: knex.raw("token_count + 1") })
    .returning("*");

  return res.status(200).send({
    access_token: createToken({
      aud: usersUpdated[0].username_lowercase,
      count: usersUpdated[0].token_count,
      sub: "access"
    })
  });
});

module.exports = router;
