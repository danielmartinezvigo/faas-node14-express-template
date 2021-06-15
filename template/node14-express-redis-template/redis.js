/* eslint-disable no-underscore-dangle */
/* eslint-disable camelcase */
const redis = require('redis');

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

let _client_ok = false;

let client;

const uri = process.env.REDIS_URI
  ? process.env.REDIS_URI
  : `redis://${process.env.redis_username}:${process.env.redis_password}@${process.env.redis_endpoint}`;

global.logger.info({ message: uri, label: 'REDIS URI' });

if (process.env.REDIS_CERTIFICATE_BASE64) {
  global.logger.info({ message: 'module: redis', label: 'REDIS TLS' });
  const ca = Buffer.from(process.env.REDIS_CERTIFICATE_BASE64, 'base64').toString('utf-8');
  const tls = { ca };
  client = redis.createClient(uri, { tls });

  client.on('connect', async () => {
    global.logger.info({ message: 'client connected', label: global.getLabel(__dirname, __filename) });
    _client_ok = true;
  });

  client.on('error', async (err) => {
    global.logger.error({ message: `client error ${err}`, label: global.getLabel(__dirname, __filename) });
    global.Raven.captureException(err);
    _client_ok = false;
    await sleep(1000);
    client = redis.createClient(uri, { tls });
  });
} else {
  const options = {
    url: uri,
  };
  client = redis.createClient(options);

  client.on('connect', async () => {
    global.logger.info({ message: 'client connected', label: global.getLabel(__dirname, __filename) });
    _client_ok = true;
  });

  client.on('error', async (err) => {
    global.logger.error({ message: `client error ${err}`, label: global.getLabel(__dirname, __filename) });
    global.Raven.captureException(err);
    _client_ok = false;
    await sleep(1000);
    client = redis.createClient(options);
  });
}

function get(key) {
  return new Promise((resolve, reject) => {
    client.get(key, (err, reply) => {
      if (err) {
        global.logger.error({ message: `get error ${err}`, label: global.getLabel(__dirname, __filename) });
        return reject(err);
      }
      try {
        return resolve(JSON.parse(reply));
      } catch (ex) {
        return resolve(ex);
      }
    });
  });
}

function set(key, value) {
  return new Promise((resolve, reject) => {
    let v = value;
    if (typeof v === 'object') {
      v = JSON.stringify(value);
    }
    client.set(key, v, (err, reply) => {
      if (err) {
        global.logger.error({ message: `set error ${err}`, label: global.getLabel(__dirname, __filename) });
        return reject(err);
      }
      try {
        return resolve(JSON.parse(reply));
      } catch (ex) {
        return resolve(ex);
      }
    });
  });
}

function set_with_ttl(key, value, ttl) {
  return new Promise((resolve, reject) => {
    let v = value;
    if (typeof v === 'object') {
      v = JSON.stringify(value);
    }
    client.set(key, v, 'EX', ttl, (err, reply) => {
      if (err) {
        global.logger.error({ message: `set error ${err}`, label: global.getLabel(__dirname, __filename) });
        return reject(err);
      }
      try {
        return resolve(JSON.parse(reply));
      } catch (ex) {
        return resolve(reply);
      }
    });
  });
}

client.on('error', (err) => {
  global.logger.error({ message: `client error ${err}`, label: global.getLabel(__dirname, __filename) });
});

module.exports = {
  ok: () => _client_ok,
  get,
  set,
  set_with_ttl,
};
