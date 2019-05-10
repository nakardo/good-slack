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
  - `[basicLogEvent]` - a boolean to set the style of `log` events. When set to true, `log` events will be sent as text instead of attachments. Defaults to `false`.

## Using with Hapi

Below is an example, based on the [hapi plugin documentation examples](https://hapijs.com/tutorials/plugins), of using `good-slack` and `good-squeeze` together in a Hapi server to log all internal error messages to a slack channel.

```js
const Hapi = require('@hapi/hapi');
const start = async function () {

  const server = Hapi.server();

  await server.register({
    plugin: require('@hapi/good'),
    options: {
      reporters: {
        slack: [{
          module: '@hapi/good-squeeze',
          name: 'Squeeze',
          args: [{ error: '*' }]
        }, {
          module: 'good-slack',
          args: [{ url: 'https://hook.slack.com/services/UNIQUE_SLACK_CHANNEL_URL' }]
        }]
      }
    }
  })
};
```

## Compatibility

* This version (v4) is compatible with `@hapi/good@8.x.x`, in which hapi moved to scoped package names.
* Use v3 for `good@7.x.x`, which introduced major changes on [reporter interface](https://github.com/hapijs/good/blob/master/API.md#reporter-interface).
* Use v2 for legacy support of `good@6.x.x`.
