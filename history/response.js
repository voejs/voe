export default class Response {
  constructor(server) {
    this.server = server;
  }
  
  /**
   * res.redirect
   * 跳转链接
   * @param url
   */
  redirect(url) {
    this.server.redirect(url);
  }
  
  /**
   * res.replace
   * 覆盖链接
   * @param url
   */
  replace(url) {
    this.server.replace(url);
  }
  
  /**
   * 基于Vue的render方法，用来出来区域渲染
   * @param view
   * @param data
   */
  render(view, data) {
    this.server.app.render(view, data);
  }
  
  realod() {
    this.server.reload();
  }
}