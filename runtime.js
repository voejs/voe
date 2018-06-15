import Voe from './index';
import App from '@voe-cwd/App.vue';
import * as Cache from '@voe-cache';
const voe = new Voe(Cache);
voe.use(voe.router.routes());
voe.listen(App);