'use strict';

// Load modules

const Util = require('util');
const Http = require('http');
const Stream = require('stream');
const Code = require('code');
const Hoek = require('hoek');
const Lab = require('lab');
const Moment = require('moment');
const Stringify = require('fast-safe-stringify');
const GoodSlack = require('..');


// Declare internals

const internals = {
    readStream() {

        const result = new Stream.Readable({ objectMode: true });
        result._read = () => { };
        return result;
    },

    getUri(server) {

        const address = server.address();
        return `http://${address.address}:${address.port}`;
    }
};


internals.events = {
    ops: {
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
    },

    response: {
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
    },

    request: {
        event: 'request',
        timestamp: Date.now(),
        tags: ['info'],
        path: '/data',
        method: 'post',
        data: 'This is a request log',
        pid: '10001',
        id: '23147901234:Machine1:73489:8uasdf98:10000'
    },

    error: {
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
    },

    log: {
        event: 'log',
        timestamp: 1418873719797,
        tags: ['info'],
        data: 'Server started at http://localhost',
        pid: 92682
    }
};


// Test shortcuts

const lab = exports.lab = Lab.script();
const expect = Code.expect;
const describe = lab.describe;
const it = lab.it;


it('has to be created with new', (done) => {

    const reporter = new GoodSlack({ url: 'localhost' });
    expect(reporter).to.exist();

    done();
});

it('throws an error if no config is passed', (done) => {

    expect(() => new GoodSlack()).to.throw('url must be a string');
    done();
});

it('throws an error if missing url', (done) => {

    expect(() => new GoodSlack({ })).to.throw('url must be a string');
    done();
});

it('applies config to defaults', (done) => {

    const config = {
        url: 'localhost',
        slack: {
            username: 'testing-bot',
            channel: '#test'
        },
        format: 'lll',
        host: 'localhost'
    };

    const reporter = new GoodSlack(config);
    expect(reporter).to.exist();

    expect(reporter._config).to.deep.equal(config);

    done();
});

