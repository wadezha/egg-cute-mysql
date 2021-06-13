# egg-cute-mysql

Refer to [ali-rds], [egg-mysql]

## Install

```bash
$ npm i egg-cute-mysql --save
```

MySQL Plugin for egg, support egg application access to MySQL database.

## Configuration

Change `${app_root}/config/plugin.js` to enable MySQL plugin:

```js
exports.mysql = {
  enable: true,
  package: 'egg-cute-mysql',
};
```

Configure database information in `${app_root}/config/config.default.js`:

### Simple database instance

```js
exports.mysql = {
  // database configuration
  client: {
    // host
    host: '127.0.0.1',
    // port
    port: '3306',
    // username
    user: 'user',
    // password
    password: 'password',
    // database
    database: 'test',

    size: 20,
    // Camelcase,Underline
    selectKey: 'Camelcase',
  },
  // load into app, default is open
  app: true,
  // load into agent, default is close
  agent: false,
};
```

Usage:

```js
app.mysql.query(sql, values); // you can access to simple database instance by using app.mysql.
```


### Multiple database instance

```js
exports.mysql = {
  clients: {
    // clientId, access the client instance by app.mysql.get('clientId')
    db1: {
      // host
    host: '127.0.0.1',
      // port
      port: '3306',
      // username
      user: 'user',
      // password
      password: 'password',
      // database
      database: 'test',
    },
    // ...
  },
  // default configuration for all databases
  default: {

  },

  // load into app, default is open
  app: true,
  // load into agent, default is close
  agent: false,
};
```

Usage:

```js
const client1 = app.mysql.get('db1');
client1.query(sql, values);

const client2 = app.mysql.get('db2');
client2.query(sql, values);
```

## CRUD user guide

### Create

```js
// insert
const result = await app.mysql.insert('insert into posts(title) value(:title)', { title: 'Hello World' });
const insertSuccess = !result.insertId;
```

### Read

```js
// get
const post = await app.mysql.info('select * from posts where id=:id', { id: 12 });
// query
const results = await app.mysql.list(`select * from posts ${app.mysql.order([['created_at','desc'], ['id','desc']])} limit :limit`,{
  limit: 2
});

const results = await app.mysql.page('select * from posts',{
  size: 10,
  pageNum: 1,
});
```

### Update

```js
// update by primary key ID, and refresh
const row = {
  id: 123,
  name: 'fengmk2',
  otherField: 'other field value',
  modifiedAt: app.mysql.literals.now, // `now()` on db server
};
const result = await app.mysql.update('update posts set name=:name,other_field=:other_field,modified_at=:modified_at where id=:id', row);
const updateSuccess = result.changedRows === 1;
```

### Delete

```js
const result = await app.mysql.delete('delete from posts where name=:name', {
  name: 'fengmk2'
});
```

## Transaction

### Manual control

- adventage: ```beginTransaction```, ```commit``` or ```rollback``` can be completely under control by developer
- disadventage: more handwritten code, Forgot catching error or cleanup will lead to serious bug.

```js
const conn = await app.mysql.beginTransaction();

try {
  await conn.insert(sql, values);
  await conn.update(sql, values);
  await conn.commit();
} catch (err) {
  // error, rollback
  yield conn.rollback(); // rollback call won't throw err
  throw err;
}
```

###  Automatic control: Transaction with scope

- API：`*beginTransactionScope(scope, ctx)`
  - `scope`: A generatorFunction which will execute all sqls of this transaction.
  - `ctx`: The context object of current request, it will ensures that even in the case of a nested transaction, there is only one active transaction in a request at the same time.
- adventage: easy to use, as if there is no transaction in your code.
- disadvantage: all transation will be successful or failed, cannot control precisely

```js
const result = await app.mysql.beginTransactionScope(async (conn) => {
  // don't commit or rollback by yourself
  await conn.insert(sql, values);
  await conn.update(sql, values);
  return { success: true };
}, ctx); // ctx is the context of current request, access by `this.ctx`.
// if error throw on scope, will auto rollback
```

### Literal

If you want to call literals or functions in mysql , you can use `Literal`.

#### Inner Literal
- NOW(): The database system time, you can obtain by `app.mysql.literals.now`.

```js
await app.mysql.insert(sql, {
  create_time: app.mysql.literals.now
});

// INSERT INTO table(`create_time`) VALUES(NOW())
```

#### Custom literal

The following demo showed how to call `CONCAT(s1, ...sn)` funtion in mysql to do string splicing.

```js
const Literal = app.mysql.literals.Literal;
const first = 'James';
const last = 'Bond';
await app.mysql.insert(sql, {
  id: 123,
  fullname: new Literal(`CONCAT("${first}", "${last}"`),
});

// INSERT INTO table(`id`, `fullname`) VALUES(123, CONCAT("James", "Bond"))
```

## Questions & Suggestions

Please open an issue [here](https://github.com/eggjs/egg/issues).

## License

[MIT](LICENSE)
