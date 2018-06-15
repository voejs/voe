const delegate = require('delegates');
const toString = Object.prototype.toString;
const proto = {
  /**
   * throw an error
   * @param msg
   * @param code
   */
  throw(msg, code) {
    let err;
    if (isError(msg)) {
      err = msg;
    } else {
      err = new Error(msg);
    }
    if (code) {
      err.code = code;
      err.status = code;
    }
    throw err;
  },
  onerror(err) {
    if (null == err) return;
    this.app.emit('error', err, this);
  },
  get store() {
    return this.app.store;
  }
};

export default proto;

function isError(msg) {
  return msg instanceof Error || toString.call(msg) === '[object Error]';
}

delegate(proto, 'response')
  .method('redirect')
  .method('replace')
  .method('reload')
  .method('render');

delegate(proto, 'request')
  .access('search')
  .access('method')
  .access('query')
  .access('path')
  .access('url')
  .getter('protocol')
  .getter('host')
  .getter('hostname')
  .getter('secure');
