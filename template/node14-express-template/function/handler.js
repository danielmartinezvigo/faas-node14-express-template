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

  bind(route) {
    this.app.post('/*', route);
    this.app.get('/*', route);
    this.app.patch('/*', route);
    this.app.put('/*', route);
    this.app.delete('/*', route);
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
