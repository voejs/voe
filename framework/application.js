import Server from '../server';
import Context from './context';
import Request from './request';
import Response from './response';
import compose from 'koa-compose';
import Emitter from 'events';

export default class Application extends Emitter {
  constructor(type) {
    super();
    this._middleware = [];
    this.env = process.env.NODE_ENV || 'development';
    this.context = Object.create(Context);
    this.request = Object.create(Request);
    this.response = Object.create(Response);
    this.server = new Server(type);
  }
  
  listen(...args) {
    this.server.createServer(this.callback());
    return this.server.listen(...args);
  }
  
  use(fn) {
    if (typeof fn !== 'function') throw new TypeError('middleware must be a function!');
    this._middleware.push(fn);
    return this;
  }
  
  callback() {
    const fn = compose(this._middleware);
    return (req, res) => {
      const ctx = this.createContext(req, res);
      return this.handleRequest(ctx, fn);
    };
  }
  
  handleRequest(ctx, fnMiddleware) {
    const res = ctx.res;
    res.statusCode = 404;
    const onerror = err => ctx.onerror(err);
    const handleResponse = () => respond(ctx);
    return fnMiddleware(ctx).then(handleResponse).catch(onerror);
  }
  
  createContext(req, res) {
    const context = Object.create(this.context);
    const request = context.request = Object.create(this.request);
    const response = context.response = Object.create(this.response);
    context.app = request.app = response.app = this;
    context.req = request.req = response.req = req;
    context.res = request.res = response.res = res;
    request.ctx = response.ctx = context;
    request.response = response;
    response.request = request;
    context.originalUrl = request.originalUrl = req.url;
    context.props = null;
    context.body = null;
    return context;
  }
}

function respond(ctx) {
  const res = ctx.res;
  const body = ctx.body;
  const props = ctx.props;
  if (!body) {
    const err = new Error('Not found');
    err.code = err.status = 404;
    return ctx.onerror(err);
  }
  res.statusCode = 200;
  res.render(body, props);
}