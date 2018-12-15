jest.spyOn(global.console, 'error').mockImplementation(() => {});

jest.mock('ioredis');
const ioredis = require('ioredis');
ioredis.createClient.mockImplementation(() => ({
  on: jest.fn(),
  publish: jest.fn()
}));

const appenderModule = require('../lib');

const defaultLayouts = {
  messagePassThroughLayout: logEvent => logEvent.data[0],
  layout: (type) => {
    if (type === 'pattern') {
      return () => 'this is a pattern layout';
    }
    return logEvent => logEvent.data[0];
  }
};

describe('log4s-redis-appender', () => {

  it('should export a configure function', () => {
    expect(appenderModule.configure).toBeInstanceOf(Function);
  });

  it('should initialize with a client', () => {
    let client = {
      "fakeclient": true,
      "on": jest.fn()
    };
    const instance = appenderModule.configure({
      client: client,
      channel: 'log',
      type: 'redis',
      layout: {
        type: 'pattern',
        pattern: 'cheese %m'
      }
    }, defaultLayouts);
    expect(ioredis.createClient).not.toHaveBeenCalled();
  })

  it('should fail to initialize with an error', () => {
    ioredis.createClient.mockImplementation(() => {
      throw new Error("Failed in createClient");
    });
    expect(() => appenderModule.configure({
      host: '123.123.123.123',
      port: 1234,
      pass: '123456',
      channel: 'log',
      type: 'redis',
      layout: {
        type: 'pattern',
        pattern: 'cheese %m'
      }
    }, defaultLayouts)).toThrow(/Failed in createClient/);
  })

  it('should initialize with default values', () => {
    let client = {
      "fakeclient": true,
      "on": jest.fn()
    };
    ioredis.createClient.mockImplementation(() => client);
    appenderModule.configure({
      channel: 'log',
      type: 'redis',
      layout: {
        type: 'pattern',
        pattern: 'cheese %m'
      }
    }, defaultLayouts);
    expect(ioredis.createClient).toHaveBeenCalledWith(6379, "127.0.0.1", {});
  });

  it('should initialize without a pass through layout', () => {
    let client = {
      "fakeclient": true,
      "on": jest.fn()
    };
    appenderModule.configure({
      client: client,
      channel: 'log',
      type: 'redis',
    }, defaultLayouts);
  })

  describe('when initialized', () => {

    let instance = null;
    let client = null;
    beforeEach(() => {
      client = {
        on: jest.fn(),
        publish: jest.fn(),
        quit: jest.fn()
      }
      ioredis.createClient.mockImplementation(() => client);
      instance = appenderModule.configure({
        host: '123.123.123.123',
        port: 1234,
        pass: '123456',
        channel: 'log',
        type: 'redis',
        layout: {
          type: 'pattern',
          pattern: 'cheese %m'
        }
      }, defaultLayouts);
    });
  
    it('should publish an event', () => {
      instance({data: ['Log event #1']});
      expect(client.publish).toHaveBeenCalledTimes(1);
  
      const [channel, message, cb] = client.publish.mock.calls[0];
      cb(false);
    });
  
    it('should publish an event and fail', () => {
      instance({data: ['Log event #1']});
      expect(client.publish).toHaveBeenCalledTimes(1);
  
      const [channel, message, cb] = client.publish.mock.calls[0];
      cb("something went wrong");

      expect(global.console.error).toHaveBeenCalled();
    })
  
    it('should publish an event and notify an error', () => {
      instance({data: ['Log event #1']});
      expect(client.on).toHaveBeenCalledTimes(1);
      expect(client.publish).toHaveBeenCalledTimes(1);
  
      const [channel, message, cb] = client.publish.mock.calls[0];
      cb(false);
  
      expect(client.on).toHaveBeenCalledWith('error', expect.any(Function));
      const errorHandler = client.on.mock.calls[0][1];
      errorHandler("Something went wrong");

      expect(global.console.error).toHaveBeenCalled();
    });
  
    it('should shut down', () => {
      const callback = jest.fn();
      instance.shutdown(callback);
      expect(client.quit).toHaveBeenCalled();
      expect(callback).toHaveBeenCalled();
    });
  
  })

});

// test('log4js redisAppender', (batch) => {

//     result.logger.info('Log event #1');
//     result.fakeRedis.publishCb();

//     t.test('redis credentials should match', (assert) => {
//       assert.equal(result.fakeRedis.host, '123.123.123.123');
//       assert.equal(result.fakeRedis.port, 1234);
//       assert.equal(result.fakeRedis.optionR.auth_pass, '123456');
//       assert.equal(result.fakeRedis.msgs.length, 1, 'should be one message only');
//       assert.equal(result.fakeRedis.msgs[0].channel, 'log');
//       assert.equal(result.fakeRedis.msgs[0].message, 'this is a pattern layout');
//       assert.end();
//     });

//     t.end();
//   });

//   batch.test('default values', (t) => {
//     const setup = setupLogging('defaults', {
//       type: 'redis',
//       channel: 'thing'
//     });

//     setup.logger.info('just testing');
//     setup.fakeRedis.publishCb();

//     t.test('should use localhost', (assert) => {
//       assert.equal(setup.fakeRedis.host, '127.0.0.1');
//       assert.equal(setup.fakeRedis.port, 6379);
//       assert.same(setup.fakeRedis.optionR, {});
//       assert.end();
//     });

//     t.test('should use message pass through layout', (assert) => {
//       assert.equal(setup.fakeRedis.msgs.length, 1);
//       assert.equal(setup.fakeRedis.msgs[0].channel, 'thing');
//       assert.equal(setup.fakeRedis.msgs[0].message, 'just testing');
//       assert.end();
//     });

//     t.end();
//   });

//   batch.test('redis errors', (t) => {
//     const setup = setupLogging('errors', { type: 'redis', channel: 'testing' });

//     setup.fakeRedis.errorCb('oh no, error on connect');
//     setup.logger.info('something something');
//     setup.fakeRedis.publishCb('oh no, error on publish');

//     t.test('should go to the console', (assert) => {
//       assert.equal(setup.fakeConsole.errors.length, 2);
//       assert.equal(
//         setup.fakeConsole.errors[0],
//         'log4js.redisAppender - 127.0.0.1:6379 Error: \'oh no, error on connect\''
//       );
//       assert.equal(
//         setup.fakeConsole.errors[1],
//         'log4js.redisAppender - 127.0.0.1:6379 Error: \'oh no, error on publish\''
//       );
//       assert.end();
//     });
//     t.end();
//   });

//   batch.test('shutdown', (t) => {
//     const setup = setupLogging('shutdown', { type: 'redis', channel: 'testing' });

//     setup.appender.shutdown(() => {
//       t.ok(setup.fakeRedis.quitCalled);
//       t.end();
//     });
//   });

//   batch.end();
// });