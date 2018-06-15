import is from 'is-type-of';

export default class Common {
  controller(obj, options) {
    if (
      is.function(obj) &&
      !is.generatorFunction(obj) &&
      !is.class(obj) &&
      !is.asyncFunction(obj)
    ) obj = obj(options.inject);
    
    if (is.class(obj)) {
      return this.wrapClass(obj);
    }
    return obj;
  }
  
  wrapClass(Controller) {
    let proto = Controller.prototype;
    const ret = {};
    // tracing the prototype chain
    while (proto !== Object.prototype) {
      const keys = Object.getOwnPropertyNames(proto);
      for (const key of keys) {
        // getOwnPropertyNames will return constructor
        // that should be ignored
        if (key === 'constructor') {
          continue;
        }
        // skip getter, setter & non-function properties
        const d = Object.getOwnPropertyDescriptor(proto, key);
        // prevent to override sub method
        if (is.function(d.value) && !ret.hasOwnProperty(key)) {
          ret[key] = methodToMiddleware(Controller, key);
        }
      }
      proto = Object.getPrototypeOf(proto);
    }
    
    return ret;
    
    function methodToMiddleware(Controller, key) {
      return function classControllerMiddleware(ctx, next) {
        const controller = new Controller(ctx);
        return controller[key].call(controller, ctx, next);
      };
    }
  }
  
  extends(name, result, proto, options = {}) {
    const { inject, override, originalPrototypes, map } = options;
    for (let i = 0, j = result.length; i < j; i++) {
      const file = result[i];
      if (!map[file]) continue;
      let fileExports = map[file];
      if (is.function(fileExports)) fileExports = fileExports(inject);
      const mergedRecords = new Map();
      const properties = Object.getOwnPropertyNames(fileExports).concat(Object.getOwnPropertySymbols(fileExports));
      for (const property of properties) {
        if (mergedRecords.has(property) && !override) {
          throw new Error(`Property: "${property}" already exists in "${mergedRecords.get(property)}"`);
        }
        let descriptor = Object.getOwnPropertyDescriptor(fileExports, property);
        let originalDescriptor = Object.getOwnPropertyDescriptor(proto, property);
        if (!originalDescriptor) {
          // try to get descriptor from originalPrototypes
          const originalProto = originalPrototypes[name];
          if (originalProto) {
            originalDescriptor = Object.getOwnPropertyDescriptor(originalProto, property);
          }
        }
        if (originalDescriptor) {
          // don't override descriptor
          descriptor = Object.assign({}, descriptor);
          if (!descriptor.set && originalDescriptor.set) {
            descriptor.set = originalDescriptor.set;
          }
          if (!descriptor.get && originalDescriptor.get) {
            descriptor.get = originalDescriptor.get;
          }
        }
        Object.defineProperty(proto, property, descriptor);
        mergedRecords.set(property, file);
      }
    }
  }
}