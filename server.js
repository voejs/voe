import Vue from 'vue';
import Renderer from './components/render';
import { hashChange, popState } from "./history";
import store from './store/index';

/**
 * 前端服务层
 * @since 1.0.0
 */
export default class Server {
  constructor(isPopState, app) {
    const that = this;
    this.server = isPopState ? new popState(this) : new hashChange(this);
    this.store = store;
    Vue.component('render', Renderer);
    Vue.prototype.$server = this;
    Vue.prototype.$app = app;
    this._bindMethods();
    this._bindContext();
    this._bindDirectives();
  }
  
  _bindDirectives() {
    const that = this;
    ['redirect', 'replace', 'render', 'reload'].forEach(name => {
      Vue.directive(name, {
        bind(el) {
          if (el.__click_Callback__) el.removeEventListener('click', el.__click_Callback__);
          el.__click_Callback__ = () => {
            const url = el.url;
            if (url && that._ctx && that._ctx[name]) {
              that._ctx[name](url);
            }
          };
          el.addEventListener('click', el.__click_Callback__);
        },
        unbind(el) {
          if (el.__click_Callback__) {
            el.removeEventListener('click', el.__click_Callback__);
          }
        },
        update(el, binding) {
          el.url = binding.value;
        },
        componentUpdated(el, binding) {
          el.url = binding.value;
        }
      })
    });
  }
  
  _bindContext() {
    const that = this;
    Object.defineProperty(Vue.prototype, '$ctx', {
      get() {
        return that._ctx;
      }
    });
  }
  
  _bindMethods() {
    ['$redirect', '$replace', '$render', '$reload'].forEach(name => {
      Vue.prototype[name] = function(...args) {
        if (!this.$ctx) throw new Error('Can not find `this.$ctx`');
        this.$ctx[name](...args);
      }
    });
  }
  
  /**
   * 渲染模板和数据
   * @param view
   * @param data
   */
  render(view, data) {
    this.store.system.commit('render', function(render) {
      return render(view, { props: data });
    });
  }
  
  /**
   * 创建服务
   * @param callback
   * @returns {Server}
   */
  createServer(callback) {
    this.server.createServer(callback);
    return this;
  }
  
  /**
   * 监听服务
   * 返回一个可以停止监听的函数
   * @param App
   * @returns {Function}
   */
  listen(App) {
    const root = global.document.createElement('div');
    global.document.body.appendChild(root);
    this.vue = new Vue({
      el: root,
      store: this.store,
      render: h => h(App || Renderer)
    });
    const unBind = this.server.listen();
    return () => {
      this.vue.$destroy();
      unBind();
    }
  }
}