'use strict';

const assert = require('assert');
const rds = require('./client');

let count = 0;

module.exports = app => {
  app.addSingleton('mysql', createClient);
};

function createClient(config, app) {
  assert(config.host && config.port && config.user && config.database,
    `[egg-cute-mysql] 'host: ${config.host}', 'port: ${config.port}', 'user: ${config.user}', 'database: ${config.database}' are required on config`);

  app.coreLogger.info('[egg-cute-mysql] connecting %s@%s:%s/%s',
    config.user, config.host, config.port, config.database);
  const client = new rds(config);

  app.beforeStart(async () => {
    const rows = await client.query('select now() as currentTime;');
    const index = count++;
    app.coreLogger.info(`[egg-cute-mysql] instance[${index}] status OK, rds currentTime: ${rows[0].currentTime}`);
  });
  return client;
}
