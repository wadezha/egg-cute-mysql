'use strict';

const SqlString = require('mysql/lib/protocol/SqlString');
const Literal = require('./literal').Literal;

module.exports = SqlString;

if (!SqlString.__escape) {
  SqlString.__escape = SqlString.escape;

  SqlString.escape = function(val, stringifyObjects, timeZone) {
    if (val instanceof Literal) {
      return val.toString();
    }
    return SqlString.__escape(val, stringifyObjects, timeZone);
  };
}
