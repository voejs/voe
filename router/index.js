import compose from 'koa-compose';
import Layer from './layer';
import is from 'is-type-of';

export default class Router {
  constructor(app, opts = {}) {
    this.app = app;
    this.opts = opts;
    this.methods = this.opts.methods || ['GET'];
    this.params = {};
    this.stack = [];
  }
  
  webview(...args) {
    return this.inspect(...args.map((arg, index) => {
      if (index === 0 && isRule(arg)) return arg;
      if (index === args.length - 1) return this.webviewTransfer(arg);
      return arg;
    }));
  }
  
  /**
   * formatter for string middleware
   * 'a.b.c.d' -> app.middleware(controller).a.b.c.d
   * @param object
   * @param arg
   * @returns {T}
   */
  functional(object, arg) {
    return arg.split('.').reduce((target, property) => {
      if (target[property]) return target[property];
      throw new Error('[koa-router transfer] can not find property of ' + property);
    }, object);
  }
  
  webviewTransfer(arg) {
    if (is.string(arg)) {
      return ctx => ctx.body = this.functional(ctx.webview, arg);
    } else {
      return ctx => ctx.body = arg;
    }
  }
  
  /**
   * stringify middleware support:
   *  1. node_modules
   *  2. stringify
   *
   * @notice:
   *  in node_module modal
   *  if config[arg] is not exists then we know it with no params middleware
   *  either which has params middleware
   * @param arg
   * @returns {*}
   */
  middlewareTransfer(arg) {
    if (is.string(arg)) {
      return this.functional(this.app.middleware, arg);
    }
    return arg;
  }
  
  /**
   * stringify controller support
   * @param arg
   * @returns {*}
   */
  controllerTransfer(arg) {
    if (is.string(arg)) return this.functional(this.app.controller, arg);
    return arg;
  }
  
  get(...args) {
    const length = args.length;
    return this.router(...args.map((arg, index) => {
      if (index === 0 && isRule(arg)) return arg;
      if (index === length - 1) return this.controllerTransfer(arg);
      return this.middlewareTransfer(arg);
    }).filter(filter));
  }
  
  router(name, path, middleware) {
    if (typeof path === 'string' || path instanceof RegExp) {
      middleware = Array.prototype.slice.call(arguments, 2);
    } else {
      middleware = Array.prototype.slice.call(arguments, 1);
      path = name;
      name = null;
    }
    
    this.register(
      path, ['get'],
      middleware, {
        name: name
      }
    );
    
    return this;
  }
  
  use(...args) {
    return this.inspect(...args.map((arg, index) => {
      if (index === 0 && isRule(arg)) return arg;
      return this.middlewareTransfer(arg);
    }));
  }
  
  inspect() {
    const router = this;
    const middleware = Array.prototype.slice.call(arguments);
    let path = '(.*)';
    
    // support array of paths
    if (Array.isArray(middleware[0]) && typeof middleware[0][0] === 'string') {
      middleware[0].forEach(p => router.use.apply(router, [p].concat(middleware.slice(1))));
      return this;
    }
    
    var hasPath = typeof middleware[0] === 'string';
    if (hasPath) {
      path = middleware.shift();
    }
    
    middleware.forEach(m => {
      if (m.router) {
        m.router.stack.forEach(nestedLayer => {
          if (path) nestedLayer.setPrefix(path);
          if (router.opts.prefix) nestedLayer.setPrefix(router.opts.prefix);
          router.stack.push(nestedLayer);
        });
        
        if (router.params) {
          Object.keys(router.params).forEach(key => m.router.param(key, router.params[key]));
        }
      } else {
        router.register(path, [], m, {
          end: false,
          ignoreCaptures: !hasPath
        });
      }
    });
    
    return this;
  }
  
  /**
   * Set the path prefix for a Router instance that was already initialized.
   *
   * @example
   *
   * ```javascript
   * router.prefix('/things/:thing_id')
   * ```
   *
   * @param {String} prefix
   * @returns {Router}
   */
  prefix(prefix) {
    prefix = prefix.replace(/\/$/, '');
    this.opts.prefix = prefix;
    this.stack.forEach(route => route.setPrefix(prefix));
    return this;
  }
  
  /**
   * Returns router middleware which dispatches a route matching the request.
   *
   * @returns {Function}
   */
  /* istanbul ignore next */
  middleware() { return this.routes(); }
  routes() {
    const router = this;
    const dispatch = function dispatch(ctx, next) {
      const path = ctx.req.pathname || '/';
      const matched = router.match(path, 'GET');
      let layerChain, layer, i;
      
      if (ctx.matched) {
        ctx.matched.push.apply(ctx.matched, matched.path);
      } else {
        ctx.matched = matched.path;
      }
      
      ctx.router = router;
      
      if (!matched.route) return next();
      
      const matchedLayers = matched.pathAndMethod;
      const mostSpecificLayer = matchedLayers[matchedLayers.length - 1];
      ctx._matchedRoute = mostSpecificLayer.path;
      if (mostSpecificLayer.name) {
        ctx._matchedRouteName = mostSpecificLayer.name;
      }
      
      layerChain = matchedLayers.reduce(function (memo, layer) {
        memo.push(function (ctx, next) {
          ctx.captures = layer.captures(path, ctx.captures);
          ctx.params = layer.params(path, ctx.captures, ctx.params);
          return next();
        });
        return memo.concat(layer.stack);
      }, []);
      
      return compose(layerChain)(ctx, next);
    };
    
    dispatch.router = this;
    
    return dispatch;
  }
  
