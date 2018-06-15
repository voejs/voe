export default {
  redirect(...args) { return this.res.redirect(...args); },
  replace(...args) { return this.res.replace(...args); },
  render(...args) { return this.res.render(...args); },
  reload() { return this.res.reload(); }
}