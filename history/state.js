import History from './history';
import Url from 'url';

/**
 * PopState 模式下的history处理类
 * @since 1.0.0
 */
export default class PopState extends History {
  /**
   * 初始化的时候，必须传入原服务对象
   * @param app
   */
  constructor(app) {
    super();
    this.app = app;
  }
  
  /**
   * 修正当前请求的URI资源数据信息
   * @returns {*}
   */
  url() {
    return Url.parse(global.location.href, true);
  }
  
  /**
   * 创建服务，自定义请求Request处理函数
   * @param callback <(req, res)>
   * @returns {*}
   */
  createServer(callback) {
    return this.callback('popstate', callback);
  }
  
  /**
   * 跳转地址
   * @param url
   */
  redirect(url) {
    global.history.pushState({}, global.document.title, url);
    this._handler();
  }
  
  /**
   * 覆盖地址
   * @param url
   */
  replace(url) {
    global.history.replaceState({}, global.document.title, url);
    this._handler();
  }
}