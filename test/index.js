// Load modules

var EventEmitter = require('events').EventEmitter;
var Util = require('util');
var Code = require('code');
var Hoek = require('hoek');
var Lab = require('lab');
// var Boom = require('boom');
var Moment = require('moment');
var Stringify = require('json-stringify-safe');
var Sinon = require('sinon');
var Rewire = require('rewire');

// Declare internals

var internals = {
  defaults: {
    format: 'YYMMDD/HHmmss.SSS'
  }
};

internals.ops = {
  event: 'ops',
  timestamp: 1411583264547,
  os: {
    load: [ 1.650390625, 1.6162109375, 1.65234375 ],
    mem: { total: 17179869184, free: 8190681088 },
    uptime: 704891
  },
  proc: {
    uptime: 6,
    mem: {
      rss: 30019584,
      heapTotal: 18635008,
      heapUsed: 9989304
    },
    delay: 0.03084501624107361
  },
  load: { requests: {}, concurrents: {}, responseTimes: {} },
  pid: 64291
};

internals.response = {
  event: 'response',
  method: 'post',
  statusCode: 200,
  timestamp: Date.now(),
  instance: 'localhost',
  path: '/data',
  responseTime: 150,
  query: {
    name: 'diego'
  },
  responsePayload: {
    foo: 'bar',
    value: 1
  }
};

internals.error = {
  event: 'error',
  timestamp: 1418869888194,
  url: {
    protocol: null,
    slashes: null,
    auth: null,
    host: null,
    port: null,
    hostname: null,
    hash: null,
    search: '?name=diego',
    query: { name: 'diego' },
    pathname: '/search',
    path: '/search?name=diego',
    href: '/search?name=diego'
  },
  method: 'get',
  pid: 91426,
  error: new Error('Something bad had happened')
};

internals.log = {
  event: 'log',
  timestamp: 1418873719797,
  tags: ['info'],
  data: 'Server started at http://localhost:3000',
  pid: 92682
};

// Test shortcuts

var lab = exports.lab = Lab.script();
var expect = Code.expect;
var before = lab.before;
var after = lab.after;
var beforeEach = lab.beforeEach;
var afterEach = lab.afterEach;
var describe = lab.describe;
var it = lab.it;

