'use strict';

// Load modules

const Os = require('os');
const Util = require('util');
const Squeeze = require('good-squeeze').Squeeze;
const Hoek = require('hoek');
let Wreck = require('wreck'); // eslint-disable-line
const Stringify = require('fast-safe-stringify');
const Moment = require('moment');


// Declare internals

const internals = {
    defaults: {
        slack: {},
        format: 'YYMMDD/HHmmss.SSS'
    },
    host: Os.hostname()
};


internals.codeFormat = (data) => Util.format('```\n%s\n```', data);


module.exports = internals.GoodSlack = function (events, config) {

    if (!(this instanceof internals.GoodSlack)) {
        return new internals.GoodSlack(events, config);
    }

    config = config || {};

    Hoek.assert(typeof config.url === 'string', 'url must be a string');

    this._config = Hoek.applyToDefaults(internals.defaults, config);
    this._squeeze = new Squeeze(events);
};


internals.GoodSlack.prototype.init = function (stream, emitter, callback) {

    this._squeeze.on('data', this._report.bind(this));
    stream.pipe(this._squeeze);
    callback();
};


internals.GoodSlack.prototype._send = function (attachment) {

    const payload = Hoek.applyToDefaults(this._config.slack, {
        attachments: [attachment]
    });

    Wreck.request('post', this._config.url, {
        payload: Stringify(payload)
    });
};


internals.GoodSlack.prototype._report = function (eventData) {

    const host = internals.host;
    const time = Moment.utc(eventData.timestamp).format(this._config.format);

    const attachment = {
        pretext: Util.format('`%s` event from *%s* at %s', eventData.event,
            host, time),
        'mrkdwn_in': ['pretext', 'text', 'fields']
    };

    if (eventData.event === 'ops') {
        const pMem = Math.round(eventData.proc.mem.rss / (1024 * 1024)) + ' Mb.';
        const osLoad = eventData.os.load.map((v) => v.toFixed(2));

        this._send(Hoek.merge(attachment, {
            fallback: Util.format('L: %s | M: %s | U: %s', osLoad[1], pMem,
                eventData.proc.uptime),
            fields: [{
                title: 'Memory',
                value: pMem,
                short: true
            }, {
                title: 'Uptime (seconds)',
                value: eventData.proc.uptime,
                short: true
            }, {
                title: 'Load',
                value: osLoad.join(' | '),
                short: true
            }]
        }));
    }
    else if (eventData.event === 'response') {
        const method = eventData.method.toUpperCase();
        const query = Stringify(eventData.query);

        const text = Util.format('*%s* %s %s %s (%sms)', method, eventData.path,
            query, eventData.statusCode, eventData.responseTime);

        this._send(Hoek.merge(attachment, {
            fallback: Util.format('%s %s %s', eventData.statusCode, method,
                eventData.path),
            color: eventData.statusCode >= 400 ? 'danger' : 'good',
            text
        }));
    }
    else if (eventData.event === 'error') {
        const error = eventData.error;
        const errorMsg = Util.format('%s: %s', error.name, error.message);

        this._send(Hoek.merge(attachment, {
            fallback: errorMsg,
            text: Util.format('*%s* %s', eventData.method.toUpperCase(),
                eventData.url.path),
            color: 'danger',
            fields: [{
                title: 'Error',
                value: errorMsg
            }, {
                title: 'Stack',
                value: internals.codeFormat(error.stack)
            }]
        }));
    }
    else if (eventData.event === 'request') {
        const reqMethod = eventData.method.toUpperCase();
        let reqData = eventData.data;
        let reqDataFallback = eventData.data;

        const routeText = Util.format('*%s* %s', reqMethod, eventData.path);
        const logTags = eventData.tags.join(', ');

        if (typeof eventData.data === 'object') {
            reqData = internals.codeFormat(Stringify(eventData.data, null, 2));
            reqDataFallback = Stringify(eventData.data);
        }

        this._send(Hoek.merge(attachment, {
            fallback: Util.format('%s %s', logTags, reqDataFallback),
            text: routeText,
            color: eventData.tags.indexOf('error') > -1 ? 'danger' : undefined,
            fields: [
                { title: 'PID', value: eventData.pid },
                { title: 'Request ID', value: eventData.id },
                { title: 'Tags', value: logTags },
                { title: 'Data', value: reqData }
            ]
        }));
    }
    else {
        const tags = eventData.tags || [];
        let data = eventData.data;
        let dataFallback = eventData.data;

        if (typeof eventData.data === 'object') {
            data = internals.codeFormat(Stringify(eventData.data, null, 2));
            dataFallback = Stringify(eventData.data);
        }

        this._send(Hoek.merge(attachment, {
            fallback: Util.format('%s %s', tags, dataFallback).trim(),
            fields: [
                { title: 'Tags', value: tags.toString() },
                { title: 'Data', value: data }
            ]
        }));
    }
};


internals.GoodSlack.attributes = {
    pkg: require('../package.json')
};