  /**
   * Redirect `source` to `destination` URL with optional 30x status `code`.
   *
   * Both `source` and `destination` can be route names.
   *
   * ```javascript
   * router.redirect('/login', 'sign-in');
   * ```
   *
   * This is equivalent to:
   *
   * ```javascript
   * router.all('/login', function (ctx) {
   *   ctx.redirect('/sign-in');
   * });
   * ```
   *
   * @param {String} source URL or route name.
   * @param {String} destination URL or route name.
   * @returns {Router}
   */
  redirect(source, destination) {
    if (source[0] !== '/') {
      source = this.url(source);
    }
    
    // lookup destination route by name
    if (destination[0] !== '/') {
      destination = this.url(destination);
    }
    
    return this.all(source, async function (ctx) {
      await ctx.redirect(destination);
    });
  }
  
  /**
   * Create and register a route.
   *
   * @param {String} path Path string.
   * @param {Array.<String>} methods Array of HTTP verbs.
   * @param {Function} middleware Multiple middleware also accepted.
   * @returns {Layer}
   * @private
   */
  register(path, methods, middleware, opts = {}) {
    const router = this;
    const stack = this.stack;
    
    // support array of paths
    if (Array.isArray(path)) {
      path.forEach(p => router.register.call(router, p, methods, middleware, opts));
      return this;
    }
    
    // create route
    const route = new Layer(path, methods, middleware, {
      end: opts.end === false ? opts.end : true,
      name: opts.name,
      sensitive: opts.sensitive || this.opts.sensitive || false,
      strict: opts.strict || this.opts.strict || false,
      prefix: opts.prefix || this.opts.prefix || "",
      ignoreCaptures: opts.ignoreCaptures
    });
    
    if (this.opts.prefix) {
      route.setPrefix(this.opts.prefix);
    }
    
    // add parameter middleware
    Object.keys(this.params).forEach(param => route.param(param, this.params[param]));
    stack.push(route);
    return route;
  }
  
  /**
   * Lookup route with given `name`.
   *
   * @param {String} name
   * @returns {Layer|false}
   */
  route(name) {
    const routes = this.stack;
    
    for (let len = routes.length, i=0; i<len; i++) {
      if (routes[i].name && routes[i].name === name) {
        return routes[i];
      }
    }
    
    return false;
  }
  
  /**
   * Generate URL for route. Takes a route name and map of named `params`.
   *
   * @example
   *
   * ```javascript
   * router.get('user', '/users/:id', function (ctx, next) {
   *   // ...
   * });
   *
   * router.url('user', 3);
   * // => "/users/3"
   *
   * router.url('user', { id: 3 });
   * // => "/users/3"
   *
   * router.use(function (ctx, next) {
   *   // redirect to named route
   *   ctx.redirect(ctx.router.url('sign-in'));
   * })
   * ```
   *
   * @param {String} name route name
   * @param {Object} params url parameters
   * @returns {String|Error}
   */
  url(name, params) {
    const route = this.route(name);
    
    if (route) {
      const args = Array.prototype.slice.call(arguments, 1);
      return route.url.apply(route, args);
    }
    
    return new Error("No route found for name: " + name);
  }
  
  /**
   * Match given `path` and return corresponding routes.
   *
   * @param {String} path
   * @param {String} method
   * @returns {Object.<path, pathAndMethod>} returns layers that matched path and
   * path and method.
   * @private
   */
  match(path, method) {
    const layers = this.stack;
    let layer;
    const matched = {
      path: [],
      pathAndMethod: [],
      route: false
    };
    
    for (let len = layers.length, i = 0; i < len; i++) {
      layer = layers[i];
      
      if (layer.match(path)) {
        matched.path.push(layer);
        
        if (layer.methods.length === 0 || ~layer.methods.indexOf(method)) {
          matched.pathAndMethod.push(layer);
          if (layer.methods.length) matched.route = true;
        }
      }
    }
    
    return matched;
  }
  
  /**
   * Run middleware for named route parameters. Useful for auto-loading or
   * validation.
   *
   * @example
   *
   * ```javascript
   * router
   *   .param('user', function (id, ctx, next) {
   *     ctx.user = users[id];
   *     if (!ctx.user) return ctx.status = 404;
   *     return next();
   *   })
   *   .get('/users/:user', function (ctx) {
   *     ctx.body = ctx.user;
   *   })
   *   .get('/users/:user/friends', function (ctx) {
   *     return ctx.user.getFriends().then(function(friends) {
   *       ctx.body = friends;
   *     });
   *   })
   *   // /users/3 => {"id": 3, "name": "Alex"}
   *   // /users/3/friends => [{"id": 4, "name": "TJ"}]
   * ```
   *
   * @param {String} param
   * @param {Function} middleware
   * @returns {Router}
   */
  param(param, middleware) {
    this.params[param] = middleware;
    this.stack.forEach(route => route.param(param, middleware));
    return this;
  }
  
  /**
   * Generate URL from url pattern and given `params`.
   *
   * @example
   *
   * ```javascript
   * var url = Router.url('/users/:id', {id: 1});
   * // => "/users/1"
   * ```
   *
   * @param {String} path url pattern
   * @param {Object} params url parameters
   * @returns {String}
   */
  static url(path, params) {
    return Layer.prototype.url.call({path: path}, params);
  }
}

function isRule(arg) {
  return (is.string(arg) && (arg[0] === '/' || arg === '*')) || arg instanceof RegExp;
}

/**
 * filter empty fns
 * @param fn
 * @param index
 * @returns {*}
 */
function filter(fn, index) {
  if (index === 0) return fn;
  return is.function(fn);
}