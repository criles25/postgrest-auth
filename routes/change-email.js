const bcrypt = require("bcrypt");
const validate = require("express-validation");
const validations = require("../config/validations");
const knex = require("../src/knex");
const express = require("express");

let router = express.Router();

const schema = {
  body: {
    username: validations.username.required(),
    password: validations.password.required(),
    email: validations.email.required()
  }
};

router.post("/change_email", validate(schema), async function(req, res, next) {
  try {
    let user = await knex("api.users")
      .where({ username_lowercase: req.body.username.toLowerCase() })
      .first("*");

    let correctPass = await bcrypt.compare(req.body.password, user.password);
    if (!correctPass) {
      throw new Error("Username or password invalid");
    }

    // Change email
    let usersUpdated = await knex("api.users")
      .where({ username_lowercase: user.username_lowercase })
      .update({ email: req.body.email.toLowerCase() })
      .returning("*");
  } catch (err) {
    err.status = 400;
    return next(err);
  }

  return res.status(200).send({ message: "Email changed" });
});

module.exports = router;
