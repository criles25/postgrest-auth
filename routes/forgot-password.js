const config = require("../config/config");
const createToken = require("../src/create-token");
const bcrypt = require("bcrypt");
const validate = require("express-validation");
const validations = require("../config/validations");
const knex = require("../src/knex");
const transporter = require("../src/transporter");
const express = require("express");

let router = express.Router();

const schema = {
  body: {
    username: validations.username.required()
  }
};

router.post("/forgot_password", validate(schema), async function(
  req,
  res,
  next
) {
  try {
    let user = await knex("api.users")
      .where({ username_lowercase: req.body.username.toLowerCase() })
      .first("*");

    let mailOptions = {
      from: `"${config.app}" <${config.email}>`,
      to: user.email,
      subject: "Password reset ✔",
      text:
        `Your password has been requested to be reset on ${config.app}.\n\n` +
        "Use this reset token:\n\n" +
        `${createToken({
          aud: user.username_lowercase,
          count: user.token_count,
          exp: 3600,
          sub: "reset"
        })}\n\n` +
        "This reset token will expire in 1 hour.\n\n" +
        "If you did not make this request, you can safely ignore this email.\n\n" +
        "A password reset request can be made by anyone, and it does not indicate that your account is in any danger of being accessed by someone else.\n\n" +
        "Thank you for using the site!\n\n" +
        `-${config.app} Team\n\n`
    };

    await transporter.sendMail(mailOptions);
  } catch (err) {
    err.status = 400;
    return next(err);
  }

  return res.status(200).send({ message: "Password reset email sent" });
});

module.exports = router;
