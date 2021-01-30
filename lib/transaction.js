'use strict';

const Operator = require('./operator');

class RDSTransaction extends Operator {
  constructor(config, conn) {
    super(config);
    this.conn = conn;
  }

  async commit() {
    this._check();
    try {
      return await this.conn._commit();
    } finally {
      await this.conn.release();
      this.conn = null;
    }
  }

  async rollback() {
    this._check();
    try {
      return await this.conn._rollback();
    } finally {
      await this.conn.release();
      this.conn = null;
    }
  }

  async _query(sql) {
    this._check();
    return await this.conn._query(sql);
  }

  _check() {
    if (!this.conn) {
      throw new Error('transaction was commit or rollback');
    }
  }
}

module.exports = RDSTransaction;
