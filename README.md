# good-slack

Slack Webhook message posting for Good process monitor

[![Build Status](https://travis-ci.org/dmacosta/good-slack.svg)](https://travis-ci.org/dmacosta/good-slack)

## Usage

`good-slack` is a [good-reporter](https://github.com/hapijs/good-reporter)
implementation to send [hapi](http://hapijs.com/) server events to
[Slack](https://api.slack.com/) using Incoming Webhooks.

## Good Slack
### new GoodSlack(events, channel, url, [options])
creates a new GoodSlack object with the following arguments

- `events` - an object of key value pairs.
  - `key` - one of the supported [good events](https://github.com/hapijs/good) indicating the hapi event to subscribe to
  - `value` - a single string or an array of strings to filter incoming events. "\*" indicates no filtering. `null` and `undefined` are assumed to be "\*"
- `channel` - a string indicating the channel where messages will be sent. e.g. "#events"
- `url` - a string with the Webhook URL
- `[options]` - optional arguments object
  - `slack` - an object of slack overridable parameters (Check Integration Settings)
  - `format` - [MomentJS](http://momentjs.com/docs/#/displaying/format/) format string. Defaults to 'YYMMDD/HHmmss.SSS'.
