import is from 'is-type-of';
import defaultConfigs from './config';

const hasOwnProperty = Object.prototype.hasOwnProperty;

class ClassLoader {
  constructor(options) {
    if (!options.ctx) {
      throw new Error('options.ctx is required');
    }
    const properties = options.properties;
    this._cache = new Map();
    this._ctx = options.ctx;
    
    for (const property in properties) {
      this.defineProperty(property, properties[property], options.runtime);
    }
  }
  
  defineProperty(property, values, runtime) {
    Object.defineProperty(this, property, {
      get() {
        let instance = this._cache.get(property);
        if (!instance) {
          instance = getInstance(values, this._ctx, runtime);
          this._cache.set(property, instance);
        }
        return instance;
      },
    });
  }
}

export default class Loader {
  constructor(data, map, options) {
    this.data = data;
    this.map = map;
    this.options = Object.assign({}, defaultConfigs, options);
    this.inContext();
  }
  
  inContext() {
    if (this.options.inContext) {
      if (!this.options.property) throw new Error('options.property is required');
    
      const runtime = this.options.runtime;
      const target = this.options.target || {};
      const app = this.options.inject;
      const property = this.options.property;
    
      Object.defineProperty(app.context, property, {
        get() {
          if (!this.CLASSLOADER) this.CLASSLOADER = {};
          const classLoader = this.CLASSLOADER;
          let instance = classLoader[property];
          if (!instance) {
            instance = getInstance(target, this, runtime);
            classLoader[property] = instance;
          }
          return instance;
        }
      });
    }
  }
  
  parse(data, path = []) {
    if (!data) data = this.data;
    let items = [];
    const map = this.map;
    for (const i in data) {
      if (hasOwnProperty.call(data, i)) {
        const paths = path.slice();
        paths.push(i);
        if (typeof data[i] === 'string' && map[data[i]]) {
          items.push({
            properties: paths,
            exports: this.getExports(map[data[i]]),
          });
        } else {
          items = items.concat(this.parse(data[i], paths));
        }
      }
    }
    return items;
  }
  
  getExports(result) {
    const { initializer, call, inject } = this.options;
    if (initializer) result = initializer(result, this.options);
    const isClass = result.toString().indexOf('Cannot call a class as a function') > -1;
    if (isClass || is.class(result) || is.generatorFunction(result) || is.asyncFunction(result)) {
      return result;
    }
    if (call && is.function(result) && inject) {
      result = result(inject);
      if (result != null) {
        return result;
      }
    }
    return result;
  }
  
  load() {
    const items = this.parse();
    const target = this.options.target;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      item.properties.reduce((target, property, index) => {
        let obj;
        const properties = item.properties.slice(0, index + 1).join('.');
        if (index === item.properties.length - 1) {
          if (property in target) {
            if (!this.options.override) {
              throw new Error(`can't overwrite property '${properties}'`);
            }
          }
          obj = item.exports;
          // 如果是函数类型
          if (obj && !is.primitive(obj)) {
            obj.EXPORTS = true;
          }
        } else {
          obj = target[property] || {};
        }
        
        target[property] = obj;
        return obj;
      }, target);
    }
    return items.length;
  }
}

function getInstance(values, ctx, runtime) {
  const Class = values.EXPORTS ? values : null;
  let instance;
  if (Class) {
    if (is.class(Class)) {
      if (is.function(runtime)) {
        instance = runtime(Class, ctx);
      } else {
        instance = new Class(ctx);
      }
    } else {
      instance = Class;
    }
  }
  else if (is.primitive(values)) { instance = values; }
  else { instance = new ClassLoader({ ctx, properties: values, runtime }); }
  return instance;
}
