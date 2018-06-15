import { SuperVuex } from 'super-vuex';
import System from './system';
const Store = new SuperVuex();
Store.setModule(System);
export default Store.init();