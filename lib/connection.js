'use strict';

const Operator = require('./operator');
const promisify = require('pify');

class RDSConnection extends Operator {
  constructor(config, conn) {
    super(config);
    this.conn = conn;
    if (!conn._wrapToRDS) {
      [
        'release',
        'query',
        'beginTransaction',
        'commit',
        'rollback',
      ].forEach(key => {
        this.conn[key] = promisify(this.conn[key]);
      });
      conn._wrapToRDS = true;
    }
  }

  release() {
    this.conn.release();
  }

  _query(sql) {
    return this.conn.query(sql);
  }

  beginTransaction() {
    return this.conn.beginTransaction();
  }

  _commit() {
    return this.conn.commit();
  }

  _rollback() {
    return this.conn.rollback();
  }
}

module.exports = RDSConnection;
