/* eslint-disable max-len */
// Copyright (c) Alex Ellis 2021. All rights reserved.
// Copyright (c) OpenFaaS Author(s) 2021. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

const express = require('express');

const app = express();
const bodyParser = require('body-parser');
const morgan = require('morgan');

const handler = require('./function/handler');

const logger = require('./winston/logger');
const sentry = require('./sentry');
const utils = require('./utils');

global.DEBUG_LEVEL = /^\d+$/.test(process.env.DEBUG_LEVEL) ? parseInt(process.env.DEBUG_LEVEL, 10) : 1;
// eslint-disable-next-line no-console
console.log('debug level', global.DEBUG_LEVEL);
logger.init();
sentry.init();
utils.init();

global.redis = require('./redis');

const defaultMaxSize = '100kb'; // body-parser default

app.disable('x-powered-by');

const rawLimit = process.env.MAX_RAW_SIZE || defaultMaxSize;
const jsonLimit = process.env.MAX_JSON_SIZE || defaultMaxSize;

// The request handler must be the first middleware on the app
app.use(global.Sentry.Handlers.requestHandler());
app.use((req, res, next) => {
  // When no content-type is given, the body element is set to
  // nil, and has been a source of contention for new users.

  if (!req.headers['content-type']) {
    req.headers['content-type'] = 'text/plain';
  }
  next();
});

if (process.env.RAW_BODY === 'true') {
  app.use(bodyParser.raw({ type: '*/*', limit: rawLimit }));
} else {
  app.use(bodyParser.text({ type: 'text/*' }));
  app.use(bodyParser.json({ limit: jsonLimit }));
  app.use(bodyParser.urlencoded({ extended: true }));
}

app.use(morgan((tokens, req, res) => [
  tokens.method(req, res),
  tokens.url(req, res),
  tokens.status(req, res),
  // eslint-disable-next-line no-nested-ternary
  global.DEBUG_LEVEL > 1
    ? JSON.stringify(req.body)
    : (
      req.body
      && req.body.id
      && req.body.type
        ? JSON.stringify({ type: req.body.type, id: req.body.id })
        : JSON.stringify(req.body)
    ),
  tokens['response-time'](req, res),
  'ms',
].join(' '), {
  skip: req => req.body.password,
}));

// const isArray = (a) => {
//     return (!!a) && (a.constructor === Array);
// };

// const isObject = (a) => {
//     return (!!a) && (a.constructor === Object);
// };

// class FunctionEvent {
//     constructor(req) {
//         this.body = req.body;
//         this.headers = req.headers;
//         this.method = req.method;
//         this.query = req.query;
//         this.path = req.path;
//     }
// }

// class FunctionContext {
//     constructor(cb) {
//         this.value = 200;
//         this.cb = cb;
//         this.headerValues = {};
//         this.cbCalled = 0;
//     }

//     status(value) {
//         if(!value) {
//             return this.value;
//         }

//         this.value = value;
//         return this;
//     }

//     headers(value) {
//         if(!value) {
//             return this.headerValues;
//         }

//         this.headerValues = value;
//         return this;
//     }

//     succeed(value) {
//         let err;
//         this.cbCalled++;
//         this.cb(err, value);
//     }

//     fail(value) {
//         let message;
//         this.cbCalled++;
//         this.cb(value, message);
//     }
// }

// const middleware = async (req, res) => {
//     const cb = (err, functionResult) => {
//         if (err) {
//             console.error(err);

//             return res.status(500)
//                 .send(err.toString ? err.toString() : err);
//         }

//         if(isArray(functionResult) || isObject(functionResult)) {
//             res.set(fnContext.headers())
//                 .status(fnContext.status()).send(JSON.stringify(functionResult));
//         } else {
//             res.set(fnContext.headers())
//                 .status(fnContext.status())
//                 .send(functionResult);
//         }
//     };

//     const fnEvent = new FunctionEvent(req);
//     const fnContext = new FunctionContext(cb);

//     Promise.resolve(handler(fnEvent, fnContext, cb))
//     .then(res => {
//         if(!fnContext.cbCalled) {
//             fnContext.succeed(res);
//         }
//     })
//     .catch(e => {
//         cb(e);
//     });
// };

// app.post('/*', middleware);
// app.get('/*', middleware);
// app.patch('/*', middleware);
// app.put('/*', middleware);
// app.delete('/*', middleware);
// app.options('/*', middleware);

const port = process.env.http_port || 3000;

app.listen(port, () => {
  global.logger.info({
    message: `Listening on port: ${port}`,
    label: global.getLabel(__dirname, __filename),
  });
});

const init = async () => handler({ app });
init();

// The error handler must be before any other error middleware and after all controllers
app.use(global.Sentry.Handlers.errorHandler());
