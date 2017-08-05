const fs = require("fs");
const path = require("path");
const _ = require("lodash");
const argv = require("minimist")(process.argv.slice(2));

let config = {
  db: {
    pool: {
      min: 2,
      max: 10
    },
    schema: "auth",
    table: "users"
  },
  port: 3001,
  roles: {
    anonymous: "web_anon",
    user: "normal_user"
  }
};

// Merge config file
if (argv.config || argv.c) {
  _.merge(config, require(path.resolve(process.cwd(), argv.config || argv.c)));
} else if (fs.existsSync(path.resolve(process.cwd(), "postgrest-auth.json"))) {
  _.merge(config, require(path.resolve(process.cwd(), "postgrest-auth.json")));
}

if (argv.app || argv.A) {
  config.app_name = argv.app || argv.a;
}

if (argv.connection || argv.C) {
  config.db.connection_string = argv.connection || argv.C;
}

if (argv.schema || argv.s) {
  config.db.schema = argv.schema || argv.s;
}

if (argv.table || argv.t) {
  config.db.table = argv.db.table || argv.t;
}

if (argv.expire || argv.exp || argv.e) {
  config.payload.exp = argv.expire || argv.exp || argv.e;
}

if (argv.issuer || argv.iss || argv.i) {
  config.payload.iss = argv.issuer || argv.iss || argv.i;
}

if (argv.secret || argv.S) {
  config.secret = argv.secret || argv.S;
}

if (argv.port || argv.p || process.env.PORT) {
  config.port = argv.port || argv.p || process.env.PORT;
}

module.exports = config;
