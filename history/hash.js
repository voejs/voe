import History from './history';
import Url from 'url';

/**
 * HashChange 模式下的history处理类
 * @since 1.0.0
 */
export default class HashChange extends History {
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
    const location = global.location;
    const hash = location.hash;
    const obj = Url.parse(hash.length ? hash.substr(1) : '/', true);
    obj.host = location.host;
    obj.hostname = location.hostname;
    obj.port = location.port;
    obj.protocol = location.protocol;
    obj.auth = location.auth;
    return obj;
  }
  
  /**
   * 创建服务，自定义请求Request处理函数
   * @param callback <(req, res)>
   * @returns {*}
   */
  createServer(callback) {
    return this.callback('hashchange', callback);
  }
  
  /**
   * 跳转地址
   * @param url
   */
  redirect(url) {
    global.location.hash = url;
  }
  
  /**
   * 覆盖地址
   * @param url
   */
  replace(url) {
    const i = global.location.href.indexOf('#');
    global.location.replace(
      global.location.href.slice(0, i >= 0 ? i : 0) + '#' + url
    )
  }
}