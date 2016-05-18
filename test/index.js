'use strict';

// Load modules

const Stream = require('stream');
const Util = require('util');
const Code = require('code');
const Hoek = require('hoek');
const Lab = require('lab');
const Moment = require('moment');
const Stringify = require('fast-safe-stringify');
const Rewire = require('rewire');
const GoodSlack = Rewire('..');


// Declare internals

const internals = {
    defaults: {
        format: 'YYMMDD/HHmmss.SSS'
    }
};


internals.config = {
    url: 'https://hooks.slack.com'
};


internals.readStream = () => {

    const result = new Stream.Readable({ objectMode: true });
    result._read = Hoek.ignore;
    return result;
};


internals.ops = {
    event: 'ops',
    timestamp: 1411583264547,
    os: {
        load: [1.650390625, 1.6162109375, 1.65234375],
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


internals.request = {
    event: 'request',
    timestamp: Date.now(),
    tags: ['info'],
    path: '/data',
    method: 'post',
    data: 'This is a request log',
    pid: '10001',
    id: '23147901234:Machine1:73489:8uasdf98:10000'
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

const lab = exports.lab = Lab.script();
const expect = Code.expect;
const before = lab.before;
const beforeEach = lab.beforeEach;
const afterEach = lab.afterEach;
const describe = lab.describe;
const it = lab.it;


it('can be created with new', (done) => {

    const reporter = new GoodSlack(null, internals.config);
    expect(reporter).to.exist();

    done();
});

it('can be created without new', (done) => {

    const reporter = GoodSlack(null, internals.config);
    expect(reporter).to.exist();

    done();
});

it('throws an error if no config is passed', (done) => {

    expect(() => new GoodSlack(null)).to.throw('url must be a string');
    done();
});

it('throws an error if missing url', (done) => {

    expect(() => {

        const config = Hoek.clone(internals.config);
        delete config.url;

        new GoodSlack(null, config);
    }).to.throw('url must be a string');

    done();
});

it('applies config to defaults', (done) => {

    const config = Hoek.applyToDefaults(internals.config, {
        slack: {
            username: 'testing-bot',
            channel: '#test'
        },
        format: 'lll'
    });

    const reporter = new GoodSlack(null, config);
    expect(reporter).to.exist();

    expect(reporter._config).to.deep.equal({
        url: 'https://hooks.slack.com',
        slack: {
            username: 'testing-bot',
            channel: '#test'
        },
        format: 'lll'
    });

    done();
});

it('wraps json payload in markdown code format', (done) => {

    const codeFormat = GoodSlack.__get__('internals.codeFormat');

    const data = Stringify({ foo: 'bar', bar: 'baz' }, null, 2);
    const response = Util.format('```\n%s\n```', data);

    expect(response).to.equal(codeFormat(data));

    done();
});

describe('_report()', () => {

    let revert;
    let stream;
    const now = Date.now();
    const timeString = Moment.utc(now).format(internals.defaults.format);

    describe('_send()', () => {

        before((done) => {

            GoodSlack.__set__('internals.host', 'localhost');
            done();
        });

        beforeEach((done) => {

            stream = internals.readStream();
            done();
        });

        afterEach((done) => {

            revert();
            done();
        });

        it('sends message on "response" event on success', (done) => {

            const reporter = new GoodSlack({ response: '*' }, internals.config);
            const event = Hoek.clone(internals.response);

            event.timestamp = now;

            reporter.init(stream, null, (err) => {

                expect(err).to.not.exist();
                stream.push(event);
            });

            const data = Stringify({
                attachments: [{
                    pretext: '`response` event from *localhost* at ' + timeString,
                    'mrkdwn_in': ['pretext','text','fields'],
                    fallback: '200 POST /data',
                    color: 'good',
                    text: '*POST* /data {"name":"diego"} 200 (150ms)'
                }]
            });

            const request = (method, uri, options) => {

                expect(method).to.equal('post');
                expect(uri).to.equal(internals.config.url);
                expect(options.payload).to.deep.equal(data);
                done();
            };
            revert = GoodSlack.__set__('Wreck', { request });
        });

        it('sends message on "request" event with object', (done) => {

            const reporter = new GoodSlack({ request: '*' }, internals.config);
            const event = Hoek.clone(internals.request);

            event.timestamp = now;
            event.data = { name: 'diego' };
            const reqPayload = Stringify({ name: 'diego' }, null, 2);
            const reqPayloadFallback = Stringify({ name: 'diego' });

            reporter.init(stream, null, (err) => {

                expect(err).to.not.exist();
                stream.push(event);
            });

            const data = Stringify({
                attachments: [{
                    pretext: '`request` event from *localhost* at ' + timeString,
                    'mrkdwn_in': ['pretext','text','fields'],
                    fallback: Util.format('info %s', reqPayloadFallback),
                    text: '*POST* /data',
                    fields: [{
                        title: 'PID',
                        value: '10001'
                    }, {
                        title: 'Request ID',
                        value: '23147901234:Machine1:73489:8uasdf98:10000'
                    }, {
                        title: 'Tags',
                        value: 'info'
                    }, {
                        title: 'Data',
                        value: Util.format('```\n%s\n```', reqPayload)
                    }]
                }]
            });

            const request = (method, uri, options) => {

                expect(method).to.equal('post');
                expect(uri).to.equal(internals.config.url);
                expect(options.payload).to.deep.equal(data);
                done();
            };
            revert = GoodSlack.__set__('Wreck', { request });
        });

        it('sends message on "request" event on error', (done) => {

            const reporter = new GoodSlack({ request: '*' }, internals.config);
            const event = Hoek.clone(internals.request);

            event.tags = ['error'];
            event.timestamp = now;

            reporter.init(stream, null, (err) => {

                expect(err).to.not.exist();
                stream.push(event);
            });

            const data = Stringify({
                attachments: [{
                    pretext: '`request` event from *localhost* at ' + timeString,
                    'mrkdwn_in': ['pretext','text','fields'],
                    fallback: 'error This is a request log',
                    text: '*POST* /data',
                    color: 'danger',
                    fields: [{
                        title: 'PID',
                        value: '10001'
                    }, {
                        title: 'Request ID',
                        value: '23147901234:Machine1:73489:8uasdf98:10000'
                    }, {
                        title: 'Tags',
                        value: 'error'
                    }, {
                        title: 'Data',
                        value: 'This is a request log'
                    }]
                }]
            });

            const request = (method, uri, options) => {

                expect(method).to.equal('post');
                expect(uri).to.equal(internals.config.url);
                expect(options.payload).to.deep.equal(data);
                done();
            };
            revert = GoodSlack.__set__('Wreck', { request });
        });

        it('sends message on "response" event on error', (done) => {

            const reporter = new GoodSlack({ response: '*' }, internals.config);
            const event = Hoek.clone(internals.response);

            event.timestamp = now;
            event.statusCode = 404;

            reporter.init(stream, null, (err) => {

                expect(err).to.not.exist();
                stream.push(event);
            });

            const data = Stringify({
                attachments: [{
                    pretext: '`response` event from *localhost* at ' + timeString,
                    'mrkdwn_in': ['pretext','text','fields'],
                    fallback: '404 POST /data',
                    color: 'danger',
                    text: '*POST* /data {"name":"diego"} 404 (150ms)'
                }]
            });

            const request = (method, uri, options) => {

                expect(method).to.equal('post');
                expect(uri).to.equal(internals.config.url);
                expect(options.payload).to.deep.equal(data);
                done();
            };
            revert = GoodSlack.__set__('Wreck', { request });
        });

        it('sends message on "ops" event', (done) => {

            const reporter = new GoodSlack({ ops: '*' }, internals.config);

            internals.ops.timestamp = now;

            reporter.init(stream, null, (err) => {

                expect(err).to.not.exist();
                stream.push(internals.ops);
            });

            const data = Stringify({
                attachments: [{
                    pretext: '`ops` event from *localhost* at ' + timeString,
                    'mrkdwn_in': ['pretext','text','fields'],
                    fallback: 'L: 1.62 | M: 29 Mb. | U: 6',
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
                        value: '1.65 | 1.62 | 1.65',
                        short: true
                    }]
                }]
            });

            const request = (method, uri, options) => {

                expect(method).to.equal('post');
                expect(uri).to.equal(internals.config.url);
                expect(options.payload).to.deep.equal(data);
                done();
            };
            revert = GoodSlack.__set__('Wreck', { request });
        });

        it('sends message on "error" event', (done) => {

            const reporter = new GoodSlack({ error: '*' }, internals.config);
            const event = Hoek.clone(internals.error);
            const error = new Error('Something bad had happened');

            error.stack = 'Error: Something bad had happened\n' +
                '    at Object.<anonymous> (/good-slack/test/index.js:79:10)';

            event.timestamp = now;
            event.error = error;

            reporter.init(stream, null, (err) => {

                expect(err).to.not.exist();
                stream.push(event);
            });

            const data = Stringify({
                attachments: [{
                    pretext: '`error` event from *localhost* at ' + timeString,
                    'mrkdwn_in': ['pretext','text','fields'],
                    fallback: 'Error: Something bad had happened',
                    text: '*GET* /search?name=diego',
                    color: 'danger',
                    fields:[{
                        title: 'Error',
                        value: 'Error: Something bad had happened'
                    },{
                        title: 'Stack',
                        value: Util.format('```\n%s\n```', error.stack)
                    }]
                }]
            });

            const request = (method, uri, options) => {

                expect(method).to.equal('post');
                expect(uri).to.equal(internals.config.url);
                expect(options.payload).to.deep.equal(data);
                done();
            };
            revert = GoodSlack.__set__('Wreck', { request });
        });

        it('sends message on "log" string event', (done) => {

            const reporter = new GoodSlack({ log: '*' }, internals.config);
            const event = Hoek.clone(internals.log);

            event.timestamp = now;

            reporter.init(stream, null, (err) => {

                expect(err).to.not.exist();
                stream.push(event);
            });

            const data = Stringify({
                attachments: [{
                    pretext: '`log` event from *localhost* at ' + timeString,
                    'mrkdwn_in': ['pretext','text','fields'],
                    fallback: 'info Server started at http://localhost:3000',
                    fields: [{
                        title: 'Tags',
                        value: 'info'
                    }, {
                        title: 'Data',
                        value: 'Server started at http://localhost:3000'
                    }]
                }]
            });

            const request = (method, uri, options) => {

                expect(method).to.equal('post');
                expect(uri).to.equal(internals.config.url);
                expect(options.payload).to.deep.equal(data);
                done();
            };
            revert = GoodSlack.__set__('Wreck', { request });
        });

        it('sends message on "log" object event', (done) => {

            const reporter = new GoodSlack({ log: '*' }, internals.config);
            const event = Hoek.clone(internals.log);

            event.timestamp = now;
            event.data = { foo: 'bar', baz: 'foo' };

            reporter.init(stream, null, (err) => {

                expect(err).to.not.exist();
                stream.push(event);
            });

            const payload = Stringify(event.data, null, 2);
            const payloadFallback = Stringify(event.data);

            const data = Stringify({
                attachments: [{
                    pretext: '`log` event from *localhost* at ' + timeString,
                    'mrkdwn_in': ['pretext','text','fields'],
                    fallback: Util.format('info %s', payloadFallback),
                    fields: [{
                        title: 'Tags',
                        value: 'info'
                    }, {
                        title: 'Data',
                        value: Util.format('```\n%s\n```', payload)
                    }]
                }]
            });

            const request = (method, uri, options) => {

                expect(method).to.equal('post');
                expect(uri).to.equal(internals.config.url);
                expect(options.payload).to.deep.equal(data);
                done();
            };
            revert = GoodSlack.__set__('Wreck', { request });
        });

        it('sends message on "log" event without tags', (done) => {

            const reporter = new GoodSlack({ log: '*' }, internals.config);
            const event = Hoek.clone(internals.log);

            delete event.tags;

            event.timestamp = now;

            reporter.init(stream, null, (err) => {

                expect(err).to.not.exist();
                stream.push(event);
            });

            const data = Stringify({
                attachments: [{
                    pretext: '`log` event from *localhost* at ' + timeString,
                    'mrkdwn_in': ['pretext','text','fields'],
                    fallback: 'Server started at http://localhost:3000',
                    fields: [{
                        title: 'Tags',
                        value: ''
                    }, {
                        title: 'Data',
                        value: 'Server started at http://localhost:3000'
                    }]
                }]
            });

            const request = (method, uri, options) => {

                expect(method).to.equal('post');
                expect(uri).to.equal(internals.config.url);
                expect(options.payload).to.deep.equal(data);
                done();
            };
            revert = GoodSlack.__set__('Wreck', { request });
        });

        it('sends one message per event', (done) => {

            const reporter = new GoodSlack({ response: '*' }, internals.config);
            const event = Hoek.clone(internals.response);

            event.timestamp = now;
            event.statusCode = 404;

            reporter.init(stream, null, (err) => {

                expect(err).to.not.exist();
                stream.push(event);
                stream.push(event);
            });

            const data = Stringify({
                attachments: [{
                    pretext: '`response` event from *localhost* at ' + timeString,
                    'mrkdwn_in': ['pretext','text','fields'],
                    fallback: '404 POST /data',
                    color: 'danger',
                    text: '*POST* /data {"name":"diego"} 404 (150ms)'
                }]
            });

            let calledOnce = false;

            const request = (method, uri, options) => {

                expect(method).to.equal('post');
                expect(uri).to.equal(internals.config.url);
                expect(options.payload).to.deep.equal(data);

                if (calledOnce) {
                    return done();
                }
                calledOnce = true;
            };
            revert = GoodSlack.__set__('Wreck', { request });
        });
    });
});
