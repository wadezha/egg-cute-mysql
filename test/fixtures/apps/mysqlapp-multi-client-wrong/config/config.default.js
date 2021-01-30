'use strict';

exports.mysql = {
  clients: {
    db1: {
      host: '127.0.0.1',
      port: 3306,
      user: 'root',
      password: '123',
      database: 'test',
    }, 
    db2: {
      host: '127.0.0.1',
      port: 3306,
      user: 'root',
      password: 'wrong',
      database: 'test',
    },
    db3: {
      host: '127.0.0.1',
      port: 3306,
      user: 'root',
      password: '',
      database: 'test',
    }
  },
  agent: true,
};

exports.keys = 'foo';
