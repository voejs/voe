import ApplicationService from './framework/application';
import intersect from '@evio/intersect';
import Router from './router';
import Vue from 'vue';
import Store from './store/index';
import Loader from './loader/index';
import Common from './loader/common';
import Application from './framework/application';
import Context from './framework/context';
import Request from './framework/request';
import Response from './framework/response';

const originalPrototypes = {
  request: Request,
  response: Response,
  context: Context,
  application: Application,
};

/**
 * plugin constructor
 * store something for invoking
 */
class pluginStructure {
  constructor(app, plugin, pluginConfig) {
    this.app = app;
    this.name = plugin.name;
    this.config = pluginConfig[plugin.name] || {};
    plugin.dependencies.forEach(dep => {
      if (this[dep] !== undefined) {
        throw new Error(`you can not set ${dep} dependency on plugin constructor, because it is exists.`);
      }
      Object.defineProperty(this, dep, {
        get() {
          return app.plugins[dep];
        }
      })
    })
  }
}

export default class Voe extends ApplicationService {
  constructor(cache) {
    const configs = Object.assign({}, ...cache.vars.config.map(cfg => cache.map[cfg]));
    super(!!configs.popState);
    this.config = configs;
    this.router = new Router(this, configs.router);
    this._common = new Common();
    this.store = Store;
    this.plugins = {};
    if (cache) {
      this.parse(cache);
    }
  }
  
  parse({ map, vars }) {
    this._controller(map, vars.controller);
    this._middlewares(map, vars.middleware);
    this._service(map, vars.service);
    this._extendContext(map, vars.extend_context);
    this._extendApplication(map, vars.extend_application);
    this._extendRequest(map, vars.extend_request);
    this._extendResponse(map, vars.extend_response);
    this._components(map, vars.components);
    this._webstore(map, vars.webstore);
    this._webview(map, vars.webview);
    this._router(map, vars.router);
    this._error(map, vars.error);
    this._plugin(map, vars.plugin, vars.plugin_config);
  }
  
  _plugin(map, list, config) {
    const pluginConfigs = Object.assign({}, ...config.map(cfg => map[cfg] || {}));
    sortDependencies(list).forEach(cp => {
      this.plugins[cp.name] = new pluginStructure(this, cp, pluginConfigs);
      if (map[cp.module]) map[cp.module](this);
    });
  }
  
  _components(map, components) {
    for (let i = 0; i < components.length; i++) {
      const component = components[i];
      const target = map[component];
      if (target && target.name) {
        Vue.component(target.name, target);
      }
    }
  }
  
  _webstore(map, webstore) {
    webstore.forEach(store => {
      if (map[store]) {
        Store.$connect.registerModule(map[store]);
      }
    });
  }
  
  _webview(map, webview) {
    this.context.webview = getObject(webview, map);
  }
  
  _router(map, router) {
    router.forEach(route => {
      if (typeof map[route] === 'function') {
        map[route](this);
      }
    })
  }
  
  _error(map, error) {
    error.forEach(err => {
      if (typeof map[err] === 'function') {
        this.on('error', map[err]);
      }
    })
  }
  
  _controller(map, controller) {
    new Loader(controller, map, {
      target: this.controller = {},
      call: true,
      inject: this,
      initializer: this._common.controller.bind(this._common)
    }).load();
  }
  
  _middlewares(map, middleware) {
    new Loader(middleware, map, {
      target: this.middleware = {},
      call: true,
      inject: this
    }).load();
  }
  
  _service(map, service) {
    new Loader(service, map, {
      target: this.service = {},
      inject: this,
      property: 'service',
      inContext: true,
    }).load();
  }
  
  _extend(map, name, result, target, inject) {
    this._common.extends(name, result, target, {
      inject: inject,
      override: false,
      originalPrototypes: originalPrototypes,
      map
    });
  }
  
  _extendContext(map, data) {
    this._extend(map, 'context', data, this.context, this);
  }
  
  _extendApplication(map, data) {
    this._extend(map, 'application', data, this, this);
  }
  
  _extendRequest(map, data) {
    this._extend(map, 'request', data, this.request, this);
  }
  
  _extendResponse(map, data) {
    this._extend(map, 'response', data, this.response, this);
  }
}

function getObject(data, map, callback) {
  const result = {};
  for (const i in data) {
    const value = data[i];
    if (typeof value === 'string') {
      if (callback) {
        result[i] = callback(map[value]);
      } else {
        result[i] = map[value];
      }
    } else {
      result[i] = getObject(value, map, callback);
    }
  }
  return result;
}

function sortDependencies(tree) {
  const s = Object.keys(tree);
  const m = [];
  let j = s.length;
  while (j--) {
    const obj = tree[s[j]];
    if (obj.dependencies.length) {
      const res = intersect(obj.dependencies, s);
      if (res.removes.length) {
        throw new Error(`模块[${s[j]}]依赖模块不存在：${res.removes.join(',')}`);
      }
    }
    Object.defineProperty(obj, 'deep', {
      get() {
        if (!obj.dependencies.length) return 0;
        return Math.max(...obj.dependencies.map(d => tree[d] ? tree[d].deep : 0)) + 1;
      }
    });
  }
  
  for (const i in tree) {
    tree[i].name = i;
    m.push(tree[i]);
  }
  
  return m.sort((a, b) => a.deep - b.deep);
}