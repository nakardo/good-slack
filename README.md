# good-slack

Slack Webhook message posting for Good process monitor

[![Build Status](https://travis-ci.org/dmacosta/good-slack.svg)](https://travis-ci.org/dmacosta/good-slack) ![Current Version](https://img.shields.io/npm/v/good-slack.svg)

## Usage

`good-slack` is a [good](https://github.com/hapijs/good) reporter implementation to send [hapi](http://hapijs.com/) server events to
[Slack](https://api.slack.com/) using Incoming Webhooks.

## `new GoodSlack(config)`
Creates a new GoodSlack object with the following arguments:

- `config` - config object
  - `url` - a string with the Webhook URL
  - `[slack]` - an object of slack overridable parameters (See [Incoming Webhooks](https://api.slack.com/incoming-webhooks))
  - `[format]` - [MomentJS](http://momentjs.com/docs/#/displaying/format/) format string. Defaults to 'YYMMDD/HHmmss.SSS'.
  - `[host]` - server hostname. - Defaults to machine hostname.

## Compatibility

This version is compatible with `good@7.x.x` which introduced major changes on [reporter interface](https://github.com/hapijs/good/blob/master/API.md#reporter-interface). For `6.x.x` support use  [v2.2.1](https://github.com/dmacosta/good-slack/tree/v2.1.1).
