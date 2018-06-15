import Voe from './index';
import App from '@voe-cwd/App.vue';
import * as Cache from '@voe-cache';
const voe = new Voe(process.env.VOE_RUN_TYPE === 'popstate', Cache);
voe.use(voe.router.routes());
voe.listen(App);