# good-slack

Slack Webhook message posting for Good process monitor

[![Build Status](https://travis-ci.org/nakardo/good-slack.svg)](https://travis-ci.org/nakardo/good-slack) ![Current Version](https://img.shields.io/npm/v/good-slack.svg)

## Usage

`good-slack` is a [good](https://github.com/hapijs/good) reporter implementation to send [hapi](http://hapijs.com/) server events to
[Slack](https://api.slack.com/) using Incoming Webhooks.

## `new GoodSlack(config)`
Creates a new GoodSlack object with the following arguments:

- `config` - config object
  - `url` - a string with the Webhook URL
  - `[slack]` - an object of slack overridable parameters (See [Incoming Webhooks](https://api.slack.com/incoming-webhooks))
  - `[format]` - [MomentJS](http://momentjs.com/docs/#/displaying/format/) format string. Defaults to 'YYMMDD/HHmmss.SSS'.
  - `[host]` - a string with the server hostname. - Defaults to actual hostname.
  - `[basicLogEvent]` - a boolean to set the style of `log` events. When set to true, `log` events will be sent as text instead of attachments.

## Using with Hapi

Below is an example of using `good-slack` and `good-squeeze` together in a Hapi server to log all internal error messages to a slack channel.

```js
const Hapi = require('hapi');
const Server = new Hapi.Server();
Server.connection();

Server.register([
  {
    register: require('good'),
    options: {
      reporters: {
        slack: [{
          module: 'good-squeeze',
          name: 'Squeeze',
          args: [{ error: '*' }]
        }, {
          module: 'good-slack',
          args: [{ url: 'https://hook.slack.com/services/UNIQUE_SLACK_CHANNEL_URL' }]
        }]
      }
    }
  }
], (err) => {});
```

## Compatibility

This version is compatible with `good@7.x.x` which introduced major changes on [reporter interface](https://github.com/hapijs/good/blob/master/API.md#reporter-interface). For `6.x.x` support use  [v2.2.1](https://github.com/nakardo/good-slack/tree/v2.1.1).
