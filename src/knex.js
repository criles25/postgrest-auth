const config = require("../config/config");

const knex = require("knex")({
  client: "postgresql",
  connection: config.connection_string || config.connection,
  pool: config.connection_pool
});

module.exports = knex;
