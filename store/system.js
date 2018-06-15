import { ChildVuex } from 'super-vuex';
const child = new ChildVuex('system');
export default child;

child.setState({
  render: null
});