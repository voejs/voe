const toString = Object.prototype.toString;
export default {
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
  }
}

function isError(msg) {
  return msg instanceof Error || toString.call(msg) === '[object Error]';
}