# log4js-redis-appender

This is virtually identical to [`@log4js-node/redis`](https://github.com/log4js-node/redis), 
but allows a little more flexibility when it comes to setting the client. This makes it easier 
to, for example, use a Sentinel-backed instance. 

## Configuration

Use either:

* `client` - a redis client instance

Or:

* `host` - `string` (optional, defaults to `127.0.0.1`) - the location of the redis server
* `port` - `integer` (optional, defaults to `6379`) - the port the redis server is listening on
* `pass` - `string` (optional) - password to use when authenticating connection to redis

If you use these, `ioredis` will be used (it's an optional dependency) to make a new redis
client.

And then:

* `channel` - `string` - the redis channel that log events will be published to
* `layout` - `object` (optional, defaults to `messagePassThroughLayout`) - the layout to use for log events (see [layouts](layouts.md)).

The appender will use the Redis PUBLISH command to send the log event messages to the channel.

## Example

```javascript
log4js.configure({
  appenders: {
    redis: { type: 'log4js-node-appender', channel: 'logs' }
  },
  categories: { default: { appenders: ['redis'], level: 'info' } }
});
```

This configuration will publish log messages to the `logs` channel on `127.0.0.1:6379`.