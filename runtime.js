import Voe from './index';
import App from '@voe-cwd/App.vue';
import * as Cache from '@voe-cache';
const voe = new Voe(Cache);
voe.emit('beforeInjectRoutes');
voe.use(voe.router.routes());
voe.emit('beforeServerStart');
voe.listen(App);
voe.emit('serverStarted');