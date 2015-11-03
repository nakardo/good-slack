var Os = require('os');
var Util = require('util');
var Squeeze = require('good-squeeze').Squeeze;
var Hoek = require('hoek');
var Wreck = require('wreck');
var Stringify = require('json-stringify-safe');
var Moment = require('moment');


var internals = {
    defaults: {
        slack: {},
        format: 'YYMMDD/HHmmss.SSS'
    },
    host: Os.hostname()
};

module.exports = internals.GoodSlack = function (events, config) {

    if (!(this instanceof internals.GoodSlack)) {
        return new internals.GoodSlack(events, config);
    }

    config = config || {};

    Hoek.assert(typeof config.url === 'string', 'url must be a string');

    this._config = Hoek.applyToDefaults(internals.defaults, config);
    this._squeeze = Squeeze(events);
};

internals.GoodSlack.prototype.init = function (stream, emitter, callback) {

    this._squeeze.on('data', this._report.bind(this));
    stream.pipe(this._squeeze);
    callback();
};

internals.codeFormat = function (data) {

    return Util.format('```\n%s\n```', data);
};

internals.GoodSlack.prototype._send = function (attachment) {

    var payload = Hoek.merge(this._config.slack, {
        attachments: [attachment]
    });

    Wreck.request('post', this._config.url, {
        payload: Stringify(payload)
    });
};

internals.GoodSlack.prototype._report = function (eventData) {

    var host = internals.host;
    var time = Moment.utc(eventData.timestamp).format(this._config.format);

    var attachment = {
        pretext: Util.format('`%s` event from *%s* at %s', eventData.event,
            host, time),
        'mrkdwn_in': ['pretext', 'text', 'fields']
    };

    if (eventData.event === 'ops') {
        var pMem = Math.round(eventData.proc.mem.rss / (1024 * 1024)) + ' Mb.';
        var osLoad = eventData.os.load.map(function (value) {

            return value.toFixed(2);
        });

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
        var method = eventData.method.toUpperCase();
        var query = Stringify(eventData.query);

        var text = Util.format('*%s* %s %s %s (%sms)', method, eventData.path,
            query, eventData.statusCode, eventData.responseTime);

        this._send(Hoek.merge(attachment, {
            fallback: Util.format('%s %s %s', eventData.statusCode, method,
                eventData.path),
            color: eventData.statusCode >= 400 ? 'danger' : 'good',
            text: text
        }));
    }
    else if (eventData.event === 'error') {
        var error = eventData.error;
        var errorMsg = Util.format('%s: %s', error.name, error.message);

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
        var reqMethod = eventData.method.toUpperCase();
        var reqData = eventData.data;
        var reqDataFallback = eventData.data;

        var routeText = Util.format('*%s* %s', reqMethod, eventData.path);
        var logTags = eventData.tags.join(', ');

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
        var tags = eventData.tags || [];
        var data = eventData.data;
        var dataFallback = eventData.data;

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
