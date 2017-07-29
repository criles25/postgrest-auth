const Joi = require("joi");

const validations = {
  username: Joi.string().alphanum().min(3).max(20),
  password: Joi.string().regex(/^[a-zA-Z0-9]{3,30}$/),
  email: Joi.string().email(),
  token: Joi.string().regex(
    /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_.+/=]*$/
  )
};

module.exports = validations;
