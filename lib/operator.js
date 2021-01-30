'use strict';

const SqlString = require('./sqlstring');
const literals = require('./literal');

const toCamelCase = Symbol('toCamelCase');
const camelCaseObjectKeys = Symbol('camelCaseObjectKeys');

class Operator {
  constructor(config) {
    this.isCamelCase = config.hasOwnProperty('isCamelCase') ? config.isCamelCase : true;
    if (config.hasOwnProperty('isCamelCase')) { delete config.isCamelCase; }
  }

  [toCamelCase](str) {
    return str.replace(/_(\w)/g, (all, letter) => letter.toUpperCase());
  }

  [camelCaseObjectKeys](data) {
    if (!data && typeof data !== 'object') {
      return data;
    }

    const res = {};
    for (const [k, v] of Object.entries(data)) {
      res[this[toCamelCase](k)] = v;
    }

    return res;
  }
  
  literals = literals;

  escape(value, stringifyObjects, timeZone) {
    return SqlString.escape(value, stringifyObjects, timeZone);
  }

  escapeId(value, forbidQualified) {
    return SqlString.escapeId(value, forbidQualified);
  }
  
  format(sql, values, stringifyObjects, timeZone) {
    const that = this;
    // if values is object, not null, not Array;
    if (!Array.isArray(values) && typeof values === 'object' && values !== null) {
      // object not support replace column like ??;
      return sql.replace(/\:(\w+_?)+/g, (txt, key) => {
        if (values.hasOwnProperty(key)) {
          return SqlString.escape(values[key]);
        }
        if (values.hasOwnProperty(key) || values.hasOwnProperty(that[toCamelCase](key))) {
          return SqlString.escape(values[key] || values[that[toCamelCase](key)]);
        }
        // if values don't hasOwnProperty, return origin txt;
        return txt;
      });
    }
    return SqlString.format(sql, values, stringifyObjects, timeZone);
  };

  async query(sql, values) {
    if (arguments.length >= 2) {
      sql = this.format(sql, values);
    }
    try {
      const rows = await this._query(sql);
      return rows;
    } catch (err) {
      err.stack = `${err.stack}\n    sql: ${sql}`;
      throw err;
    }
  }

  async _query(/* sql */) {
    throw new Error('SubClass must impl this');
  }

  order(orders) {
    if (!orders) {
      return '';
    }
    if (typeof orders === 'string') {
      orders = [ orders ];
    }
    const values = [];
    for (let i = 0; i < orders.length; i++) {
      const value = orders[i];
      if (typeof value === 'string') {
        values.push(this.escapeId(value));
      } else if (Array.isArray(value)) {
        // value format: ['name', 'desc'], ['name'], ['name', 'asc']
        let sort = String(value[1]).toUpperCase();
        if (sort !== 'ASC' && sort !== 'DESC') {
          sort = null;
        }
        if (sort) {
          values.push(this.escapeId(value[0]) + ' ' + sort);
        } else {
          values.push(this.escapeId(value[0]));
        }
      }
    }
    return ` order by ${values.join(', ')}`;
  }

  limit(pageSize, offset) {
    if (!pageSize || typeof pageSize !== 'number') {
      return '';
    }
    if (typeof offset !== 'number') {
      offset = 0;
    }
    return ` limit ${offset}, ${pageSize}`;
  }

  async count(sql, values) {
    const sqlQuery = this.format(`select count(1) as count from (${sql}) sqltotal`, values);
    const rows = await this.query(sqlQuery);
    const result = (rows && rows.length > 0) ? rows[0] : undefined;
    return result ? result.count : 0;
  }

  async info(sql, values) {
    const sqlQuery = this.format(`${sql} limit 1`, values);
    const rows = await this.query(sqlQuery);
    const result = (rows && rows.length > 0) ? rows[0] : undefined;
    return this.isCamelCase ? this[camelCaseObjectKeys](result) : result;
  }

  async list(sql, values) {
    const sqlQuery = this.format(sql, values);
    const rows = await this.query(sqlQuery);
    return this.isCamelCase ? rows.map(m => this[camelCaseObjectKeys](m)) : rows;
  };

  async insert(sql, values) {
    sql = String(sql).toLocaleLowerCase();
    let sqlQuery = sql;
    if (Array.isArray(values)) {
      // insert into user(id, name) values 
      sqlQuery = sql.substr(0, sql.indexOf(' values ') + ' values '.length);
      // (:id, :name)
      const strValues = sql.replace(sqlQuery, '');
      // insert into user(id, name) values (1, 'name1'), (2, 'name2'), (3, 'name3')
      sqlQuery = sqlQuery + values.map(m => this.format(strValues, m)).join(', ');
    } else {
      sqlQuery = this.format(sql, values);
    }
    console.debug('insert, %j, %j \n=> %j', sql, values, sqlQuery);

    const result = await this.query(sqlQuery);
    console.log(result); // ?
    return (result && result.hasOwnProperty('insertId')) ? result.insertId : 0;
  }

  async update(sql, values) {
    const sqlQuery = this.format(sql, values);
    const result = await this.query(sqlQuery);
    return (result && result.hasOwnProperty('changedRows')) ? result.changedRows : 0;
  }

  async delete(sql, values) {
    const sqlQuery = this.format(sql, values);
    const result = await this.query(sqlQuery);
    return (result && result.hasOwnProperty('affectedRows')) ? result.affectedRows : 0;
  }

  async page(sql, values, countSql = '') {
    const sqlLimit = (values && values.hasOwnProperty('page') && !values.page) ? '' : this.limit(values.pageSize, values.offset);
    const [total, rows] = await Promise.all([
      this.count(countSql ? countSql : sql, values),
      this.list((sql + sqlLimit), values),
    ]);
    return { total, rows: rows || [] };
  }
}

module.exports = Operator;
