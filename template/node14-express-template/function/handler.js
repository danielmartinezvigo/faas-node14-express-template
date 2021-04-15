// const bodyParser = require('body-parser');

class Routing {
  constructor(app) {
    this.app = app;
  }

  // configure() {
  //   this.app.use(bodyParser.json());
  //   this.app.use(bodyParser.raw());
  //   this.app.use(bodyParser.text({ type: 'text/*' }));
  //   this.app.disable('x-powered-by');
  // }

  bind() {
    this.app.post('/*', (req, res) => Routing.handle(req, res));
    this.app.get('/*', (req, res) => Routing.handle(req, res));
    this.app.patch('/*', (req, res) => Routing.handle(req, res));
    this.app.put('/*', (req, res) => Routing.handle(req, res));
    this.app.delete('/*', (req, res) => Routing.handle(req, res));
  }

  static async handle(req, res) {
    res.send(JSON.stringify(req.body));
  }
}

module.exports = async (config) => {
  const routing = new Routing(config.app);
  // routing.configure();
  routing.bind(routing.handle);
};