describe('GoodSlack', function () {
  var GoodSlack = Rewire('../lib');

  it('throw an error is not constructed with new', function (done) {
    expect(function () {
      var reporter = GoodSlack();
    }).to.throw('GoodSlack must be created with new');

    done();
  });

  it('throws an error if missing channel', function (done) {
    expect(function () {
      var reporter = new GoodSlack();
    }).to.throw('channel must be a string');

    done();
  });

  it('throws an error if missing url', function (done) {
    expect(function () {
      var reporter = new GoodSlack(null, '#channel');
    }).to.throw('url must be a string');

    done();
  });

  it('does not throw an error with missing options', function (done) {
    var reporter = new GoodSlack(null, '#channel', 'https://hooks.slack.com');
    expect(reporter).to.exist();

    done();
  });

  it('set options to defaults', function (done) {
    var reporter = new GoodSlack(null, '#channel', 'https://hooks.slack.com', {
      slack: { username: 'testing-bot' },
      format: 'lll'
    });
    expect(reporter).to.exist();

    var settings = reporter._settings;
    expect(settings.slack).to.be.an.object();
    expect(settings.slack.username).to.equal('testing-bot');
    expect(settings.format).to.equal('lll');

    done();
  });

  it('wraps json payload in markdown code format', function (done) {
    var codeFormat = GoodSlack.__get__('internals.codeFormat');

    var data = Stringify({ foo: 'bar', bar: 'baz' }, null, 2);
    var response = Util.format('```\n%s\n```', data);

    expect(response).to.equal(codeFormat(data));

    done();
  });

  describe('_report()', function () {
    var revert;
    var spy;

    describe('_send()', function () {
      beforeEach(function (done) {
        spy = Sinon.spy();
        revert = GoodSlack.__set__('Wreck', { request: spy });
        done();
      });

      afterEach(function (done) {
        revert();
        done();
      });

      it('sends message on "response" event on success', function (done) {
        var reporter = new GoodSlack({ response: '*' }, '#channel',
          'https://hooks.slack.com');
        var now = Date.now();
        var timeString = Moment.utc(now).format(internals.defaults.format);
        var ee = new EventEmitter();

        internals.response.timestamp = now;

        reporter.start(ee, function (err) {
          expect(err).to.not.exist();
          ee.emit('report', 'response', internals.response);
        });

        var data = {
          payload: Stringify({
            attachments: [{
              pretext: '`response` event from *nakes.local* at ' + timeString,
              'mrkdwn_in': ['pretext','text','fields'],
              color: 'good',
              text: '*POST* /data {"name":"diego"} 200 (150ms)'
            }]
          })
        };

        Sinon.assert.calledOnce(spy);
        Sinon.assert.calledWith(spy, 'post', 'https://hooks.slack.com', data);

        done();
      });

      it('sends message on "response" event on error', function (done) {
        var reporter = new GoodSlack({ response: '*' }, '#channel',
          'https://hooks.slack.com');
        var now = Date.now();
        var timeString = Moment.utc(now).format(internals.defaults.format);
        var event = Hoek.clone(internals.response);
        var ee = new EventEmitter();

        event.timestamp = now;
        event.statusCode = 404;

        reporter.start(ee, function (err) {
          expect(err).to.not.exist();
          ee.emit('report', 'response', event);
        });

        var data = {
          payload: Stringify({
            attachments: [{
              pretext: '`response` event from *nakes.local* at ' + timeString,
              'mrkdwn_in': ['pretext','text','fields'],
              color: 'danger',
              text: '*POST* /data {"name":"diego"} 404 (150ms)'
            }]
          })
        };

        Sinon.assert.calledOnce(spy);
        Sinon.assert.calledWith(spy, 'post', 'https://hooks.slack.com', data);

        done();
      });

      it('sends message on "ops" event', function (done) {
        var reporter = new GoodSlack({ ops: '*' }, '#channel',
          'https://hooks.slack.com');
        var now = Date.now();
        var timeString = Moment.utc(now).format(internals.defaults.format);
        var ee = new EventEmitter();

        internals.ops.timestamp = now;

        reporter.start(ee, function (err) {
          expect(err).to.not.exist();
          ee.emit('report', 'ops', internals.ops);
        });

        var data = {
          payload: Stringify({
            attachments: [{
              pretext: '`ops` event from *nakes.local* at ' + timeString,
              'mrkdwn_in': ['pretext','text','fields'],
              fields: [{
                title: 'Memory',
                value:'29 Mb.',
                short: true
              }, {
                title: 'Uptime (seconds)',
                value: 6,
                short: true
              }, {
                title: 'Load',
                value: [1.650390625,1.6162109375,1.65234375],
                short: true
              }]
            }]
          })
        };

        Sinon.assert.calledOnce(spy);
        Sinon.assert.calledWith(spy, 'post', 'https://hooks.slack.com', data);

        done();
      });

      it('sends message on "error" event', function (done) {
        var reporter = new GoodSlack({ error: '*' }, '#channel',
          'https://hooks.slack.com');
        var now = Date.now();
        var timeString = Moment.utc(now).format(internals.defaults.format);
        var event = Hoek.clone(internals.response);
        var error = new Error('Something bad had happened');
        var ee = new EventEmitter();

        error.stack = 'Error: Something bad had happened\n' +
          '    at Object.<anonymous> (/good-slack/test/index.js:79:10)';

        event.timestamp = now;
        event.error = error;

        reporter.start(ee, function (err) {
          expect(err).to.not.exist();
          ee.emit('report', 'error', event);
        });

        var data = {
          payload: Stringify({
            attachments: [{
              pretext: '`error` event from *nakes.local* at ' + timeString,
              'mrkdwn_in': ['pretext','text','fields'],
              color: 'danger',
              fields:[{
                title: 'Error',
                value: 'Error: Something bad had happened'
              },{
                title: 'Stack',
                value: Util.format('```\n%s\n```', error.stack)
              }]
            }]
          })
        };

        Sinon.assert.calledOnce(spy);
        Sinon.assert.calledWith(spy, 'post', 'https://hooks.slack.com', data);

        done();
      });

      it('sends message on "log" string event', function (done) {
        var reporter = new GoodSlack({ log: '*' }, '#channel',
          'https://hooks.slack.com');
        var now = Date.now();
        var timeString = Moment.utc(now).format(internals.defaults.format);
        var event = Hoek.clone(internals.log);
        var ee = new EventEmitter();

        event.timestamp = now;

        reporter.start(ee, function (err) {
          expect(err).to.not.exist();
          ee.emit('report', 'log', event);
        });

        var data = {
          payload: Stringify({
            attachments: [{
              pretext: '`log` event from *nakes.local* at ' + timeString,
              'mrkdwn_in': ['pretext','text','fields'],
              fields: [{
                title: 'Tags',
                value: 'info'
              }, {
                title: 'Data',
                value: 'Server started at http://localhost:3000'
              }]
            }]
          })
        };

        Sinon.assert.calledOnce(spy);
        Sinon.assert.calledWith(spy, 'post', 'https://hooks.slack.com', data);

        done();
      });

      it('sends message on "log" object event', function (done) {
        var reporter = new GoodSlack({ log: '*' }, '#channel',
          'https://hooks.slack.com');
        var now = Date.now();
        var timeString = Moment.utc(now).format(internals.defaults.format);
        var event = Hoek.clone(internals.log);
        var ee = new EventEmitter();

        event.timestamp = now;
        event.data = { foo: 'bar', baz: 'foo' };

        reporter.start(ee, function (err) {
          expect(err).to.not.exist();
          ee.emit('report', 'log', event);
        });

        var payload = Stringify(event.data, null, 2);

        var data = {
          payload: Stringify({
            attachments: [{
              pretext: '`log` event from *nakes.local* at ' + timeString,
              'mrkdwn_in': ['pretext','text','fields'],
              fields: [{
                title: 'Tags',
                value: 'info'
              }, {
                title: 'Data',
                value: Util.format('```\n%s\n```', payload)
              }]
            }]
          })
        };

        Sinon.assert.calledOnce(spy);
        Sinon.assert.calledWith(spy, 'post', 'https://hooks.slack.com', data);

        done();
      });

      it('sends message on "log" event without tags', function (done) {
        var reporter = new GoodSlack({ log: '*' }, '#channel',
          'https://hooks.slack.com');
        var now = Date.now();
        var timeString = Moment.utc(now).format(internals.defaults.format);
        var event = Hoek.clone(internals.log);
        var ee = new EventEmitter();

        delete event.tags;

        event.timestamp = now;

        reporter.start(ee, function (err) {
          expect(err).to.not.exist();
          ee.emit('report', 'log', event);
        });

        var data = {
          payload: Stringify({
            attachments: [{
              pretext: '`log` event from *nakes.local* at ' + timeString,
              'mrkdwn_in': ['pretext','text','fields'],
              fields: [{
                title: 'Tags',
                value: ''
              }, {
                title: 'Data',
                value: 'Server started at http://localhost:3000'
              }]
            }]
          })
        };

        Sinon.assert.calledOnce(spy);
        Sinon.assert.calledWith(spy, 'post', 'https://hooks.slack.com', data);

        done();
      });

    });

  });
});
