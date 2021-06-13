# egg-cute-mysql

MySQL 插件是为 egg 提供 MySQL 数据库访问的功能

此插件参考 [ali-rds], [egg-mysql]

## 安装

```bash
$ npm i egg-cute-mysql --save
```

## 配置

通过 `config/plugin.js` 配置启动 MySQL 插件:

```js
exports.mysql = {
  enable: true,
  package: 'egg-cute-mysql',
};
```

在 `config/config.${env}.js` 配置各个环境的数据库连接信息：

### 单数据源

```js
exports.mysql = {
  // 单数据库信息配置
  client: {
    // host
    host: '127.0.0.1',
    // 端口号
    port: '3306',
    // 用户名
    user: 'user',
    // 密码
    password: 'password',
    // 数据库名
    database: 'test',

    size: 20,
    // Camelcase,Underline
    selectKey: 'Camelcase',
  },
  // 是否加载到 app 上，默认开启
  app: true,
  // 是否加载到 agent 上，默认关闭
  agent: false,
};
```

使用方式：

```js
app.mysql.query(sql, values); // 单实例可以直接通过 app.mysql 访问
```

### 多数据源

```js
exports.mysql = {
  clients: {
    // clientId, 获取client实例，需要通过 app.mysql.get('clientId') 获取
    db1: {
      // host
    host: '127.0.0.1',
      // 端口号
      port: '3306',
      // 用户名
      user: 'user',
      // 密码
      password: 'password',
      // 数据库名
      database: 'test',
    },
    // ...
  },
  // 所有数据库配置的默认值
  default: {

  },

  // 是否加载到 app 上，默认开启
  app: true,
  // 是否加载到 agent 上，默认关闭
  agent: false,
};
```

使用方式：

```js
const client1 = app.mysql.get('db1');
client1.query(sql, values);

const client2 = app.mysql.get('db2');
client2.query(sql, values);
```

## 扩展

### app.js

#### app.mysql

如果开启了 `config.mysql.app = true`，则会在 app 上注入 客户端 的 [Singleton 单例](https://github.com/eggjs/egg/blob/master/lib/core/singleton.js)。

```js
app.mysql.query(sql);
app.mysql.get('db1').query(sql);
```

### agent.js

#### agent.mysql

如果开启了 `config.mysql.agent = true`，则会在 agent 上注入 客户端 的 [Singleton 单例](https://github.com/eggjs/egg/blob/master/lib/core/singleton.js)。

```js
agent.mysql.query(sql);
agent.mysql.get('db1').query(sql);
```

## CRUD 使用指南

### Create

```js
// 插入
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
// 修改数据，将会根据主键 ID 查找，并更新
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

## 事务

### 手动控制

- 优点：beginTransaction, commit 或 rollback 都由开发者来完全控制，可以做到非常细粒度的控制。
- 缺点：手写代码比较多，不是每个人都能写好。忘记了捕获异常和 cleanup 都会导致严重 bug。

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

### 自动控制：Transaction with scope

- API：`*beginTransactionScope(scope, ctx)`
  - `scope`: 一个 generatorFunction，在这个函数里面执行这次事务的所有 sql 语句。
  - `ctx`: 当前请求的上下文对象，传入 ctx 可以保证即便在出现事务嵌套的情况下，一次请求中同时只有一个激活状态的事务。
- 优点：使用简单，不容易犯错，就感觉事务不存在的样子。
- 缺点：整个事务要么成功，要么失败，无法做细粒度控制。

```js
const result = await app.mysql.beginTransactionScope(async (conn) => {
  // don't commit or rollback by yourself
  await conn.insert(sql, values);
  await conn.update(sql, values);
  return { success: true };
}, ctx); // ctx 是当前请求的上下文，如果是在 service 文件中，可以从 `this.ctx` 获取到
// if error throw on scope, will auto rollback
```

### 表达式(Literal)
如果需要调用mysql内置的函数（或表达式），可以使用`Literal`。

#### 内置表达式
- NOW(): 数据库当前系统时间，通过`app.mysql.literals.now`获取。

```js
await app.mysql.insert(sql, {
  create_time: app.mysql.literals.now
});

// INSERT INTO `$table`(`create_time`) VALUES(NOW())
```

#### 自定义表达式
下例展示了如何调用mysql内置的`CONCAT(s1, ...sn)`函数，做字符串拼接。

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