describe('events', () => {

    const now = Date.now();
    const timestamp = Moment.utc(now).format('YYMMDD/HHmmss.SSS');

    it('sends message on "response" event on success', (done) => {

        const payload = Stringify({
            attachments: [{
                pretext: '`response` event from *localhost* at ' + timestamp,
                'mrkdwn_in': ['pretext','text','fields'],
                fallback: '200 POST /data',
                color: 'good',
                text: '*POST* /data {"name":"diego"} 200 (150ms)'
            }]
        });

        const stream = internals.readStream();
        const server = Http.createServer((req, res) => {

            let data = '';

            req.on('data', (chunk) => {

                data += chunk;
            });

            req.on('end', () => {

                expect(data).to.deep.equal(payload);
                res.end();
                server.close(done);
            });
        });

        server.listen(0, 'localhost', () => {

            const reporter = new GoodSlack({
                url: internals.getUri(server),
                host: 'localhost'
            });

            const event = Hoek.clone(internals.events.response);
            event.timestamp = now;

            stream.pipe(reporter);
            stream.push(event);
        });
    });

    it('sends message on "request" event with object', (done) => {

        const payload = Stringify({
            attachments: [{
                pretext: '`request` event from *localhost* at ' + timestamp,
                'mrkdwn_in': ['pretext','text','fields'],
                fallback: `info ${Stringify({ name: 'diego' })}`,
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
                    value: Util.format('```\n%s\n```', Stringify({ name: 'diego' }, null, 2))
                }]
            }]
        });

        const stream = internals.readStream();
        const server = Http.createServer((req, res) => {

            let data = '';

            req.on('data', (chunk) => {

                data += chunk;
            });

            req.on('end', () => {

                expect(data).to.deep.equal(payload);
                res.end();
                server.close(done);
            });
        });

        server.listen(0, 'localhost', () => {

            const reporter = new GoodSlack({
                url: internals.getUri(server),
                host: 'localhost'
            });

            const event = Hoek.clone(internals.events.request);
            event.timestamp = now;
            event.data = { name: 'diego' };

            stream.pipe(reporter);
            stream.push(event);
        });
    });

    it('sends message on "request" event on error', (done) => {

        const payload = Stringify({
            attachments: [{
                pretext: '`request` event from *localhost* at ' + timestamp,
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

        const stream = internals.readStream();
        const server = Http.createServer((req, res) => {

            let data = '';

            req.on('data', (chunk) => {

                data += chunk;
            });

            req.on('end', () => {

                expect(data).to.deep.equal(payload);
                res.end();
                server.close(done);
            });
        });

        server.listen(0, 'localhost', () => {

            const reporter = new GoodSlack({
                url: internals.getUri(server),
                host: 'localhost'
            });

            const event = Hoek.clone(internals.events.request);
            event.tags = ['error'];
            event.timestamp = now;

            stream.pipe(reporter);
            stream.push(event);
        });
    });

    it('sends message on "response" event on error', (done) => {

        const payload = Stringify({
            attachments: [{
                pretext: '`response` event from *localhost* at ' + timestamp,
                'mrkdwn_in': ['pretext','text','fields'],
                fallback: '404 POST /data',
                color: 'danger',
                text: '*POST* /data {"name":"diego"} 404 (150ms)'
            }]
        });

        const stream = internals.readStream();
        const server = Http.createServer((req, res) => {

            let data = '';

            req.on('data', (chunk) => {

                data += chunk;
            });

            req.on('end', () => {

                expect(data).to.deep.equal(payload);
                res.end();
                server.close(done);
            });
        });

        server.listen(0, 'localhost', () => {

            const reporter = new GoodSlack({
                url: internals.getUri(server),
                host: 'localhost'
            });

            const event = Hoek.clone(internals.events.response);
            event.timestamp = now;
            event.statusCode = 404;

            stream.pipe(reporter);
            stream.push(event);
        });
    });

    it('sends message on "ops" event', (done) => {

        const payload = Stringify({
            attachments: [{
                pretext: '`ops` event from *localhost* at ' + timestamp,
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

        const stream = internals.readStream();
        const server = Http.createServer((req, res) => {

            let data = '';

            req.on('data', (chunk) => {

                data += chunk;
            });

            req.on('end', () => {

                expect(data).to.deep.equal(payload);
                res.end();
                server.close(done);
            });
        });

        server.listen(0, 'localhost', () => {

            const reporter = new GoodSlack({
                url: internals.getUri(server),
                host: 'localhost'
            });

            const event = Hoek.clone(internals.events.ops);
            event.timestamp = now;
            event.statusCode = 404;

            stream.pipe(reporter);
            stream.push(event);
        });
    });

    it('sends message on "error" event', (done) => {

        const error = new Error('Something bad had happened');
        error.stack = 'Error: Something bad had happened\n' +
            '    at Object.<anonymous> (/good-slack/test/index.js:79:10)';

        const payload = Stringify({
            attachments: [{
                pretext: '`error` event from *localhost* at ' + timestamp,
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

        const stream = internals.readStream();
        const server = Http.createServer((req, res) => {

            let data = '';

            req.on('data', (chunk) => {

                data += chunk;
            });

            req.on('end', () => {

                expect(data).to.deep.equal(payload);
                res.end();
                server.close(done);
            });
        });

        server.listen(0, 'localhost', () => {

            const reporter = new GoodSlack({
                url: internals.getUri(server),
                host: 'localhost'
            });

            const event = Hoek.clone(internals.events.error);
            event.timestamp = now;
            event.error = error;

            stream.pipe(reporter);
            stream.push(event);
        });
    });

    it('sends message on "log" string event', (done) => {

        const payload = Stringify({
            attachments: [{
                pretext: '`log` event from *localhost* at ' + timestamp,
                'mrkdwn_in': ['pretext','text','fields'],
                fallback: 'info Server started at http://localhost',
                fields: [{
                    title: 'Tags',
                    value: 'info'
                }, {
                    title: 'Data',
                    value: 'Server started at http://localhost'
                }]
            }]
        });

        const stream = internals.readStream();
        const server = Http.createServer((req, res) => {

            let data = '';

            req.on('data', (chunk) => {

                data += chunk;
            });

            req.on('end', () => {

                expect(data).to.deep.equal(payload);
                res.end();
                server.close(done);
            });
        });

        server.listen(0, 'localhost', () => {

            const reporter = new GoodSlack({
                url: internals.getUri(server),
                host: 'localhost'
            });

            const event = Hoek.clone(internals.events.log);
            event.timestamp = now;

            stream.pipe(reporter);
            stream.push(event);
        });
    });

    it('sends message on "log" object event', (done) => {

        const payload = Stringify({
            attachments: [{
                pretext: '`log` event from *localhost* at ' + timestamp,
                'mrkdwn_in': ['pretext','text','fields'],
                fallback: `info ${Stringify({ foo: 'bar', baz: 'foo' })}`,
                fields: [{
                    title: 'Tags',
                    value: 'info'
                }, {
                    title: 'Data',
                    value: Util.format('```\n%s\n```', Stringify({ foo: 'bar', baz: 'foo' }, null, 2))
                }]
            }]
        });

        const stream = internals.readStream();
        const server = Http.createServer((req, res) => {

            let data = '';

            req.on('data', (chunk) => {

                data += chunk;
            });

            req.on('end', () => {

                expect(data).to.deep.equal(payload);
                res.end();
                server.close(done);
            });
        });

        server.listen(0, 'localhost', () => {

            const reporter = new GoodSlack({
                url: internals.getUri(server),
                host: 'localhost'
            });

            const event = Hoek.clone(internals.events.log);
            event.timestamp = now;
            event.data = { foo: 'bar', baz: 'foo' };

            stream.pipe(reporter);
            stream.push(event);
        });
    });

    it('sends message on "log" event without tags', (done) => {

        const payload = Stringify({
            attachments: [{
                pretext: '`log` event from *localhost* at ' + timestamp,
                'mrkdwn_in': ['pretext','text','fields'],
                fallback: 'Server started at http://localhost',
                fields: [{
                    title: 'Tags',
                    value: ''
                }, {
                    title: 'Data',
                    value: 'Server started at http://localhost'
                }]
            }]
        });

        const stream = internals.readStream();
        const server = Http.createServer((req, res) => {

            let data = '';

            req.on('data', (chunk) => {

                data += chunk;
            });

            req.on('end', () => {

                expect(data).to.deep.equal(payload);
                res.end();
                server.close(done);
            });
        });

        server.listen(0, 'localhost', () => {

            const reporter = new GoodSlack({
                url: internals.getUri(server),
                host: 'localhost'
            });

            const event = Hoek.clone(internals.events.log);
            event.timestamp = now;
            delete event.tags;

            stream.pipe(reporter);
            stream.push(event);
        });
    });

    it('sends message on "log" event as basic text message', (done) => {

        const payload = Stringify({
            text: 'Server started at http://localhost'
        });

        const stream = internals.readStream();
        const server = Http.createServer((req, res) => {

            let data = '';

            req.on('data', (chunk) => {

                data += chunk;
            });

            req.on('end', () => {

                expect(data).to.deep.equal(payload);
                res.end();
                server.close(done);
            });
        });

        server.listen(0, 'localhost', () => {

            const reporter = new GoodSlack({
                url: internals.getUri(server),
                host: 'localhost',
                basicLogEvent: true
            });

            const event = Hoek.clone(internals.events.log);
            event.timestamp = now;
            delete event.tags;

            stream.pipe(reporter);
            stream.push(event);
        });
    });

    it('sends one message per event', (done) => {

        const payload = Stringify({
            attachments: [{
                pretext: '`response` event from *localhost* at ' + timestamp,
                'mrkdwn_in': ['pretext','text','fields'],
                fallback: '404 POST /data',
                color: 'danger',
                text: '*POST* /data {"name":"diego"} 404 (150ms)'
            }]
        });

        let hitCount = 0;

        const stream = internals.readStream();
        const server = Http.createServer((req, res) => {

            let data = '';
            hitCount++;

            req.on('data', (chunk) => {

                data += chunk;
            });

            req.on('end', () => {

                expect(data).to.deep.equal(payload);
                res.end();

                if (hitCount === 2) {
                    return server.close(done);
                }
            });
        });

        server.listen(0, 'localhost', () => {

            const reporter = new GoodSlack({
                url: internals.getUri(server),
                host: 'localhost'
            });

            const event = Hoek.clone(internals.events.response);
            event.timestamp = now;
            event.statusCode = 404;

            stream.pipe(reporter);
            stream.push(event);
            stream.push(event);
        });
    });
});
