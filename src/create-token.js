const jwt = require("jsonwebtoken");
const config = require("./../config/config");
const _ = require("lodash");

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

function createToken(payload = {}, secret = config.secret) {
  let token = _.assign({}, config.payload, payload);

  token.jti = genJti();
  token.exp =
    Math.floor(Date.now() / 1000) + (payload.exp || config.payload.exp);
  token.count = payload.count || 0;

  return jwt.sign(token, secret);
}

module.exports = createToken;
