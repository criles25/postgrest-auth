const jwt = require("jsonwebtoken");
const config = require("./../config/config");

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

function createToken(user) {
  return jwt.sign(
    {
      iss: config.payload.issuer,
      aud: config.payload.audience,
      exp: Math.floor(Date.now() / 1000) + config.payload.expiration,
      scope: config.payload.scope,
      sub: config.payload.subject || user.username,
      jti: genJti(), // unique identifier for the token
      alg: config.payload.algorithm,
      role: config.payload.role,
      email: user.email,
      count: user.token_count
    },
    config.secret
  );
}

module.exports = createToken;
