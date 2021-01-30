'use strict';

exports.list = function* (ctx) {

  return yield [
    ctx.app.mysql.get('db1').query('select * from npm_auth'),
    ctx.app.mysql.get('db2').query('select * from npm_auth'),
    ctx.app.mysql.get('db3').query('select * from npm_auth'),
  ];
};
