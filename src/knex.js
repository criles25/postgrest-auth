const config = require("../config/config");

const knex = require("knex")({
  client: "postgresql",
  connection: config.db.connection_string || config.db.connection,
  pool: config.db.pool
});

module.exports = knex;
