'use strict';

const util = require('util');

function getClient(config) {
  if (config.client) {
    return config.client;
  }

  try {
    const redis = require('ioredis');

    return redis.createClient(config.port || 6379, 
      config.host || '127.0.0.1', 
      config.pass ? { auth_pass: config.pass } : {});
  } catch (error) {
    throw new Error("Failed to get redis client: " + error.message);
  }
}

function redisAppender(config, layout) {
  const redisClient = getClient(config);

  redisClient.on('error', (err) => {
    console.error(`log4js-redis-appender - Error: ${util.inspect(err)}`); // eslint-disable-line
  });

  const appender = function (loggingEvent) {
    const message = layout(loggingEvent);
    redisClient.publish(config.channel, message, (err) => {
      if (err) {
        console.error(`log4js-redis-appender - Error: ${util.inspect(err)}`); // eslint-disable-line
      }
    });
  };

  appender.shutdown = (cb) => {
    redisClient.quit();
    cb();
  };

  return appender;
}

function configure(config, layouts) {
  let layout = layouts.messagePassThroughLayout;
  if (config.layout) {
    layout = layouts.layout(config.layout.type, config.layout);
  }

  return redisAppender(config, layout);
}

module.exports.configure = configure;
