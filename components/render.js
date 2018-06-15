export default {
  name: 'webViewRenderer',
  render(h) {
    const renderer = this.$store.state.system.render;
    return renderer ? renderer(h) : null;
  }
}