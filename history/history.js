import Response from './response';

/**
 * History 原型函数
 * @since 1.0.0
 */
export default class History {
  /**
   * 初始化
   * @var _eventName 事件名
   * @var _handler request处理函数
   * @var _request Request
   * @var _response Response
   */
  constructor() {
    this._eventName = null;
    this._handler = null;
    this._request = {};
    this._response = new Response(this);
  }
  
  /**
   * 监听浏览器跳转事件并自动处理自定义回调函数
   * @returns {function(): void}
   */
  listen() {
    if (!this._eventName || typeof this._handler !== 'function' || typeof this._handler !== 'function') {
      throw new Error('Server cant not been started, you should use `createServer` first.');
    }
    global.addEventListener(this._eventName, this._handler);
    this._handler();
    return () => global.removeEventListener(this._eventName);
  }
  
  /**
   * 生成自定义处理函数方法
   * @param name
   * @param callback
   * @returns {History}
   */
  callback(name, callback) {
    if (typeof this.url !== 'function') throw new Error('How to format url? Miss `url` method.');
    this._eventName = name;
    this._handler = (canReload) => {
      const request = this.url();
      if ((request.href !== this._request.href) || canReload) {
        this._request = request;
        callback(this._request, this._response);
      }
    };
    return this;
  }
  
  /**
   * reload page
   */
  reload() {
    this._handler(true);
  }
}