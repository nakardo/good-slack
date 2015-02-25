var Os = require('os');
var Util = require('util');
var GoodReporter = require('good-reporter');
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

module.exports = internals.GoodSlack = function(events, channel, url, options) {
  Hoek.assert(this.constructor === internals.GoodSlack,
    'GoodSlack must be created with new');
  Hoek.assert(typeof channel === 'string', 'channel must be a string');
  Hoek.assert(typeof url === 'string', 'url must be a string');

  var settings = Hoek.applyToDefaults(internals.defaults, options || {});
  settings.channel = channel;
  settings.url = url;

  GoodReporter.call(this, events, settings);
};

Hoek.inherits(internals.GoodSlack, GoodReporter);

internals.codeFormat = function(data) {
  return Util.format('```\n%s\n```', data);
};

internals.GoodSlack.prototype._send = function(attachment) {
  var payload = Hoek.merge(this._settings.slack, {
    attachments: [attachment]
  });

  Wreck.request('post', this._settings.url, {
    payload: Stringify(payload)
  });
};

internals.GoodSlack.prototype._report = function(event, eventData) {
  var host = internals.host;
  var time = Moment.utc(eventData.timestamp).format(this._settings.format);

  var attachment = {
    pretext: Util.format('`%s` event from *%s* at %s', event, host, time),
      'mrkdwn_in': ['pretext', 'text', 'fields']
  };

  // TODO(dacosta) add `fallback` messages
  //
  // "Please note that the fallback field is required, and is displayed
  // whenever message attachments cannot be shown (ie. mobile notifications,
  // desktop notifications, IRC)."

  if (event === 'ops') {
    this._send(Hoek.merge(attachment, {
      fields: [{
        title: 'Memory',
        value: Math.round(eventData.proc.mem.rss / (1024 * 1024)) + ' Mb.',
        short: true
      }, {
        title: 'Uptime (seconds)',
        value: eventData.proc.uptime,
        short: true
      }, {
        title: 'Load',
        value: eventData.os.load,
        short: true
      }]
    }));
  }
  else if (event === 'response') {
    var method = eventData.method.toUpperCase();
    var query = Stringify(eventData.query);

    var text = Util.format('*%s* %s %s %s (%sms)', method, eventData.path,
      query, eventData.statusCode, eventData.responseTime);

    this._send(Hoek.merge(attachment, {
      color: eventData.statusCode >= 400 ? 'danger' : 'good',
      text: text
    }));
  }
  else if (event === 'error') {
    var error = eventData.error;

    this._send(Hoek.merge(attachment, {
      color: 'danger',
      fields: [{
        title: 'Error',
        value: Util.format('%s: %s', error.name, error.message)
      }, {
        title: 'Stack',
        value: internals.codeFormat(error.stack)
      }]
    }));
  }
  else if (event === 'request') {
    var method = eventData.method.toUpperCase();
    var data = eventData.data;

    var routeText = Util.format('%s %s', method, eventData.path);
    var requestText = Util.format('PID: %s \nRequest ID: %s' , eventData.pid, eventData.id)
    
    if (typeof eventData.data === 'object') {
      data = internals.codeFormat(Stringify(eventData.data, null, 2));
    }

    this._send(Hoek.merge(attachment, {
      color: eventData.tags.indexOf('error') > -1 ? 'danger' : '',
      fields: [
      	{ title: routeText, value: requestText },
        { title: 'Tags', value: eventData.tags.join(', ') },
        { title: 'Data', value: data }
      ]
    }));
  }
  else {
    var tags = eventData.tags || [];
    var data = eventData.data;

    if (typeof eventData.data === 'object') {
      data = internals.codeFormat(Stringify(eventData.data, null, 2));
    }

    this._send(Hoek.merge(attachment, {
      fields: [
        { title: 'Tags', value: tags.toString() },
        { title: 'Data', value: data }
      ]
    }));
  }
};
