"use strict";
(() => {
  var __defProp = Object.defineProperty;
  var __defProps = Object.defineProperties;
  var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
  var __getOwnPropSymbols = Object.getOwnPropertySymbols;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __propIsEnum = Object.prototype.propertyIsEnumerable;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __spreadValues = (a3, b) => {
    for (var prop in b || (b = {}))
      if (__hasOwnProp.call(b, prop))
        __defNormalProp(a3, prop, b[prop]);
    if (__getOwnPropSymbols)
      for (var prop of __getOwnPropSymbols(b)) {
        if (__propIsEnum.call(b, prop))
          __defNormalProp(a3, prop, b[prop]);
      }
    return a3;
  };
  var __spreadProps = (a3, b) => __defProps(a3, __getOwnPropDescs(b));
  var __async = (__this, __arguments, generator) => {
    return new Promise((resolve, reject) => {
      var fulfilled = (value) => {
        try {
          step(generator.next(value));
        } catch (e3) {
          reject(e3);
        }
      };
      var rejected = (value) => {
        try {
          step(generator.throw(value));
        } catch (e3) {
          reject(e3);
        }
      };
      var step = (x2) => x2.done ? resolve(x2.value) : Promise.resolve(x2.value).then(fulfilled, rejected);
      step((generator = generator.apply(__this, __arguments)).next());
    });
  };

  // node_modules/preact/dist/preact.module.js
  var n;
  var l;
  var u;
  var t;
  var i;
  var r;
  var o;
  var e;
  var f;
  var c;
  var s;
  var a;
  var h;
  var p = {};
  var v = [];
  var y = /acit|ex(?:s|g|n|p|$)|rph|grid|ows|mnc|ntw|ine[ch]|zoo|^ord|itera/i;
  var d = Array.isArray;
  function w(n2, l3) {
    for (var u4 in l3) n2[u4] = l3[u4];
    return n2;
  }
  function g(n2) {
    n2 && n2.parentNode && n2.parentNode.removeChild(n2);
  }
  function _(l3, u4, t3) {
    var i3, r3, o3, e3 = {};
    for (o3 in u4) "key" == o3 ? i3 = u4[o3] : "ref" == o3 ? r3 = u4[o3] : e3[o3] = u4[o3];
    if (arguments.length > 2 && (e3.children = arguments.length > 3 ? n.call(arguments, 2) : t3), "function" == typeof l3 && null != l3.defaultProps) for (o3 in l3.defaultProps) void 0 === e3[o3] && (e3[o3] = l3.defaultProps[o3]);
    return m(l3, e3, i3, r3, null);
  }
  function m(n2, t3, i3, r3, o3) {
    var e3 = { type: n2, props: t3, key: i3, ref: r3, __k: null, __: null, __b: 0, __e: null, __c: null, constructor: void 0, __v: null == o3 ? ++u : o3, __i: -1, __u: 0 };
    return null == o3 && null != l.vnode && l.vnode(e3), e3;
  }
  function k(n2) {
    return n2.children;
  }
  function x(n2, l3) {
    this.props = n2, this.context = l3;
  }
  function S(n2, l3) {
    if (null == l3) return n2.__ ? S(n2.__, n2.__i + 1) : null;
    for (var u4; l3 < n2.__k.length; l3++) if (null != (u4 = n2.__k[l3]) && null != u4.__e) return u4.__e;
    return "function" == typeof n2.type ? S(n2) : null;
  }
  function C(n2) {
    if (n2.__P && n2.__d) {
      var u4 = n2.__v, t3 = u4.__e, i3 = [], r3 = [], o3 = w({}, u4);
      o3.__v = u4.__v + 1, l.vnode && l.vnode(o3), z(n2.__P, o3, u4, n2.__n, n2.__P.namespaceURI, 32 & u4.__u ? [t3] : null, i3, null == t3 ? S(u4) : t3, !!(32 & u4.__u), r3), o3.__v = u4.__v, o3.__.__k[o3.__i] = o3, V(i3, o3, r3), u4.__e = u4.__ = null, o3.__e != t3 && M(o3);
    }
  }
  function M(n2) {
    if (null != (n2 = n2.__) && null != n2.__c) return n2.__e = n2.__c.base = null, n2.__k.some(function(l3) {
      if (null != l3 && null != l3.__e) return n2.__e = n2.__c.base = l3.__e;
    }), M(n2);
  }
  function $(n2) {
    (!n2.__d && (n2.__d = true) && i.push(n2) && !I.__r++ || r != l.debounceRendering) && ((r = l.debounceRendering) || o)(I);
  }
  function I() {
    for (var n2, l3 = 1; i.length; ) i.length > l3 && i.sort(e), n2 = i.shift(), l3 = i.length, C(n2);
    I.__r = 0;
  }
  function P(n2, l3, u4, t3, i3, r3, o3, e3, f4, c3, s3) {
    var a3, h4, y3, d3, w3, g2, _2, m3 = t3 && t3.__k || v, b = l3.length;
    for (f4 = A(u4, l3, m3, f4, b), a3 = 0; a3 < b; a3++) null != (y3 = u4.__k[a3]) && (h4 = -1 != y3.__i && m3[y3.__i] || p, y3.__i = a3, g2 = z(n2, y3, h4, i3, r3, o3, e3, f4, c3, s3), d3 = y3.__e, y3.ref && h4.ref != y3.ref && (h4.ref && D(h4.ref, null, y3), s3.push(y3.ref, y3.__c || d3, y3)), null == w3 && null != d3 && (w3 = d3), (_2 = !!(4 & y3.__u)) || h4.__k === y3.__k ? f4 = H(y3, f4, n2, _2) : "function" == typeof y3.type && void 0 !== g2 ? f4 = g2 : d3 && (f4 = d3.nextSibling), y3.__u &= -7);
    return u4.__e = w3, f4;
  }
  function A(n2, l3, u4, t3, i3) {
    var r3, o3, e3, f4, c3, s3 = u4.length, a3 = s3, h4 = 0;
    for (n2.__k = new Array(i3), r3 = 0; r3 < i3; r3++) null != (o3 = l3[r3]) && "boolean" != typeof o3 && "function" != typeof o3 ? ("string" == typeof o3 || "number" == typeof o3 || "bigint" == typeof o3 || o3.constructor == String ? o3 = n2.__k[r3] = m(null, o3, null, null, null) : d(o3) ? o3 = n2.__k[r3] = m(k, { children: o3 }, null, null, null) : void 0 === o3.constructor && o3.__b > 0 ? o3 = n2.__k[r3] = m(o3.type, o3.props, o3.key, o3.ref ? o3.ref : null, o3.__v) : n2.__k[r3] = o3, f4 = r3 + h4, o3.__ = n2, o3.__b = n2.__b + 1, e3 = null, -1 != (c3 = o3.__i = T(o3, u4, f4, a3)) && (a3--, (e3 = u4[c3]) && (e3.__u |= 2)), null == e3 || null == e3.__v ? (-1 == c3 && (i3 > s3 ? h4-- : i3 < s3 && h4++), "function" != typeof o3.type && (o3.__u |= 4)) : c3 != f4 && (c3 == f4 - 1 ? h4-- : c3 == f4 + 1 ? h4++ : (c3 > f4 ? h4-- : h4++, o3.__u |= 4))) : n2.__k[r3] = null;
    if (a3) for (r3 = 0; r3 < s3; r3++) null != (e3 = u4[r3]) && 0 == (2 & e3.__u) && (e3.__e == t3 && (t3 = S(e3)), E(e3, e3));
    return t3;
  }
  function H(n2, l3, u4, t3) {
    var i3, r3;
    if ("function" == typeof n2.type) {
      for (i3 = n2.__k, r3 = 0; i3 && r3 < i3.length; r3++) i3[r3] && (i3[r3].__ = n2, l3 = H(i3[r3], l3, u4, t3));
      return l3;
    }
    n2.__e != l3 && (t3 && (l3 && n2.type && !l3.parentNode && (l3 = S(n2)), u4.insertBefore(n2.__e, l3 || null)), l3 = n2.__e);
    do {
      l3 = l3 && l3.nextSibling;
    } while (null != l3 && 8 == l3.nodeType);
    return l3;
  }
  function T(n2, l3, u4, t3) {
    var i3, r3, o3, e3 = n2.key, f4 = n2.type, c3 = l3[u4], s3 = null != c3 && 0 == (2 & c3.__u);
    if (null === c3 && null == e3 || s3 && e3 == c3.key && f4 == c3.type) return u4;
    if (t3 > (s3 ? 1 : 0)) {
      for (i3 = u4 - 1, r3 = u4 + 1; i3 >= 0 || r3 < l3.length; ) if (null != (c3 = l3[o3 = i3 >= 0 ? i3-- : r3++]) && 0 == (2 & c3.__u) && e3 == c3.key && f4 == c3.type) return o3;
    }
    return -1;
  }
  function j(n2, l3, u4) {
    "-" == l3[0] ? n2.setProperty(l3, null == u4 ? "" : u4) : n2[l3] = null == u4 ? "" : "number" != typeof u4 || y.test(l3) ? u4 : u4 + "px";
  }
  function F(n2, l3, u4, t3, i3) {
    var r3, o3;
    n: if ("style" == l3) if ("string" == typeof u4) n2.style.cssText = u4;
    else {
      if ("string" == typeof t3 && (n2.style.cssText = t3 = ""), t3) for (l3 in t3) u4 && l3 in u4 || j(n2.style, l3, "");
      if (u4) for (l3 in u4) t3 && u4[l3] == t3[l3] || j(n2.style, l3, u4[l3]);
    }
    else if ("o" == l3[0] && "n" == l3[1]) r3 = l3 != (l3 = l3.replace(f, "$1")), o3 = l3.toLowerCase(), l3 = o3 in n2 || "onFocusOut" == l3 || "onFocusIn" == l3 ? o3.slice(2) : l3.slice(2), n2.l || (n2.l = {}), n2.l[l3 + r3] = u4, u4 ? t3 ? u4.u = t3.u : (u4.u = c, n2.addEventListener(l3, r3 ? a : s, r3)) : n2.removeEventListener(l3, r3 ? a : s, r3);
    else {
      if ("http://www.w3.org/2000/svg" == i3) l3 = l3.replace(/xlink(H|:h)/, "h").replace(/sName$/, "s");
      else if ("width" != l3 && "height" != l3 && "href" != l3 && "list" != l3 && "form" != l3 && "tabIndex" != l3 && "download" != l3 && "rowSpan" != l3 && "colSpan" != l3 && "role" != l3 && "popover" != l3 && l3 in n2) try {
        n2[l3] = null == u4 ? "" : u4;
        break n;
      } catch (n3) {
      }
      "function" == typeof u4 || (null == u4 || false === u4 && "-" != l3[4] ? n2.removeAttribute(l3) : n2.setAttribute(l3, "popover" == l3 && 1 == u4 ? "" : u4));
    }
  }
  function O(n2) {
    return function(u4) {
      if (this.l) {
        var t3 = this.l[u4.type + n2];
        if (null == u4.t) u4.t = c++;
        else if (u4.t < t3.u) return;
        return t3(l.event ? l.event(u4) : u4);
      }
    };
  }
  function z(n2, u4, t3, i3, r3, o3, e3, f4, c3, s3) {
    var a3, h4, p3, y3, _2, m3, b, S2, C3, M2, $2, I2, A2, H2, L, T3 = u4.type;
    if (void 0 !== u4.constructor) return null;
    128 & t3.__u && (c3 = !!(32 & t3.__u), o3 = [f4 = u4.__e = t3.__e]), (a3 = l.__b) && a3(u4);
    n: if ("function" == typeof T3) try {
      if (S2 = u4.props, C3 = "prototype" in T3 && T3.prototype.render, M2 = (a3 = T3.contextType) && i3[a3.__c], $2 = a3 ? M2 ? M2.props.value : a3.__ : i3, t3.__c ? b = (h4 = u4.__c = t3.__c).__ = h4.__E : (C3 ? u4.__c = h4 = new T3(S2, $2) : (u4.__c = h4 = new x(S2, $2), h4.constructor = T3, h4.render = G), M2 && M2.sub(h4), h4.state || (h4.state = {}), h4.__n = i3, p3 = h4.__d = true, h4.__h = [], h4._sb = []), C3 && null == h4.__s && (h4.__s = h4.state), C3 && null != T3.getDerivedStateFromProps && (h4.__s == h4.state && (h4.__s = w({}, h4.__s)), w(h4.__s, T3.getDerivedStateFromProps(S2, h4.__s))), y3 = h4.props, _2 = h4.state, h4.__v = u4, p3) C3 && null == T3.getDerivedStateFromProps && null != h4.componentWillMount && h4.componentWillMount(), C3 && null != h4.componentDidMount && h4.__h.push(h4.componentDidMount);
      else {
        if (C3 && null == T3.getDerivedStateFromProps && S2 !== y3 && null != h4.componentWillReceiveProps && h4.componentWillReceiveProps(S2, $2), u4.__v == t3.__v || !h4.__e && null != h4.shouldComponentUpdate && false === h4.shouldComponentUpdate(S2, h4.__s, $2)) {
          u4.__v != t3.__v && (h4.props = S2, h4.state = h4.__s, h4.__d = false), u4.__e = t3.__e, u4.__k = t3.__k, u4.__k.some(function(n3) {
            n3 && (n3.__ = u4);
          }), v.push.apply(h4.__h, h4._sb), h4._sb = [], h4.__h.length && e3.push(h4);
          break n;
        }
        null != h4.componentWillUpdate && h4.componentWillUpdate(S2, h4.__s, $2), C3 && null != h4.componentDidUpdate && h4.__h.push(function() {
          h4.componentDidUpdate(y3, _2, m3);
        });
      }
      if (h4.context = $2, h4.props = S2, h4.__P = n2, h4.__e = false, I2 = l.__r, A2 = 0, C3) h4.state = h4.__s, h4.__d = false, I2 && I2(u4), a3 = h4.render(h4.props, h4.state, h4.context), v.push.apply(h4.__h, h4._sb), h4._sb = [];
      else do {
        h4.__d = false, I2 && I2(u4), a3 = h4.render(h4.props, h4.state, h4.context), h4.state = h4.__s;
      } while (h4.__d && ++A2 < 25);
      h4.state = h4.__s, null != h4.getChildContext && (i3 = w(w({}, i3), h4.getChildContext())), C3 && !p3 && null != h4.getSnapshotBeforeUpdate && (m3 = h4.getSnapshotBeforeUpdate(y3, _2)), H2 = null != a3 && a3.type === k && null == a3.key ? q(a3.props.children) : a3, f4 = P(n2, d(H2) ? H2 : [H2], u4, t3, i3, r3, o3, e3, f4, c3, s3), h4.base = u4.__e, u4.__u &= -161, h4.__h.length && e3.push(h4), b && (h4.__E = h4.__ = null);
    } catch (n3) {
      if (u4.__v = null, c3 || null != o3) if (n3.then) {
        for (u4.__u |= c3 ? 160 : 128; f4 && 8 == f4.nodeType && f4.nextSibling; ) f4 = f4.nextSibling;
        o3[o3.indexOf(f4)] = null, u4.__e = f4;
      } else {
        for (L = o3.length; L--; ) g(o3[L]);
        N(u4);
      }
      else u4.__e = t3.__e, u4.__k = t3.__k, n3.then || N(u4);
      l.__e(n3, u4, t3);
    }
    else null == o3 && u4.__v == t3.__v ? (u4.__k = t3.__k, u4.__e = t3.__e) : f4 = u4.__e = B(t3.__e, u4, t3, i3, r3, o3, e3, c3, s3);
    return (a3 = l.diffed) && a3(u4), 128 & u4.__u ? void 0 : f4;
  }
  function N(n2) {
    n2 && (n2.__c && (n2.__c.__e = true), n2.__k && n2.__k.some(N));
  }
  function V(n2, u4, t3) {
    for (var i3 = 0; i3 < t3.length; i3++) D(t3[i3], t3[++i3], t3[++i3]);
    l.__c && l.__c(u4, n2), n2.some(function(u5) {
      try {
        n2 = u5.__h, u5.__h = [], n2.some(function(n3) {
          n3.call(u5);
        });
      } catch (n3) {
        l.__e(n3, u5.__v);
      }
    });
  }
  function q(n2) {
    return "object" != typeof n2 || null == n2 || n2.__b > 0 ? n2 : d(n2) ? n2.map(q) : w({}, n2);
  }
  function B(u4, t3, i3, r3, o3, e3, f4, c3, s3) {
    var a3, h4, v3, y3, w3, _2, m3, b = i3.props || p, k3 = t3.props, x2 = t3.type;
    if ("svg" == x2 ? o3 = "http://www.w3.org/2000/svg" : "math" == x2 ? o3 = "http://www.w3.org/1998/Math/MathML" : o3 || (o3 = "http://www.w3.org/1999/xhtml"), null != e3) {
      for (a3 = 0; a3 < e3.length; a3++) if ((w3 = e3[a3]) && "setAttribute" in w3 == !!x2 && (x2 ? w3.localName == x2 : 3 == w3.nodeType)) {
        u4 = w3, e3[a3] = null;
        break;
      }
    }
    if (null == u4) {
      if (null == x2) return document.createTextNode(k3);
      u4 = document.createElementNS(o3, x2, k3.is && k3), c3 && (l.__m && l.__m(t3, e3), c3 = false), e3 = null;
    }
    if (null == x2) b === k3 || c3 && u4.data == k3 || (u4.data = k3);
    else {
      if (e3 = e3 && n.call(u4.childNodes), !c3 && null != e3) for (b = {}, a3 = 0; a3 < u4.attributes.length; a3++) b[(w3 = u4.attributes[a3]).name] = w3.value;
      for (a3 in b) w3 = b[a3], "dangerouslySetInnerHTML" == a3 ? v3 = w3 : "children" == a3 || a3 in k3 || "value" == a3 && "defaultValue" in k3 || "checked" == a3 && "defaultChecked" in k3 || F(u4, a3, null, w3, o3);
      for (a3 in k3) w3 = k3[a3], "children" == a3 ? y3 = w3 : "dangerouslySetInnerHTML" == a3 ? h4 = w3 : "value" == a3 ? _2 = w3 : "checked" == a3 ? m3 = w3 : c3 && "function" != typeof w3 || b[a3] === w3 || F(u4, a3, w3, b[a3], o3);
      if (h4) c3 || v3 && (h4.__html == v3.__html || h4.__html == u4.innerHTML) || (u4.innerHTML = h4.__html), t3.__k = [];
      else if (v3 && (u4.innerHTML = ""), P("template" == t3.type ? u4.content : u4, d(y3) ? y3 : [y3], t3, i3, r3, "foreignObject" == x2 ? "http://www.w3.org/1999/xhtml" : o3, e3, f4, e3 ? e3[0] : i3.__k && S(i3, 0), c3, s3), null != e3) for (a3 = e3.length; a3--; ) g(e3[a3]);
      c3 || (a3 = "value", "progress" == x2 && null == _2 ? u4.removeAttribute("value") : null != _2 && (_2 !== u4[a3] || "progress" == x2 && !_2 || "option" == x2 && _2 != b[a3]) && F(u4, a3, _2, b[a3], o3), a3 = "checked", null != m3 && m3 != u4[a3] && F(u4, a3, m3, b[a3], o3));
    }
    return u4;
  }
  function D(n2, u4, t3) {
    try {
      if ("function" == typeof n2) {
        var i3 = "function" == typeof n2.__u;
        i3 && n2.__u(), i3 && null == u4 || (n2.__u = n2(u4));
      } else n2.current = u4;
    } catch (n3) {
      l.__e(n3, t3);
    }
  }
  function E(n2, u4, t3) {
    var i3, r3;
    if (l.unmount && l.unmount(n2), (i3 = n2.ref) && (i3.current && i3.current != n2.__e || D(i3, null, u4)), null != (i3 = n2.__c)) {
      if (i3.componentWillUnmount) try {
        i3.componentWillUnmount();
      } catch (n3) {
        l.__e(n3, u4);
      }
      i3.base = i3.__P = null;
    }
    if (i3 = n2.__k) for (r3 = 0; r3 < i3.length; r3++) i3[r3] && E(i3[r3], u4, t3 || "function" != typeof n2.type);
    t3 || g(n2.__e), n2.__c = n2.__ = n2.__e = void 0;
  }
  function G(n2, l3, u4) {
    return this.constructor(n2, u4);
  }
  function J(u4, t3, i3) {
    var r3, o3, e3, f4;
    t3 == document && (t3 = document.documentElement), l.__ && l.__(u4, t3), o3 = (r3 = "function" == typeof i3) ? null : i3 && i3.__k || t3.__k, e3 = [], f4 = [], z(t3, u4 = (!r3 && i3 || t3).__k = _(k, null, [u4]), o3 || p, p, t3.namespaceURI, !r3 && i3 ? [i3] : o3 ? null : t3.firstChild ? n.call(t3.childNodes) : null, e3, !r3 && i3 ? i3 : o3 ? o3.__e : t3.firstChild, r3, f4), V(e3, u4, f4);
  }
  n = v.slice, l = { __e: function(n2, l3, u4, t3) {
    for (var i3, r3, o3; l3 = l3.__; ) if ((i3 = l3.__c) && !i3.__) try {
      if ((r3 = i3.constructor) && null != r3.getDerivedStateFromError && (i3.setState(r3.getDerivedStateFromError(n2)), o3 = i3.__d), null != i3.componentDidCatch && (i3.componentDidCatch(n2, t3 || {}), o3 = i3.__d), o3) return i3.__E = i3;
    } catch (l4) {
      n2 = l4;
    }
    throw n2;
  } }, u = 0, t = function(n2) {
    return null != n2 && void 0 === n2.constructor;
  }, x.prototype.setState = function(n2, l3) {
    var u4;
    u4 = null != this.__s && this.__s != this.state ? this.__s : this.__s = w({}, this.state), "function" == typeof n2 && (n2 = n2(w({}, u4), this.props)), n2 && w(u4, n2), null != n2 && this.__v && (l3 && this._sb.push(l3), $(this));
  }, x.prototype.forceUpdate = function(n2) {
    this.__v && (this.__e = true, n2 && this.__h.push(n2), $(this));
  }, x.prototype.render = k, i = [], o = "function" == typeof Promise ? Promise.prototype.then.bind(Promise.resolve()) : setTimeout, e = function(n2, l3) {
    return n2.__v.__b - l3.__v.__b;
  }, I.__r = 0, f = /(PointerCapture)$|Capture$/i, c = 0, s = O(false), a = O(true), h = 0;

  // node_modules/preact/hooks/dist/hooks.module.js
  var t2;
  var r2;
  var u2;
  var i2;
  var o2 = 0;
  var f2 = [];
  var c2 = l;
  var e2 = c2.__b;
  var a2 = c2.__r;
  var v2 = c2.diffed;
  var l2 = c2.__c;
  var m2 = c2.unmount;
  var s2 = c2.__;
  function p2(n2, t3) {
    c2.__h && c2.__h(r2, n2, o2 || t3), o2 = 0;
    var u4 = r2.__H || (r2.__H = { __: [], __h: [] });
    return n2 >= u4.__.length && u4.__.push({}), u4.__[n2];
  }
  function d2(n2) {
    return o2 = 1, h2(D2, n2);
  }
  function h2(n2, u4, i3) {
    var o3 = p2(t2++, 2);
    if (o3.t = n2, !o3.__c && (o3.__ = [i3 ? i3(u4) : D2(void 0, u4), function(n3) {
      var t3 = o3.__N ? o3.__N[0] : o3.__[0], r3 = o3.t(t3, n3);
      t3 !== r3 && (o3.__N = [r3, o3.__[1]], o3.__c.setState({}));
    }], o3.__c = r2, !r2.__f)) {
      var f4 = function(n3, t3, r3) {
        if (!o3.__c.__H) return true;
        var u5 = o3.__c.__H.__.filter(function(n4) {
          return n4.__c;
        });
        if (u5.every(function(n4) {
          return !n4.__N;
        })) return !c3 || c3.call(this, n3, t3, r3);
        var i4 = o3.__c.props !== n3;
        return u5.some(function(n4) {
          if (n4.__N) {
            var t4 = n4.__[0];
            n4.__ = n4.__N, n4.__N = void 0, t4 !== n4.__[0] && (i4 = true);
          }
        }), c3 && c3.call(this, n3, t3, r3) || i4;
      };
      r2.__f = true;
      var c3 = r2.shouldComponentUpdate, e3 = r2.componentWillUpdate;
      r2.componentWillUpdate = function(n3, t3, r3) {
        if (this.__e) {
          var u5 = c3;
          c3 = void 0, f4(n3, t3, r3), c3 = u5;
        }
        e3 && e3.call(this, n3, t3, r3);
      }, r2.shouldComponentUpdate = f4;
    }
    return o3.__N || o3.__;
  }
  function y2(n2, u4) {
    var i3 = p2(t2++, 3);
    !c2.__s && C2(i3.__H, u4) && (i3.__ = n2, i3.u = u4, r2.__H.__h.push(i3));
  }
  function T2(n2, r3) {
    var u4 = p2(t2++, 7);
    return C2(u4.__H, r3) && (u4.__ = n2(), u4.__H = r3, u4.__h = n2), u4.__;
  }
  function q2(n2, t3) {
    return o2 = 8, T2(function() {
      return n2;
    }, t3);
  }
  function j2() {
    for (var n2; n2 = f2.shift(); ) {
      var t3 = n2.__H;
      if (n2.__P && t3) try {
        t3.__h.some(z2), t3.__h.some(B2), t3.__h = [];
      } catch (r3) {
        t3.__h = [], c2.__e(r3, n2.__v);
      }
    }
  }
  c2.__b = function(n2) {
    r2 = null, e2 && e2(n2);
  }, c2.__ = function(n2, t3) {
    n2 && t3.__k && t3.__k.__m && (n2.__m = t3.__k.__m), s2 && s2(n2, t3);
  }, c2.__r = function(n2) {
    a2 && a2(n2), t2 = 0;
    var i3 = (r2 = n2.__c).__H;
    i3 && (u2 === r2 ? (i3.__h = [], r2.__h = [], i3.__.some(function(n3) {
      n3.__N && (n3.__ = n3.__N), n3.u = n3.__N = void 0;
    })) : (i3.__h.some(z2), i3.__h.some(B2), i3.__h = [], t2 = 0)), u2 = r2;
  }, c2.diffed = function(n2) {
    v2 && v2(n2);
    var t3 = n2.__c;
    t3 && t3.__H && (t3.__H.__h.length && (1 !== f2.push(t3) && i2 === c2.requestAnimationFrame || ((i2 = c2.requestAnimationFrame) || w2)(j2)), t3.__H.__.some(function(n3) {
      n3.u && (n3.__H = n3.u), n3.u = void 0;
    })), u2 = r2 = null;
  }, c2.__c = function(n2, t3) {
    t3.some(function(n3) {
      try {
        n3.__h.some(z2), n3.__h = n3.__h.filter(function(n4) {
          return !n4.__ || B2(n4);
        });
      } catch (r3) {
        t3.some(function(n4) {
          n4.__h && (n4.__h = []);
        }), t3 = [], c2.__e(r3, n3.__v);
      }
    }), l2 && l2(n2, t3);
  }, c2.unmount = function(n2) {
    m2 && m2(n2);
    var t3, r3 = n2.__c;
    r3 && r3.__H && (r3.__H.__.some(function(n3) {
      try {
        z2(n3);
      } catch (n4) {
        t3 = n4;
      }
    }), r3.__H = void 0, t3 && c2.__e(t3, r3.__v));
  };
  var k2 = "function" == typeof requestAnimationFrame;
  function w2(n2) {
    var t3, r3 = function() {
      clearTimeout(u4), k2 && cancelAnimationFrame(t3), setTimeout(n2);
    }, u4 = setTimeout(r3, 35);
    k2 && (t3 = requestAnimationFrame(r3));
  }
  function z2(n2) {
    var t3 = r2, u4 = n2.__c;
    "function" == typeof u4 && (n2.__c = void 0, u4()), r2 = t3;
  }
  function B2(n2) {
    var t3 = r2;
    n2.__c = n2.__(), r2 = t3;
  }
  function C2(n2, t3) {
    return !n2 || n2.length !== t3.length || t3.some(function(t4, r3) {
      return t4 !== n2[r3];
    });
  }
  function D2(n2, t3) {
    return "function" == typeof t3 ? t3(n2) : t3;
  }

  // node_modules/preact/jsx-runtime/dist/jsxRuntime.module.js
  var f3 = 0;
  function u3(e3, t3, n2, o3, i3, u4) {
    t3 || (t3 = {});
    var a3, c3, p3 = t3;
    if ("ref" in p3) for (c3 in p3 = {}, t3) "ref" == c3 ? a3 = t3[c3] : p3[c3] = t3[c3];
    var l3 = { type: e3, props: p3, key: n2, ref: a3, __k: null, __: null, __b: 0, __e: null, __c: null, constructor: void 0, __v: --f3, __i: -1, __u: 0, __source: i3, __self: u4 };
    if ("function" == typeof e3 && (a3 = e3.defaultProps)) for (c3 in a3) void 0 === p3[c3] && (p3[c3] = a3[c3]);
    return l.vnode && l.vnode(l3), l3;
  }

  // src/components/SlicePreview.tsx
  var PREVIEW_WIDTH = 280;
  function SlicePreview({ slices, frameHeight, onSlicesChange }) {
    const [dragging, setDragging] = d2(null);
    const [editingId, setEditingId] = d2(null);
    const scale = PREVIEW_WIDTH / 600;
    const previewHeight = Math.round(frameHeight * scale);
    const handleDragStart = q2((e3, index) => {
      e3.preventDefault();
      setDragging({
        index,
        startY: e3.clientY,
        startEnd: slices[index].y_end
      });
      const onMove = (ev) => {
        const dy = ev.clientY - e3.clientY;
        const rawY = Math.round(e3.clientY + dy);
        const newEnd = Math.round(slices[index].y_end + dy / scale);
        const clamped = Math.max(slices[index].y_start + 20, Math.min(
          index < slices.length - 1 ? slices[index + 1].y_end - 20 : frameHeight,
          newEnd
        ));
        const updated = slices.map((s3, i3) => {
          if (i3 === index) return __spreadProps(__spreadValues({}, s3), { y_end: clamped });
          if (i3 === index + 1) return __spreadProps(__spreadValues({}, s3), { y_start: clamped });
          return s3;
        });
        onSlicesChange(updated);
      };
      const onUp = () => {
        setDragging(null);
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    }, [slices, frameHeight, scale, onSlicesChange]);
    const handleAddSlice = q2(() => {
      if (slices.length === 0) return;
      const last = slices[slices.length - 1];
      const midY = Math.round((last.y_start + last.y_end) / 2);
      const newSlice = {
        id: `slice_${Date.now()}`,
        name: `section_${slices.length + 1}`,
        y_start: midY,
        y_end: last.y_end,
        alt_text: "New section"
      };
      const updated = [
        ...slices.slice(0, -1),
        __spreadProps(__spreadValues({}, last), { y_end: midY }),
        newSlice
      ];
      onSlicesChange(updated);
    }, [slices, onSlicesChange]);
    const handleDelete = q2((id) => {
      const idx = slices.findIndex((s3) => s3.id === id);
      if (idx === -1 || slices.length <= 1) return;
      const updated = slices.filter((_2, i3) => i3 !== idx);
      if (idx > 0) {
        updated[idx - 1] = __spreadProps(__spreadValues({}, updated[idx - 1]), { y_end: slices[idx].y_end });
      } else {
        updated[0] = __spreadProps(__spreadValues({}, updated[0]), { y_start: slices[idx].y_start });
      }
      onSlicesChange(updated);
    }, [slices, onSlicesChange]);
    const handleRename = q2((id, name) => {
      onSlicesChange(slices.map((s3) => s3.id === id ? __spreadProps(__spreadValues({}, s3), { name, alt_text: name }) : s3));
      setEditingId(null);
    }, [slices, onSlicesChange]);
    const handleReanalyze = q2(() => {
      window.dispatchEvent(new CustomEvent("reanalyze"));
    }, []);
    return /* @__PURE__ */ u3("div", { class: "slice-preview", children: [
      /* @__PURE__ */ u3("div", { class: "preview-header", children: [
        /* @__PURE__ */ u3("span", { children: [
          "Slices: ",
          slices.length
        ] }),
        /* @__PURE__ */ u3("span", { children: [
          "Est. Size: ~",
          estimateSize(slices),
          " KB"
        ] })
      ] }),
      /* @__PURE__ */ u3(
        "div",
        {
          class: "preview-canvas",
          style: { width: PREVIEW_WIDTH, height: previewHeight, position: "relative", overflow: "hidden", background: "#f0f0f0", border: "1px solid #ccc" },
          children: slices.map((slice, i3) => {
            const top = Math.round(slice.y_start * scale);
            const height = Math.round((slice.y_end - slice.y_start) * scale);
            return /* @__PURE__ */ u3(
              "div",
              {
                style: { position: "absolute", top, left: 0, width: "100%", height, borderBottom: "2px dashed #0099ff", boxSizing: "border-box" },
                children: [
                  /* @__PURE__ */ u3("div", { style: { position: "absolute", top: 2, left: 4, fontSize: 10, color: "#333", display: "flex", alignItems: "center", gap: 4 }, children: [
                    editingId === slice.id ? /* @__PURE__ */ u3(
                      "input",
                      {
                        autoFocus: true,
                        defaultValue: slice.name,
                        style: { fontSize: 10, border: "1px solid #0099ff", padding: "1px 2px", width: 80 },
                        onBlur: (e3) => handleRename(slice.id, e3.target.value),
                        onKeyDown: (e3) => {
                          if (e3.key === "Enter") handleRename(slice.id, e3.target.value);
                          if (e3.key === "Escape") setEditingId(null);
                        }
                      }
                    ) : /* @__PURE__ */ u3("span", { onDblClick: () => setEditingId(slice.id), style: { cursor: "pointer" }, children: slice.name }),
                    slices.length > 1 && /* @__PURE__ */ u3(
                      "button",
                      {
                        onClick: () => handleDelete(slice.id),
                        style: { fontSize: 9, padding: "0 3px", cursor: "pointer", background: "#ff4444", color: "#fff", border: "none", borderRadius: 2 },
                        children: "\u2715"
                      }
                    )
                  ] }),
                  i3 < slices.length - 1 && /* @__PURE__ */ u3(
                    "div",
                    {
                      style: {
                        position: "absolute",
                        bottom: -4,
                        left: 0,
                        right: 0,
                        height: 8,
                        cursor: "ns-resize",
                        zIndex: 10,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center"
                      },
                      onMouseDown: (e3) => handleDragStart(e3, i3),
                      children: /* @__PURE__ */ u3("div", { style: { width: 24, height: 4, background: "#0099ff", borderRadius: 2 } })
                    }
                  )
                ]
              },
              slice.id
            );
          })
        }
      ),
      /* @__PURE__ */ u3("div", { class: "preview-actions", children: [
        /* @__PURE__ */ u3("button", { onClick: handleAddSlice, children: "+ Add Slice" }),
        /* @__PURE__ */ u3("button", { onClick: handleReanalyze, children: "\u21BB Re-analyze" }),
        /* @__PURE__ */ u3("button", { onClick: () => window.dispatchEvent(new CustomEvent("resetSlices")), children: "Reset" })
      ] })
    ] });
  }
  function estimateSize(slices) {
    return slices.length * 90;
  }

  // src/components/DesignerMode.tsx
  var BACKEND_URL = "https://figma-klaviyo-production.up.railway.app";
  function DesignerMode({ frame }) {
    const [step, setStep] = d2("select");
    const [slices, setSlices] = d2([]);
    const [compressedSlices, setCompressedSlices] = d2([]);
    const [compressResponse, setCompressResponse] = d2(null);
    const [error, setError] = d2(null);
    const [imageBase64, setImageBase64] = d2(null);
    y2(() => {
      if (frame == null ? void 0 : frame.existingSliceData) {
        setSlices(frame.existingSliceData.slices);
        setStep("preview");
      } else if (frame) {
        setStep("select");
      }
    }, [frame]);
    y2(() => {
      const onReanalyze = () => frame && analyzeFrame();
      const onReset = () => {
        setSlices([]);
        setStep("select");
      };
      window.addEventListener("reanalyze", onReanalyze);
      window.addEventListener("resetSlices", onReset);
      return () => {
        window.removeEventListener("reanalyze", onReanalyze);
        window.removeEventListener("resetSlices", onReset);
      };
    }, [frame]);
    const analyzeFrame = q2(() => __async(null, null, function* () {
      if (!frame) return;
      setError(null);
      setStep("analyzing");
      try {
        parent.postMessage({
          pluginMessage: { type: "EXPORT_SLICES", frameId: frame.id, slices: [] }
        }, "*");
        const fullExport = yield exportFullFrame(frame.id);
        setImageBase64(fullExport);
        const response = yield fetch(`${BACKEND_URL}/api/analyze`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            image_base64: fullExport,
            frame_width: frame.width,
            frame_height: frame.height
          })
        });
        if (!response.ok) throw new Error(`Analysis failed: ${response.statusText}`);
        const data = yield response.json();
        const newSlices = data.slices.map((s3, i3) => ({
          id: `slice_${Date.now()}_${i3}`,
          name: s3.name,
          y_start: s3.y_start,
          y_end: s3.y_end,
          alt_text: s3.alt_text
        }));
        setSlices(newSlices);
        setStep("preview");
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg);
        setStep("select");
      }
    }), [frame]);
    const compressAndSave = q2(() => __async(null, null, function* () {
      if (!frame || slices.length === 0) return;
      setError(null);
      setStep("compressing");
      try {
        const sliceExports = yield exportSlicesFromParent(frame.id, slices);
        const response = yield fetch(`${BACKEND_URL}/api/compress`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            slices: sliceExports,
            settings: {
              target_size_kb: 100,
              max_size_kb: 200
            }
          })
        });
        if (!response.ok) throw new Error(`Compression failed: ${response.statusText}`);
        const data = yield response.json();
        setCompressResponse(data);
        setCompressedSlices(data.compressed);
        setStep("results");
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg);
        setStep("preview");
      }
    }), [frame, slices]);
    const saveDesign = q2(() => {
      if (!frame) return;
      const updatedSlices = slices.map((s3) => {
        const compressed = compressedSlices.find((c3) => c3.id === s3.id);
        return compressed ? __spreadProps(__spreadValues({}, s3), { compressed_url: compressed.temp_url }) : s3;
      });
      const sliceData = {
        version: "1.0.0",
        created_by: "designer",
        created_at: (/* @__PURE__ */ new Date()).toISOString(),
        frame_id: frame.id,
        frame_name: frame.name,
        slices: updatedSlices,
        status: "ready"
      };
      parent.postMessage({
        pluginMessage: { type: "SAVE_SLICE_DATA", frameId: frame.id, data: sliceData }
      }, "*");
      setStep("saved");
    }, [frame, slices, compressedSlices]);
    if (!frame) {
      return /* @__PURE__ */ u3("div", { class: "empty-state", children: /* @__PURE__ */ u3("p", { children: "Select an email frame (500\u2013700px wide) to get started." }) });
    }
    return /* @__PURE__ */ u3("div", { class: "designer-mode", children: [
      error && /* @__PURE__ */ u3("div", { class: "error-banner", children: [
        "\u26A0 ",
        error,
        /* @__PURE__ */ u3("button", { onClick: () => setError(null), children: "\u2715" })
      ] }),
      /* @__PURE__ */ u3("div", { class: "frame-info", children: [
        /* @__PURE__ */ u3("span", { class: "frame-icon", children: "\u{1F4E7}" }),
        /* @__PURE__ */ u3("div", { children: [
          /* @__PURE__ */ u3("strong", { children: frame.name }),
          /* @__PURE__ */ u3("span", { class: "frame-dims", children: [
            frame.width,
            " \xD7 ",
            frame.height,
            "px"
          ] })
        ] })
      ] }),
      step === "select" && /* @__PURE__ */ u3("div", { class: "step-panel", children: [
        /* @__PURE__ */ u3("p", { children: "Frame selected. Click analyze to detect slice boundaries using Claude Vision." }),
        /* @__PURE__ */ u3("button", { class: "btn-primary", onClick: analyzeFrame, children: "\u2726 Analyze with AI" })
      ] }),
      step === "analyzing" && /* @__PURE__ */ u3("div", { class: "step-panel loading", children: [
        /* @__PURE__ */ u3("div", { class: "spinner" }),
        /* @__PURE__ */ u3("p", { children: "Claude Vision is analyzing your design\u2026" })
      ] }),
      step === "preview" && /* @__PURE__ */ u3("div", { class: "step-panel", children: [
        /* @__PURE__ */ u3(
          SlicePreview,
          {
            slices,
            frameHeight: frame.height,
            onSlicesChange: setSlices
          }
        ),
        /* @__PURE__ */ u3("div", { class: "action-row", children: [
          /* @__PURE__ */ u3("button", { class: "btn-secondary", onClick: analyzeFrame, children: "\u21BB Re-analyze" }),
          /* @__PURE__ */ u3("button", { class: "btn-primary", onClick: compressAndSave, children: "Compress \u2192" })
        ] })
      ] }),
      step === "compressing" && /* @__PURE__ */ u3("div", { class: "step-panel loading", children: [
        /* @__PURE__ */ u3("div", { class: "spinner" }),
        /* @__PURE__ */ u3("p", { children: [
          "Compressing ",
          slices.length,
          " slices with Squoosh\u2026"
        ] })
      ] }),
      step === "results" && compressResponse && /* @__PURE__ */ u3("div", { class: "step-panel", children: [
        /* @__PURE__ */ u3(CompressionResults, { response: compressResponse }),
        /* @__PURE__ */ u3("div", { class: "action-row", children: [
          /* @__PURE__ */ u3("button", { class: "btn-secondary", onClick: () => setStep("preview"), children: "\u2190 Adjust Slices" }),
          /* @__PURE__ */ u3("button", { class: "btn-secondary", onClick: compressAndSave, children: "\u21BB Re-compress" }),
          /* @__PURE__ */ u3(
            "button",
            {
              class: "btn-primary",
              disabled: compressResponse.summary.failed_count > 0,
              onClick: saveDesign,
              children: "Save \u2192"
            }
          )
        ] })
      ] }),
      step === "saved" && /* @__PURE__ */ u3("div", { class: "step-panel success", children: [
        /* @__PURE__ */ u3("p", { children: "\u2713 Design saved! Tech team can now load it in Tech Mode." }),
        /* @__PURE__ */ u3("button", { class: "btn-secondary", onClick: () => setStep("preview"), children: "Edit Slices" })
      ] })
    ] });
  }
  function CompressionResults({ response }) {
    const statusIcon = (s3) => s3 === "optimal" ? "\u2713" : s3 === "good" ? "\u2713" : s3 === "warning" ? "\u26A0" : "\u2717";
    return /* @__PURE__ */ u3("div", { class: "compression-results", children: [
      /* @__PURE__ */ u3("div", { class: "targets-box", children: [
        /* @__PURE__ */ u3("span", { children: "Per slice: \u2264100KB ideal \u2502 \u2264200KB max" }),
        /* @__PURE__ */ u3("span", { children: "Total email: \u2264500KB recommended" })
      ] }),
      /* @__PURE__ */ u3("table", { class: "results-table", children: [
        /* @__PURE__ */ u3("thead", { children: /* @__PURE__ */ u3("tr", { children: [
          /* @__PURE__ */ u3("th", { children: "Slice" }),
          /* @__PURE__ */ u3("th", { children: "Original" }),
          /* @__PURE__ */ u3("th", { children: "Final" }),
          /* @__PURE__ */ u3("th", { children: "Status" })
        ] }) }),
        /* @__PURE__ */ u3("tbody", { children: [
          response.compressed.map((s3) => /* @__PURE__ */ u3("tr", { class: `status-${s3.status}`, children: [
            /* @__PURE__ */ u3("td", { children: s3.name }),
            /* @__PURE__ */ u3("td", { children: formatKB(s3.original_size) }),
            /* @__PURE__ */ u3("td", { children: formatKB(s3.compressed_size) }),
            /* @__PURE__ */ u3("td", { children: [
              statusIcon(s3.status),
              " ",
              capitalize(s3.status)
            ] })
          ] }, s3.id)),
          /* @__PURE__ */ u3("tr", { class: "totals-row", children: [
            /* @__PURE__ */ u3("td", { children: "TOTAL" }),
            /* @__PURE__ */ u3("td", { children: formatKB(response.summary.total_original) }),
            /* @__PURE__ */ u3("td", { children: formatKB(response.summary.total_compressed) }),
            /* @__PURE__ */ u3("td", { children: response.validation.status === "passed" ? "\u2713 Under 500KB" : "\u26A0 Over target" })
          ] })
        ] })
      ] }),
      response.recommendations.map((r3, i3) => /* @__PURE__ */ u3("div", { class: "recommendation", children: [
        /* @__PURE__ */ u3("strong", { children: [
          "\u26A0 ",
          r3.slice,
          ":"
        ] }),
        " ",
        r3.suggestion
      ] }, i3))
    ] });
  }
  function formatKB(bytes) {
    return `${Math.round(bytes / 1024)} KB`;
  }
  function capitalize(s3) {
    return s3.charAt(0).toUpperCase() + s3.slice(1);
  }
  function exportFullFrame(frameId) {
    return __async(this, null, function* () {
      return new Promise((resolve, reject) => {
        const handler = (event) => {
          var _a, _b;
          const msg = (_a = event.data) == null ? void 0 : _a.pluginMessage;
          if ((msg == null ? void 0 : msg.type) === "EXPORT_COMPLETE" && ((_b = msg.data) == null ? void 0 : _b.length) > 0) {
            window.removeEventListener("message", handler);
            resolve(msg.data[0].image_base64);
          } else if ((msg == null ? void 0 : msg.type) === "ERROR") {
            window.removeEventListener("message", handler);
            reject(new Error(msg.message));
          }
        };
        window.addEventListener("message", handler);
        parent.postMessage({
          pluginMessage: {
            type: "EXPORT_SLICES",
            frameId,
            slices: [{ id: "full", name: "full", y_start: 0, y_end: 9999, alt_text: "" }]
          }
        }, "*");
      });
    });
  }
  function exportSlicesFromParent(frameId, slices) {
    return __async(this, null, function* () {
      return new Promise((resolve, reject) => {
        const handler = (event) => {
          var _a;
          const msg = (_a = event.data) == null ? void 0 : _a.pluginMessage;
          if ((msg == null ? void 0 : msg.type) === "EXPORT_COMPLETE") {
            window.removeEventListener("message", handler);
            resolve(msg.data);
          } else if ((msg == null ? void 0 : msg.type) === "ERROR") {
            window.removeEventListener("message", handler);
            reject(new Error(msg.message));
          }
        };
        window.addEventListener("message", handler);
        parent.postMessage({ pluginMessage: { type: "EXPORT_SLICES", frameId, slices } }, "*");
      });
    });
  }

  // src/components/KlaviyoConfig.tsx
  function KlaviyoConfig({ apiKey, backendUrl, onChange }) {
    const [lists, setLists] = d2([]);
    const [loading, setLoading] = d2(false);
    const [config, setConfig] = d2({
      mode: "template",
      templateName: "",
      campaignName: "",
      subject: "",
      previewText: "",
      listId: "",
      sendTime: void 0
    });
    y2(() => {
      fetchLists();
    }, [apiKey]);
    y2(() => {
      onChange(config);
    }, [config]);
    function fetchLists() {
      return __async(this, null, function* () {
        setLoading(true);
        try {
          const res = yield fetch(`${backendUrl}/api/klaviyo/lists`, {
            headers: { "X-Klaviyo-Key": apiKey }
          });
          if (res.ok) {
            const data = yield res.json();
            setLists(data.lists);
            if (data.lists.length > 0) {
              update("listId", data.lists[0].id);
            }
          }
        } finally {
          setLoading(false);
        }
      });
    }
    function update(key, value) {
      setConfig((prev) => __spreadProps(__spreadValues({}, prev), { [key]: value }));
    }
    return /* @__PURE__ */ u3("div", { class: "klaviyo-config", children: [
      /* @__PURE__ */ u3("div", { class: "mode-selector", children: [
        /* @__PURE__ */ u3("label", { children: [
          /* @__PURE__ */ u3(
            "input",
            {
              type: "radio",
              name: "mode",
              value: "template",
              checked: config.mode === "template",
              onChange: () => update("mode", "template")
            }
          ),
          "Template (reusable)"
        ] }),
        /* @__PURE__ */ u3("label", { children: [
          /* @__PURE__ */ u3(
            "input",
            {
              type: "radio",
              name: "mode",
              value: "campaign",
              checked: config.mode === "campaign",
              onChange: () => update("mode", "campaign")
            }
          ),
          "Campaign (one-time send)"
        ] })
      ] }),
      /* @__PURE__ */ u3("div", { class: "form-field", children: [
        /* @__PURE__ */ u3("label", { children: "Template Name" }),
        /* @__PURE__ */ u3(
          "input",
          {
            type: "text",
            value: config.templateName,
            placeholder: "e.g. Summer Sale 2026",
            onInput: (e3) => update("templateName", e3.target.value)
          }
        )
      ] }),
      config.mode === "campaign" && /* @__PURE__ */ u3(k, { children: [
        /* @__PURE__ */ u3("div", { class: "form-field", children: [
          /* @__PURE__ */ u3("label", { children: "Campaign Name" }),
          /* @__PURE__ */ u3(
            "input",
            {
              type: "text",
              value: config.campaignName,
              placeholder: "e.g. Summer Sale - June 2026",
              onInput: (e3) => update("campaignName", e3.target.value)
            }
          )
        ] }),
        /* @__PURE__ */ u3("div", { class: "form-field", children: [
          /* @__PURE__ */ u3("label", { children: "Subject Line" }),
          /* @__PURE__ */ u3(
            "input",
            {
              type: "text",
              value: config.subject,
              placeholder: "e.g. Summer Sale - 40% Off!",
              onInput: (e3) => update("subject", e3.target.value)
            }
          )
        ] }),
        /* @__PURE__ */ u3("div", { class: "form-field", children: [
          /* @__PURE__ */ u3("label", { children: "Preview Text" }),
          /* @__PURE__ */ u3(
            "input",
            {
              type: "text",
              value: config.previewText,
              placeholder: "e.g. Don't miss out on our biggest sale\u2026",
              onInput: (e3) => update("previewText", e3.target.value)
            }
          )
        ] }),
        /* @__PURE__ */ u3("div", { class: "form-field", children: [
          /* @__PURE__ */ u3("label", { children: "Send To List" }),
          loading ? /* @__PURE__ */ u3("p", { style: { fontSize: 12, color: "#666" }, children: "Loading lists\u2026" }) : /* @__PURE__ */ u3(
            "select",
            {
              value: config.listId,
              onChange: (e3) => update("listId", e3.target.value),
              children: lists.map((l3) => /* @__PURE__ */ u3("option", { value: l3.id, children: [
                l3.name,
                " (",
                l3.member_count.toLocaleString(),
                ")"
              ] }, l3.id))
            }
          )
        ] })
      ] })
    ] });
  }

  // src/components/TechMode.tsx
  var BACKEND_URL2 = "https://figma-klaviyo-production.up.railway.app";
  function TechMode({ frame }) {
    var _a, _b;
    const [step, setStep] = d2("key_setup");
    const [klaviyoKey, setKlaviyoKey] = d2(null);
    const [keyInput, setKeyInput] = d2("");
    const [keyError, setKeyError] = d2(null);
    const [figmaUserName, setFigmaUserName] = d2("");
    const [sliceData, setSliceData] = d2(null);
    const [editedSlices, setEditedSlices] = d2([]);
    const [klaviyoConfig, setKlaviyoConfig] = d2(null);
    const [error, setError] = d2(null);
    const [pushResult, setPushResult] = d2(null);
    const [previewHtml, setPreviewHtml] = d2(null);
    y2(() => {
      parent.postMessage({ pluginMessage: { type: "GET_KLAVIYO_KEY" } }, "*");
      parent.postMessage({ pluginMessage: { type: "GET_USER_INFO" } }, "*");
      const handler = (event) => {
        var _a2, _b2;
        const msg = (_a2 = event.data) == null ? void 0 : _a2.pluginMessage;
        if (!msg) return;
        if (msg.type === "KLAVIYO_KEY_LOADED") {
          if (msg.key) {
            setKlaviyoKey(msg.key);
            setStep("configure");
          }
        }
        if (msg.type === "KLAVIYO_KEY_SAVED") {
          setStep("configure");
        }
        if (msg.type === "USER_INFO") {
          setFigmaUserName((_b2 = msg.name) != null ? _b2 : "");
        }
      };
      window.addEventListener("message", handler);
      return () => window.removeEventListener("message", handler);
    }, []);
    y2(() => {
      if (klaviyoKey && (frame == null ? void 0 : frame.existingSliceData)) {
        setSliceData(frame.existingSliceData);
        setEditedSlices(frame.existingSliceData.slices);
      }
    }, [frame, klaviyoKey]);
    const handleSaveKey = q2(() => {
      const trimmed = keyInput.trim();
      if (!trimmed.startsWith("pk_")) {
        setKeyError('Klaviyo Private API keys start with "pk_". Check your key and try again.');
        return;
      }
      setKeyError(null);
      setKlaviyoKey(trimmed);
      parent.postMessage({ pluginMessage: { type: "SAVE_KLAVIYO_KEY", key: trimmed } }, "*");
    }, [keyInput]);
    const handleChangeKey = q2(() => {
      setKeyInput("");
      setKeyError(null);
      setStep("key_setup");
    }, []);
    const handlePreviewHtml = q2(() => __async(null, null, function* () {
      if (!sliceData) return;
      try {
        const res = yield fetch(`${BACKEND_URL2}/api/klaviyo/preview`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slices: editedSlices })
        });
        const data = yield res.json();
        setPreviewHtml(data.html);
      } catch (e3) {
        setError("Failed to generate preview.");
      }
    }), [sliceData, editedSlices]);
    const handlePush = q2(() => __async(null, null, function* () {
      if (!klaviyoKey || !klaviyoConfig) return;
      setError(null);
      setStep("pushing");
      try {
        const res = yield fetch(`${BACKEND_URL2}/api/klaviyo/push`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Klaviyo-Key": klaviyoKey
          },
          body: JSON.stringify({
            slices: editedSlices,
            config: klaviyoConfig
          })
        });
        if (!res.ok) {
          const errData = yield res.json().catch(() => ({}));
          throw new Error(errData.error || `Push failed: ${res.statusText}`);
        }
        const data = yield res.json();
        setPushResult(data);
        setStep("done");
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg);
        setStep("configure");
      }
    }), [klaviyoKey, editedSlices, klaviyoConfig]);
    const updateSlice = q2((id, field, value) => {
      setEditedSlices((prev) => prev.map((s3) => s3.id === id ? __spreadProps(__spreadValues({}, s3), { [field]: value }) : s3));
    }, []);
    return /* @__PURE__ */ u3("div", { class: "tech-mode", children: [
      error && /* @__PURE__ */ u3("div", { class: "error-banner", children: [
        "\u26A0 ",
        error,
        /* @__PURE__ */ u3("button", { onClick: () => setError(null), children: "\u2715" })
      ] }),
      step === "key_setup" && /* @__PURE__ */ u3("div", { class: "step-panel", children: [
        /* @__PURE__ */ u3("div", { class: "key-setup-header", children: [
          /* @__PURE__ */ u3("div", { class: "key-icon", children: "\u{1F511}" }),
          /* @__PURE__ */ u3("p", { children: "Enter your Klaviyo Private API key. It's saved locally in Figma \u2014 you only need to do this once." })
        ] }),
        /* @__PURE__ */ u3("div", { class: "form-field", children: [
          /* @__PURE__ */ u3("label", { children: "Klaviyo Private API Key" }),
          /* @__PURE__ */ u3(
            "input",
            {
              type: "password",
              value: keyInput,
              placeholder: "pk_\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022",
              onInput: (e3) => {
                setKeyInput(e3.target.value);
                setKeyError(null);
              },
              onKeyDown: (e3) => e3.key === "Enter" && handleSaveKey()
            }
          ),
          keyError && /* @__PURE__ */ u3("span", { class: "field-error", children: keyError })
        ] }),
        /* @__PURE__ */ u3("p", { class: "key-hint", children: "Find it in Klaviyo \u2192 Settings \u2192 API Keys \u2192 Create Private API Key" }),
        /* @__PURE__ */ u3(
          "button",
          {
            class: "btn-primary",
            disabled: !keyInput.trim(),
            onClick: handleSaveKey,
            children: "Save & Continue \u2192"
          }
        )
      ] }),
      step === "configure" && /* @__PURE__ */ u3("div", { class: "step-panel", children: [
        /* @__PURE__ */ u3("div", { class: "identity-bar", children: [
          /* @__PURE__ */ u3("span", { children: [
            "\u{1F464} ",
            figmaUserName || "Figma User"
          ] }),
          /* @__PURE__ */ u3("div", { class: "key-indicator", children: [
            /* @__PURE__ */ u3("span", { class: "key-masked", children: "pk_\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022" }),
            /* @__PURE__ */ u3("button", { class: "btn-link", onClick: handleChangeKey, children: "Change key" })
          ] })
        ] }),
        !(frame == null ? void 0 : frame.existingSliceData) ? /* @__PURE__ */ u3("div", { class: "warning-box", children: "\u26A0 Select a Figma frame that has been sliced by the Design team." }) : /* @__PURE__ */ u3(k, { children: [
          /* @__PURE__ */ u3("div", { class: "design-summary", children: [
            /* @__PURE__ */ u3("span", { children: "\u{1F4E7}" }),
            /* @__PURE__ */ u3("div", { children: [
              /* @__PURE__ */ u3("strong", { children: (_a = sliceData == null ? void 0 : sliceData.frame_name) != null ? _a : frame.name }),
              /* @__PURE__ */ u3("span", { children: [
                editedSlices.length,
                " slices \u2022 ",
                formatDate((_b = sliceData == null ? void 0 : sliceData.created_at) != null ? _b : "")
              ] })
            ] })
          ] }),
          /* @__PURE__ */ u3("div", { class: "section-title", children: "Slice Configuration" }),
          /* @__PURE__ */ u3("table", { class: "slice-config-table", children: [
            /* @__PURE__ */ u3("thead", { children: /* @__PURE__ */ u3("tr", { children: [
              /* @__PURE__ */ u3("th", { children: "#" }),
              /* @__PURE__ */ u3("th", { children: "Name" }),
              /* @__PURE__ */ u3("th", { children: "Alt Text" }),
              /* @__PURE__ */ u3("th", { children: "Link" })
            ] }) }),
            /* @__PURE__ */ u3("tbody", { children: editedSlices.map((slice, i3) => {
              var _a2;
              return /* @__PURE__ */ u3("tr", { children: [
                /* @__PURE__ */ u3("td", { children: i3 + 1 }),
                /* @__PURE__ */ u3("td", { children: slice.name }),
                /* @__PURE__ */ u3("td", { children: /* @__PURE__ */ u3(
                  "input",
                  {
                    type: "text",
                    value: slice.alt_text,
                    onInput: (e3) => updateSlice(slice.id, "alt_text", e3.target.value)
                  }
                ) }),
                /* @__PURE__ */ u3("td", { children: /* @__PURE__ */ u3(
                  "input",
                  {
                    type: "text",
                    value: (_a2 = slice.link) != null ? _a2 : "",
                    placeholder: "https://...",
                    onInput: (e3) => updateSlice(slice.id, "link", e3.target.value)
                  }
                ) })
              ] }, slice.id);
            }) })
          ] }),
          /* @__PURE__ */ u3("div", { class: "section-title", children: "Push Destination" }),
          /* @__PURE__ */ u3(
            KlaviyoConfig,
            {
              apiKey: klaviyoKey,
              backendUrl: BACKEND_URL2,
              onChange: setKlaviyoConfig
            }
          ),
          /* @__PURE__ */ u3("div", { class: "action-row", children: [
            /* @__PURE__ */ u3("button", { class: "btn-secondary", onClick: handlePreviewHtml, children: "Preview HTML" }),
            /* @__PURE__ */ u3(
              "button",
              {
                class: "btn-primary",
                disabled: !(klaviyoConfig == null ? void 0 : klaviyoConfig.templateName),
                onClick: handlePush,
                children: "Push to Klaviyo \u2192"
              }
            )
          ] }),
          previewHtml && /* @__PURE__ */ u3("div", { class: "html-preview", children: [
            /* @__PURE__ */ u3("div", { class: "preview-header", children: [
              "HTML Preview",
              /* @__PURE__ */ u3("button", { onClick: () => setPreviewHtml(null), children: "\u2715" })
            ] }),
            /* @__PURE__ */ u3(
              "iframe",
              {
                srcDoc: previewHtml,
                style: { width: "100%", height: 300, border: "1px solid #ccc" },
                sandbox: "allow-same-origin"
              }
            )
          ] })
        ] })
      ] }),
      step === "pushing" && /* @__PURE__ */ u3("div", { class: "step-panel loading", children: [
        /* @__PURE__ */ u3("div", { class: "spinner" }),
        /* @__PURE__ */ u3("p", { children: "Uploading to Klaviyo\u2026" })
      ] }),
      step === "done" && pushResult && /* @__PURE__ */ u3("div", { class: "step-panel success", children: [
        /* @__PURE__ */ u3("p", { children: "\u2713 Successfully pushed to Klaviyo!" }),
        pushResult.templateUrl && /* @__PURE__ */ u3("a", { href: pushResult.templateUrl, target: "_blank", rel: "noreferrer", children: "View Template \u2192" }),
        pushResult.campaignUrl && /* @__PURE__ */ u3("a", { href: pushResult.campaignUrl, target: "_blank", rel: "noreferrer", children: "View Campaign \u2192" }),
        /* @__PURE__ */ u3("button", { class: "btn-secondary", onClick: () => setStep("configure"), children: "Push Another" })
      ] })
    ] });
  }
  function formatDate(iso) {
    if (!iso) return "";
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }

  // src/ui.tsx
  function App() {
    const [mode, setMode] = d2("designer");
    const [frame, setFrame] = d2(null);
    const [noFrameWarning, setNoFrameWarning] = d2(false);
    y2(() => {
      window.onmessage = (event) => {
        var _a;
        const msg = (_a = event.data) == null ? void 0 : _a.pluginMessage;
        if (!msg) return;
        switch (msg.type) {
          case "FRAME_SELECTED":
            setFrame(msg.data);
            setNoFrameWarning(false);
            break;
          case "NO_FRAME_SELECTED":
            setFrame(null);
            setNoFrameWarning(true);
            break;
          case "SLICE_DATA_SAVED":
            break;
        }
      };
      parent.postMessage({ pluginMessage: { type: "GET_SELECTED_FRAME" } }, "*");
    }, []);
    return /* @__PURE__ */ u3("div", { class: "plugin-root", children: [
      /* @__PURE__ */ u3("header", { class: "plugin-header", children: [
        /* @__PURE__ */ u3("span", { class: "plugin-title", children: "Figma \u2192 Klaviyo" }),
        /* @__PURE__ */ u3("span", { class: "plugin-version", children: "v1.0.0" })
      ] }),
      /* @__PURE__ */ u3("nav", { class: "mode-tabs", children: [
        /* @__PURE__ */ u3(
          "button",
          {
            class: `mode-tab ${mode === "designer" ? "active" : ""}`,
            onClick: () => setMode("designer"),
            children: "Designer"
          }
        ),
        /* @__PURE__ */ u3(
          "button",
          {
            class: `mode-tab ${mode === "tech" ? "active" : ""}`,
            onClick: () => setMode("tech"),
            children: "Tech \u{1F512}"
          }
        )
      ] }),
      noFrameWarning && /* @__PURE__ */ u3("div", { class: "frame-warning", children: "Select an email frame (500\u2013700px wide) to get started." }),
      /* @__PURE__ */ u3("main", { class: "plugin-content", children: mode === "designer" ? /* @__PURE__ */ u3(DesignerMode, { frame }) : /* @__PURE__ */ u3(TechMode, { frame }) })
    ] });
  }
  J(/* @__PURE__ */ u3(App, {}), document.getElementById("root"));
})();
