# good-slack

Slack Webhook message posting for Good process monitor

[![Build Status](https://travis-ci.org/dmacosta/good-slack.svg)](https://travis-ci.org/dmacosta/good-slack) ![Current Version](https://img.shields.io/npm/v/good-slack.svg)

## Usage

`good-slack` is a [good](https://github.com/hapijs/good) reporter implementation to send [hapi](http://hapijs.com/) server events to
[Slack](https://api.slack.com/) using Incoming Webhooks.

## `GoodSlack(events, config)`
Creates a new GoodSlack object with the following arguments:

- `events` - an object of key value pairs.
  - `key` - one of the supported [good events](https://github.com/hapijs/good) indicating the hapi event to subscribe to
  - `value` - a single string or an array of strings to filter incoming events. "\*" indicates no filtering. `null` and `undefined` are assumed to be "\*"
- `config` - config object
  - `url` - a string with the Webhook URL
  - `[slack]` - an object of slack overridable parameters (See [Incoming Webhooks](https://api.slack.com/incoming-webhooks))
  - `[format]` - [MomentJS](http://momentjs.com/docs/#/displaying/format/) format string. Defaults to 'YYMMDD/HHmmss.SSS'.
