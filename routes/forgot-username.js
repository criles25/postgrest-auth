const bcrypt = require("bcrypt");
const validate = require("express-validation");
const validations = require("../config/validations");
const knex = require("../src/knex");
const express = require("express");
const transporter = require("../src/transporter");

let router = express.Router();

const schema = {
  body: {
    email: validations.email.required()
  }
};

router.post("/forgot_username", validate(schema), async function(
  req,
  res,
  next
) {
  try {
    let user = await knex("api.users")
      .where({ email: req.body.email.toLowerCase() })
      .first("*");

    let mailOptions = {
      from: '"A Game of Theories" <contact@agameoftheories.com>',
      to: user.email,
      subject: "Forgot username ✔",
      text:
        `Your username has been requested for A Game of Theories: ${user.username}\n\n` +
        "If you did not make this request, you can safely ignore this email.\n\n" +
        "A username request can be made by anyone, and it does not indicate that your account is in any danger of being accessed by someone else.\n\n" +
        "Thank you for using the site! Valar Dohaeris!\n\n" +
        "-A Game of Theories Team"
    };

    await transporter.sendMail(mailOptions);
  } catch (err) {
    err.status = 400;
    return next(err);
  }

  return res.status(200).send({
    message: "Username Email sent"
  });
});

module.exports = router;
