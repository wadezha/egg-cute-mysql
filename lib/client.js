'use strict';

const mysql = require('mysql');
const promisify = require('pify');

const Operator = require('./operator');
const RDSConnection = require('./connection');
const RDSTransaction = require('./transaction');

class RDSClient extends Operator {

  static instance = null;
  constructor (config) {
    if(RDSClient.instance) {
      delete RDSClient.instance.createInstance;
      return RDSClient.instance;
    }
    super(config);
    this.config = config;
    this.pool = mysql.createPool(config);
    [
      'query',
      'getConnection',
      'end',
    ].forEach(method => {
      this.pool[method] = promisify(this.pool[method]);
    });
    return RDSClient.instance = this;
  }

  _query(sql) {
    return this.pool.query(sql);
  }

  async getConnection() {
    try {
      const conn = await this.pool.getConnection();
      return new RDSConnection(this.config, conn);
    } catch(err) {
      if (err.name === 'Error') {
        err.name = 'RDSClientGetConnectionError';
      }
      throw err;
    }
  }

  async beginTransaction() {
    const conn = await this.getConnection();
    try {
      await conn.beginTransaction();
    } catch (err) {
      await conn.release();
      throw err;
    }
  
    return new RDSTransaction(this.config, conn);
  }
  
  async beginTransactionScope(scope, ctx) {
    ctx = ctx || {};
    if (!ctx._transactionConnection) {
      ctx._transactionConnection = await this.beginTransaction();
      ctx._transactionScopeCount = 1;
    } else {
      ctx._transactionScopeCount++;
    }
    const tran = ctx._transactionConnection;
    try {
      const result = await scope(tran);
      ctx._transactionScopeCount--;
      if (ctx._transactionScopeCount === 0) {
        ctx._transactionConnection = null;
        await tran.commit();
      }
      return result;
    } catch (err) {
      if (ctx._transactionConnection) {
        ctx._transactionConnection = null;
        await tran.rollback();
      }
      throw err;
    }
  }

  async end(callback) {
    if (callback) {
      return await this.pool.end(callback);
    }
  
    await this.pool.end();
  }
}

module.exports = RDSClient;
