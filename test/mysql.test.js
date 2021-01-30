'use strict';

const assert = require('assert');
const request = require('supertest');
const mock = require('egg-mock');
const utility = require('utility');
const path = require('path');
const fs = require('fs');

describe('test/mysql.test.js', function() {
  let app;
  const uid = utility.randomString();

  before(() => {
    app = mock.app({
      baseDir: 'apps/mysqlapp',
    });
    return app.ready();
  });

  beforeEach(function* () {
    // init test datas
    try {
      yield app.mysql.query(`insert into npm_auth set user_id = 'egg-${uid}-1', password = '1'`);
      yield app.mysql.query(`insert into npm_auth set user_id = 'egg-${uid}-2', password = '2'`);
      yield app.mysql.query(`insert into npm_auth set user_id = 'egg-${uid}-3', password = '3'`);
      yield app.mysql.info(`select * from npm_auth where user_id = 'egg-${uid}-3'`);
    } catch (err) {
      console.log('init test datas error: %s', err);
    }
  });

  afterEach(function* () {
    // 清空测试数据
    yield app.mysql.query(`delete from npm_auth where user_id like 'egg-${uid}%'`);
  });

  after(done => {
    app.mysql.end(err => {
      app.close();
      done(err);
    });
  });

  afterEach(mock.restore);

  it('should query mysql user table success', () => {
    return request(app.callback())
      .get('/')
      .expect(200);
  });

  it('should query limit 2', function* () {
    const users = yield app.mysql.query('select * from npm_auth order by id desc limit 2');
    assert(users.length === 2);
    const rows = yield app.mysql.list(`select * from npm_auth ${app.mysql.order([[ 'id', 'desc' ]])} limit :limit`, {
      limit: 2
    });
    assert(rows.length === 2);
    assert.deepEqual(rows[0].id, users[0].id);
    assert.deepEqual(rows[1].id, users[1].id);
  });

  it('should update successfully', function* () {
    const user = yield app.mysql.info('select * from npm_auth order by id desc');
    const result = yield app.mysql.update('update npm_auth set user_id=:user_id where id=:id', { id: user.id, userId: `79744-${uid}-update` });
    assert(result === 1);
  });

  it('should delete successfully', function* () {
    const user = yield app.mysql.info('select * from npm_auth order by id desc');
    const result = yield app.mysql.delete('delete from npm_auth where id=:id', { id: user.id });
    assert(result === 1);
  });

  it('should query one success', function* () {
    const user = yield app.mysql.info('select * from npm_auth order by id desc');
    assert(user);
    assert(typeof user.userId === 'string' && user.userId);

    const row = yield app.mysql.info('select * from npm_auth where user_id=:user_id', { userId: user.userId });
    assert(row.id === user.id);
  });

  it('should query one desc is NULL success', function* () {
    const user = yield app.mysql.info('select * from npm_auth where `desc` is NULL');
    assert(user);
    assert(typeof user.userId === 'string' && user.userId);

    const row = yield app.mysql.info('select * from npm_auth where `desc` is :desc', { desc: null });
    assert(row.id === user.id);
  });

  it('should query one not exists return null', function* () {
    let user = yield app.mysql.info('select * from npm_auth where id = -1');
    assert(!user);

    user = yield app.mysql.info('select * from npm_auth where id=:id', { id: -1 });
    assert(!user);
  });

  it('should escape value', () => {
    const val = app.mysql.escape('\'"?><=!@#');
    assert(val === '\'\\\'\\"?><=!@#\'');
  });

  it('should info work on transaction', function* () {
    const result = yield app.mysql.beginTransactionScope(async (conn) => {
      const row = await conn.info('select * from npm_auth order by id desc');
      return { row };
    }, {});
    assert(result.row);
    assert(result.row.userId && typeof result.row.userId === 'string');
    assert(result.row.password === '3');
  });


  it('should agent error when password wrong on multi clients', done => {
    const app2 = mock.app({
      baseDir: 'apps/mysqlapp-multi-client-wrong',
    });
    app2.ready(err => {
      console.log(err)
      if (err) {
        assert(err.message.includes('ER_ACCESS_DENIED_ERROR'));
      }
      
      done();
    });
  });

  describe('config.mysql.app = false', () => {
    it('should agent.mysql work', () => {
      const result = fs.readFileSync(path.join(__dirname,
        './fixtures/apps/mysqlapp/run/agent_result.json'), 'utf8');
      assert(/\[\{"currentTime":"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z"\}\]/.test(result));
    });
  });

  describe('config.mysql.app = false', () => {
    let app;
    before(function() {
      app = mock.app({
        baseDir: 'apps/mysqlapp-disable',
        plugin: 'mysql',
      });
      return app.ready();
    });
    after(() => app.close());

    it('should disable app work', () => {
      assert(!app.mysql);
    });
  });

  describe('newConfig', () => {
    let app;
    before(function() {
      app = mock.cluster({
        baseDir: 'apps/mysqlapp-new',
        plugin: 'mysql',
      });
      return app.ready();
    });

    after(() => app.close());

    it('should new config agent.mysql work', () => {
      const result = fs.readFileSync(path.join(__dirname,
        './fixtures/apps/mysqlapp-new/run/agent_result.json'), 'utf8');
      assert(/\[\{"currentTime":"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z"\}\]/.test(result));
    });

    it('should query mysql user table success', () => {
      return request(app.callback())
        .get('/')
        .expect(200);
    });
  });

  describe('createInstance', () => {
    let app;
    before(function() {
      app = mock.cluster({
        baseDir: 'apps/mysqlapp-dynamic',
        plugin: 'mysql',
      });
      return app.ready();
    });

    after(() => app.close());

    it('should new config agent.mysql work', () => {
      const result = fs.readFileSync(path.join(__dirname,
        './fixtures/apps/mysqlapp-dynamic/run/agent_result.json'), 'utf8');
      assert(/\[\{"currentTime":"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z"\}\]/.test(result));
    });

    it('should query mysql user table success', () => {
      return request(app.callback())
        .get('/')
        .expect(200);
    });
  });
});
