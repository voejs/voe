const toString = Function.prototype.toString;

function fnBody(fn) {
  return toString.call(fn).replace(/^[^{]*{\s*/,'').replace(/\s*}[^}]*$/,'');
}

export default function isClass(fn) {
  return (typeof fn === 'function' &&
    (/^class(\s|\{\}$)/.test(toString.call(fn)) ||
      (/^.*classCallCheck\(/.test(fnBody(fn))) ||
        (fn.toString().indexOf('Cannot call a class as a function') > -1)) // babel.js
  );
}