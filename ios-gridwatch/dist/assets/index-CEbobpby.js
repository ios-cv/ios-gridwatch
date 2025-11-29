(function polyfill() {
  const relList = document.createElement("link").relList;
  if (relList && relList.supports && relList.supports("modulepreload")) {
    return;
  }
  for (const link of document.querySelectorAll('link[rel="modulepreload"]')) {
    processPreload(link);
  }
  new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type !== "childList") {
        continue;
      }
      for (const node of mutation.addedNodes) {
        if (node.tagName === "LINK" && node.rel === "modulepreload")
          processPreload(node);
      }
    }
  }).observe(document, { childList: true, subtree: true });
  function getFetchOpts(link) {
    const fetchOpts = {};
    if (link.integrity) fetchOpts.integrity = link.integrity;
    if (link.referrerPolicy) fetchOpts.referrerPolicy = link.referrerPolicy;
    if (link.crossOrigin === "use-credentials")
      fetchOpts.credentials = "include";
    else if (link.crossOrigin === "anonymous") fetchOpts.credentials = "omit";
    else fetchOpts.credentials = "same-origin";
    return fetchOpts;
  }
  function processPreload(link) {
    if (link.ep)
      return;
    link.ep = true;
    const fetchOpts = getFetchOpts(link);
    fetch(link.href, fetchOpts);
  }
})();
const namespaces = {
  svg: "http://www.w3.org/2000/svg",
  xmlns: "http://www.w3.org/2000/xmlns/",
  xhtml: "http://www.w3.org/1999/xhtml",
  xlink: "http://www.w3.org/1999/xlink",
  ct: "http://gionkunz.github.com/chartist-js/ct"
};
const precision = 8;
const escapingMap = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#039;"
};
function ensureUnit(value, unit) {
  if (typeof value === "number") {
    return value + unit;
  }
  return value;
}
function quantity(input) {
  if (typeof input === "string") {
    const match = /^(\d+)\s*(.*)$/g.exec(input);
    return {
      value: match ? +match[1] : 0,
      unit: (match === null || match === void 0 ? void 0 : match[2]) || void 0
    };
  }
  return {
    value: Number(input)
  };
}
function alphaNumerate(n) {
  return String.fromCharCode(97 + n % 26);
}
const EPSILON = 2221e-19;
function orderOfMagnitude(value) {
  return Math.floor(Math.log(Math.abs(value)) / Math.LN10);
}
function projectLength(axisLength, length, bounds) {
  return length / bounds.range * axisLength;
}
function roundWithPrecision(value, digits) {
  const precision$1 = Math.pow(10, precision);
  return Math.round(value * precision$1) / precision$1;
}
function rho(num) {
  if (num === 1) {
    return num;
  }
  function gcd(p, q) {
    if (p % q === 0) {
      return q;
    } else {
      return gcd(q, p % q);
    }
  }
  function f(x) {
    return x * x + 1;
  }
  let x1 = 2;
  let x2 = 2;
  let divisor;
  if (num % 2 === 0) {
    return 2;
  }
  do {
    x1 = f(x1) % num;
    x2 = f(f(x2)) % num;
    divisor = gcd(Math.abs(x1 - x2), num);
  } while (divisor === 1);
  return divisor;
}
function getBounds(axisLength, highLow, scaleMinSpace) {
  let onlyInteger = arguments.length > 3 && arguments[3] !== void 0 ? arguments[3] : false;
  const bounds = {
    high: highLow.high,
    low: highLow.low,
    valueRange: 0,
    oom: 0,
    step: 0,
    min: 0,
    max: 0,
    range: 0,
    numberOfSteps: 0,
    values: []
  };
  bounds.valueRange = bounds.high - bounds.low;
  bounds.oom = orderOfMagnitude(bounds.valueRange);
  bounds.step = Math.pow(10, bounds.oom);
  bounds.min = Math.floor(bounds.low / bounds.step) * bounds.step;
  bounds.max = Math.ceil(bounds.high / bounds.step) * bounds.step;
  bounds.range = bounds.max - bounds.min;
  bounds.numberOfSteps = Math.round(bounds.range / bounds.step);
  const length = projectLength(axisLength, bounds.step, bounds);
  const scaleUp = length < scaleMinSpace;
  const smallestFactor = onlyInteger ? rho(bounds.range) : 0;
  if (onlyInteger && projectLength(axisLength, 1, bounds) >= scaleMinSpace) {
    bounds.step = 1;
  } else if (onlyInteger && smallestFactor < bounds.step && projectLength(axisLength, smallestFactor, bounds) >= scaleMinSpace) {
    bounds.step = smallestFactor;
  } else {
    let optimizationCounter = 0;
    for (; ; ) {
      if (scaleUp && projectLength(axisLength, bounds.step, bounds) <= scaleMinSpace) {
        bounds.step *= 2;
      } else if (!scaleUp && projectLength(axisLength, bounds.step / 2, bounds) >= scaleMinSpace) {
        bounds.step /= 2;
        if (onlyInteger && bounds.step % 1 !== 0) {
          bounds.step *= 2;
          break;
        }
      } else {
        break;
      }
      if (optimizationCounter++ > 1e3) {
        throw new Error("Exceeded maximum number of iterations while optimizing scale step!");
      }
    }
  }
  bounds.step = Math.max(bounds.step, EPSILON);
  function safeIncrement(value, increment) {
    if (value === (value += increment)) {
      value *= 1 + (increment > 0 ? EPSILON : -2221e-19);
    }
    return value;
  }
  let newMin = bounds.min;
  let newMax = bounds.max;
  while (newMin + bounds.step <= bounds.low) {
    newMin = safeIncrement(newMin, bounds.step);
  }
  while (newMax - bounds.step >= bounds.high) {
    newMax = safeIncrement(newMax, -bounds.step);
  }
  bounds.min = newMin;
  bounds.max = newMax;
  bounds.range = bounds.max - bounds.min;
  const values = [];
  for (let i = bounds.min; i <= bounds.max; i = safeIncrement(i, bounds.step)) {
    const value = roundWithPrecision(i);
    if (value !== values[values.length - 1]) {
      values.push(value);
    }
  }
  bounds.values = values;
  return bounds;
}
function extend() {
  let target = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {};
  for (var _len = arguments.length, sources = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
    sources[_key - 1] = arguments[_key];
  }
  for (let i = 0; i < sources.length; i++) {
    const source = sources[i];
    const targetProto = Object.getPrototypeOf(target);
    for (const prop in source) {
      if (targetProto !== null && prop in targetProto) {
        continue;
      }
      const sourceProp = source[prop];
      if (typeof sourceProp === "object" && sourceProp !== null && !(sourceProp instanceof Array)) {
        target[prop] = extend(target[prop], sourceProp);
      } else {
        target[prop] = sourceProp;
      }
    }
  }
  return target;
}
const noop = (n) => n;
function times(length, filler) {
  return Array.from(
    {
      length
    },
    filler ? (_, i) => filler(i) : () => void 0
  );
}
function safeHasProperty(target, property) {
  return target !== null && typeof target === "object" && Reflect.has(target, property);
}
function isNumeric(value) {
  return value !== null && isFinite(value);
}
function isFalseyButZero(value) {
  return !value && value !== 0;
}
function getNumberOrUndefined(value) {
  return isNumeric(value) ? Number(value) : void 0;
}
function isArrayOfArrays(data) {
  if (!Array.isArray(data)) {
    return false;
  }
  return data.every(Array.isArray);
}
function each(list, callback) {
  let reverse = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : false;
  let index = 0;
  list[reverse ? "reduceRight" : "reduce"](
    (_, item, itemIndex) => callback(item, index++, itemIndex),
    void 0
  );
}
function getMetaData(seriesData, index) {
  const value = Array.isArray(seriesData) ? seriesData[index] : safeHasProperty(seriesData, "data") ? seriesData.data[index] : null;
  return safeHasProperty(value, "meta") ? value.meta : void 0;
}
function isDataHoleValue(value) {
  return value === null || value === void 0 || typeof value === "number" && isNaN(value);
}
function isArrayOfSeries(value) {
  return Array.isArray(value) && value.every(
    (_) => Array.isArray(_) || safeHasProperty(_, "data")
  );
}
function isMultiValue(value) {
  return typeof value === "object" && value !== null && (Reflect.has(value, "x") || Reflect.has(value, "y"));
}
function getMultiValue(value) {
  let dimension = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : "y";
  if (isMultiValue(value) && safeHasProperty(value, dimension)) {
    return getNumberOrUndefined(value[dimension]);
  } else {
    return getNumberOrUndefined(value);
  }
}
function getHighLow(data, options, dimension) {
  options = {
    ...options,
    ...dimension ? dimension === "x" ? options.axisX : options.axisY : {}
  };
  const highLow = {
    high: options.high === void 0 ? -Number.MAX_VALUE : +options.high,
    low: options.low === void 0 ? Number.MAX_VALUE : +options.low
  };
  const findHigh = options.high === void 0;
  const findLow = options.low === void 0;
  function recursiveHighLow(sourceData) {
    if (isDataHoleValue(sourceData)) {
      return;
    } else if (Array.isArray(sourceData)) {
      for (let i = 0; i < sourceData.length; i++) {
        recursiveHighLow(sourceData[i]);
      }
    } else {
      const value = Number(dimension && safeHasProperty(sourceData, dimension) ? sourceData[dimension] : sourceData);
      if (findHigh && value > highLow.high) {
        highLow.high = value;
      }
      if (findLow && value < highLow.low) {
        highLow.low = value;
      }
    }
  }
  if (findHigh || findLow) {
    recursiveHighLow(data);
  }
  if (options.referenceValue || options.referenceValue === 0) {
    highLow.high = Math.max(options.referenceValue, highLow.high);
    highLow.low = Math.min(options.referenceValue, highLow.low);
  }
  if (highLow.high <= highLow.low) {
    if (highLow.low === 0) {
      highLow.high = 1;
    } else if (highLow.low < 0) {
      highLow.high = 0;
    } else if (highLow.high > 0) {
      highLow.low = 0;
    } else {
      highLow.high = 1;
      highLow.low = 0;
    }
  }
  return highLow;
}
function normalizeData(data) {
  let reverse = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : false, multi = arguments.length > 2 ? arguments[2] : void 0, distributed = arguments.length > 3 ? arguments[3] : void 0;
  let labelCount;
  const normalized = {
    labels: (data.labels || []).slice(),
    series: normalizeSeries(data.series, multi, distributed)
  };
  const inputLabelCount = normalized.labels.length;
  if (isArrayOfArrays(normalized.series)) {
    labelCount = Math.max(inputLabelCount, ...normalized.series.map(
      (series) => series.length
    ));
    normalized.series.forEach((series) => {
      series.push(...times(Math.max(0, labelCount - series.length)));
    });
  } else {
    labelCount = normalized.series.length;
  }
  normalized.labels.push(...times(
    Math.max(0, labelCount - inputLabelCount),
    () => ""
  ));
  if (reverse) {
    reverseData(normalized);
  }
  return normalized;
}
function reverseData(data) {
  var ref;
  (ref = data.labels) === null || ref === void 0 ? void 0 : ref.reverse();
  data.series.reverse();
  for (const series of data.series) {
    if (safeHasProperty(series, "data")) {
      series.data.reverse();
    } else if (Array.isArray(series)) {
      series.reverse();
    }
  }
}
function normalizeMulti(value, multi) {
  let x;
  let y;
  if (typeof value !== "object") {
    const num = getNumberOrUndefined(value);
    if (multi === "x") {
      x = num;
    } else {
      y = num;
    }
  } else {
    if (safeHasProperty(value, "x")) {
      x = getNumberOrUndefined(value.x);
    }
    if (safeHasProperty(value, "y")) {
      y = getNumberOrUndefined(value.y);
    }
  }
  if (x === void 0 && y === void 0) {
    return void 0;
  }
  return {
    x,
    y
  };
}
function normalizePrimitive(value, multi) {
  if (isDataHoleValue(value)) {
    return void 0;
  }
  if (multi) {
    return normalizeMulti(value, multi);
  }
  return getNumberOrUndefined(value);
}
function normalizeSingleSeries(series, multi) {
  if (!Array.isArray(series)) {
    return normalizeSingleSeries(series.data, multi);
  }
  return series.map((value) => {
    if (safeHasProperty(value, "value")) {
      return normalizePrimitive(value.value, multi);
    }
    return normalizePrimitive(value, multi);
  });
}
function normalizeSeries(series, multi, distributed) {
  if (isArrayOfSeries(series)) {
    return series.map(
      (_) => normalizeSingleSeries(_, multi)
    );
  }
  const normalizedSeries = normalizeSingleSeries(series, multi);
  if (distributed) {
    return normalizedSeries.map(
      (value) => [
        value
      ]
    );
  }
  return normalizedSeries;
}
function splitIntoSegments(pathCoordinates, valueData, options) {
  const finalOptions = {
    increasingX: false,
    fillHoles: false,
    ...options
  };
  const segments = [];
  let hole = true;
  for (let i = 0; i < pathCoordinates.length; i += 2) {
    if (getMultiValue(valueData[i / 2].value) === void 0) {
      if (!finalOptions.fillHoles) {
        hole = true;
      }
    } else {
      if (finalOptions.increasingX && i >= 2 && pathCoordinates[i] <= pathCoordinates[i - 2]) {
        hole = true;
      }
      if (hole) {
        segments.push({
          pathCoordinates: [],
          valueData: []
        });
        hole = false;
      }
      segments[segments.length - 1].pathCoordinates.push(pathCoordinates[i], pathCoordinates[i + 1]);
      segments[segments.length - 1].valueData.push(valueData[i / 2]);
    }
  }
  return segments;
}
function serialize(data) {
  let serialized = "";
  if (data === null || data === void 0) {
    return data;
  } else if (typeof data === "number") {
    serialized = "" + data;
  } else if (typeof data === "object") {
    serialized = JSON.stringify({
      data
    });
  } else {
    serialized = String(data);
  }
  return Object.keys(escapingMap).reduce(
    (result, key) => result.replaceAll(key, escapingMap[key]),
    serialized
  );
}
class SvgList {
  call(method, args) {
    this.svgElements.forEach(
      (element2) => Reflect.apply(element2[method], element2, args)
    );
    return this;
  }
  attr() {
    for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }
    return this.call("attr", args);
  }
  elem() {
    for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }
    return this.call("elem", args);
  }
  root() {
    for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }
    return this.call("root", args);
  }
  getNode() {
    for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }
    return this.call("getNode", args);
  }
  foreignObject() {
    for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }
    return this.call("foreignObject", args);
  }
  text() {
    for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }
    return this.call("text", args);
  }
  empty() {
    for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }
    return this.call("empty", args);
  }
  remove() {
    for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }
    return this.call("remove", args);
  }
  addClass() {
    for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }
    return this.call("addClass", args);
  }
  removeClass() {
    for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }
    return this.call("removeClass", args);
  }
  removeAllClasses() {
    for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }
    return this.call("removeAllClasses", args);
  }
  animate() {
    for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }
    return this.call("animate", args);
  }
  /**
  * @param nodeList An Array of SVG DOM nodes or a SVG DOM NodeList (as returned by document.querySelectorAll)
  */
  constructor(nodeList) {
    this.svgElements = [];
    for (let i = 0; i < nodeList.length; i++) {
      this.svgElements.push(new Svg(nodeList[i]));
    }
  }
}
const easings = {
  easeInSine: [
    0.47,
    0,
    0.745,
    0.715
  ],
  easeOutSine: [
    0.39,
    0.575,
    0.565,
    1
  ],
  easeInOutSine: [
    0.445,
    0.05,
    0.55,
    0.95
  ],
  easeInQuad: [
    0.55,
    0.085,
    0.68,
    0.53
  ],
  easeOutQuad: [
    0.25,
    0.46,
    0.45,
    0.94
  ],
  easeInOutQuad: [
    0.455,
    0.03,
    0.515,
    0.955
  ],
  easeInCubic: [
    0.55,
    0.055,
    0.675,
    0.19
  ],
  easeOutCubic: [
    0.215,
    0.61,
    0.355,
    1
  ],
  easeInOutCubic: [
    0.645,
    0.045,
    0.355,
    1
  ],
  easeInQuart: [
    0.895,
    0.03,
    0.685,
    0.22
  ],
  easeOutQuart: [
    0.165,
    0.84,
    0.44,
    1
  ],
  easeInOutQuart: [
    0.77,
    0,
    0.175,
    1
  ],
  easeInQuint: [
    0.755,
    0.05,
    0.855,
    0.06
  ],
  easeOutQuint: [
    0.23,
    1,
    0.32,
    1
  ],
  easeInOutQuint: [
    0.86,
    0,
    0.07,
    1
  ],
  easeInExpo: [
    0.95,
    0.05,
    0.795,
    0.035
  ],
  easeOutExpo: [
    0.19,
    1,
    0.22,
    1
  ],
  easeInOutExpo: [
    1,
    0,
    0,
    1
  ],
  easeInCirc: [
    0.6,
    0.04,
    0.98,
    0.335
  ],
  easeOutCirc: [
    0.075,
    0.82,
    0.165,
    1
  ],
  easeInOutCirc: [
    0.785,
    0.135,
    0.15,
    0.86
  ],
  easeInBack: [
    0.6,
    -0.28,
    0.735,
    0.045
  ],
  easeOutBack: [
    0.175,
    0.885,
    0.32,
    1.275
  ],
  easeInOutBack: [
    0.68,
    -0.55,
    0.265,
    1.55
  ]
};
function createAnimation(element2, attribute, animationDefinition) {
  let createGuided = arguments.length > 3 && arguments[3] !== void 0 ? arguments[3] : false, eventEmitter = arguments.length > 4 ? arguments[4] : void 0;
  const { easing, ...def } = animationDefinition;
  const attributeProperties = {};
  let animationEasing;
  let timeout;
  if (easing) {
    animationEasing = Array.isArray(easing) ? easing : easings[easing];
  }
  def.begin = ensureUnit(def.begin, "ms");
  def.dur = ensureUnit(def.dur, "ms");
  if (animationEasing) {
    def.calcMode = "spline";
    def.keySplines = animationEasing.join(" ");
    def.keyTimes = "0;1";
  }
  if (createGuided) {
    def.fill = "freeze";
    attributeProperties[attribute] = def.from;
    element2.attr(attributeProperties);
    timeout = quantity(def.begin || 0).value;
    def.begin = "indefinite";
  }
  const animate = element2.elem("animate", {
    attributeName: attribute,
    ...def
  });
  if (createGuided) {
    setTimeout(() => {
      try {
        animate._node.beginElement();
      } catch (err) {
        attributeProperties[attribute] = def.to;
        element2.attr(attributeProperties);
        animate.remove();
      }
    }, timeout);
  }
  const animateNode = animate.getNode();
  if (eventEmitter) {
    animateNode.addEventListener(
      "beginEvent",
      () => eventEmitter.emit("animationBegin", {
        element: element2,
        animate: animateNode,
        params: animationDefinition
      })
    );
  }
  animateNode.addEventListener("endEvent", () => {
    if (eventEmitter) {
      eventEmitter.emit("animationEnd", {
        element: element2,
        animate: animateNode,
        params: animationDefinition
      });
    }
    if (createGuided) {
      attributeProperties[attribute] = def.to;
      element2.attr(attributeProperties);
      animate.remove();
    }
  });
}
class Svg {
  attr(attributes, ns) {
    if (typeof attributes === "string") {
      if (ns) {
        return this._node.getAttributeNS(ns, attributes);
      } else {
        return this._node.getAttribute(attributes);
      }
    }
    Object.keys(attributes).forEach((key) => {
      if (attributes[key] === void 0) {
        return;
      }
      if (key.indexOf(":") !== -1) {
        const namespacedAttribute = key.split(":");
        this._node.setAttributeNS(namespaces[namespacedAttribute[0]], key, String(attributes[key]));
      } else {
        this._node.setAttribute(key, String(attributes[key]));
      }
    });
    return this;
  }
  /**
  * Create a new SVG element whose wrapper object will be selected for further operations. This way you can also create nested groups easily.
  * @param name The name of the SVG element that should be created as child element of the currently selected element wrapper
  * @param attributes An object with properties that will be added as attributes to the SVG element that is created. Attributes with undefined values will not be added.
  * @param className This class or class list will be added to the SVG element
  * @param insertFirst If this param is set to true in conjunction with a parent element the newly created element will be added as first child element in the parent element
  * @return Returns a Svg wrapper object that can be used to modify the containing SVG data
  */
  elem(name, attributes, className) {
    let insertFirst = arguments.length > 3 && arguments[3] !== void 0 ? arguments[3] : false;
    return new Svg(name, attributes, className, this, insertFirst);
  }
  /**
  * Returns the parent Chartist.SVG wrapper object
  * @return Returns a Svg wrapper around the parent node of the current node. If the parent node is not existing or it's not an SVG node then this function will return null.
  */
  parent() {
    return this._node.parentNode instanceof SVGElement ? new Svg(this._node.parentNode) : null;
  }
  /**
  * This method returns a Svg wrapper around the root SVG element of the current tree.
  * @return The root SVG element wrapped in a Svg element
  */
  root() {
    let node = this._node;
    while (node.nodeName !== "svg") {
      if (node.parentElement) {
        node = node.parentElement;
      } else {
        break;
      }
    }
    return new Svg(node);
  }
  /**
  * Find the first child SVG element of the current element that matches a CSS selector. The returned object is a Svg wrapper.
  * @param selector A CSS selector that is used to query for child SVG elements
  * @return The SVG wrapper for the element found or null if no element was found
  */
  querySelector(selector) {
    const foundNode = this._node.querySelector(selector);
    return foundNode ? new Svg(foundNode) : null;
  }
  /**
  * Find the all child SVG elements of the current element that match a CSS selector. The returned object is a Svg.List wrapper.
  * @param selector A CSS selector that is used to query for child SVG elements
  * @return The SVG wrapper list for the element found or null if no element was found
  */
  querySelectorAll(selector) {
    const foundNodes = this._node.querySelectorAll(selector);
    return new SvgList(foundNodes);
  }
  /**
  * Returns the underlying SVG node for the current element.
  */
  getNode() {
    return this._node;
  }
  /**
  * This method creates a foreignObject (see https://developer.mozilla.org/en-US/docs/Web/SVG/Element/foreignObject) that allows to embed HTML content into a SVG graphic. With the help of foreignObjects you can enable the usage of regular HTML elements inside of SVG where they are subject for SVG positioning and transformation but the Browser will use the HTML rendering capabilities for the containing DOM.
  * @param content The DOM Node, or HTML string that will be converted to a DOM Node, that is then placed into and wrapped by the foreignObject
  * @param attributes An object with properties that will be added as attributes to the foreignObject element that is created. Attributes with undefined values will not be added.
  * @param className This class or class list will be added to the SVG element
  * @param insertFirst Specifies if the foreignObject should be inserted as first child
  * @return New wrapper object that wraps the foreignObject element
  */
  foreignObject(content, attributes, className) {
    let insertFirst = arguments.length > 3 && arguments[3] !== void 0 ? arguments[3] : false;
    let contentNode;
    if (typeof content === "string") {
      const container = document.createElement("div");
      container.innerHTML = content;
      contentNode = container.firstChild;
    } else {
      contentNode = content;
    }
    if (contentNode instanceof Element) {
      contentNode.setAttribute("xmlns", namespaces.xmlns);
    }
    const fnObj = this.elem("foreignObject", attributes, className, insertFirst);
    fnObj._node.appendChild(contentNode);
    return fnObj;
  }
  /**
  * This method adds a new text element to the current Svg wrapper.
  * @param t The text that should be added to the text element that is created
  * @return The same wrapper object that was used to add the newly created element
  */
  text(t) {
    this._node.appendChild(document.createTextNode(t));
    return this;
  }
  /**
  * This method will clear all child nodes of the current wrapper object.
  * @return The same wrapper object that got emptied
  */
  empty() {
    while (this._node.firstChild) {
      this._node.removeChild(this._node.firstChild);
    }
    return this;
  }
  /**
  * This method will cause the current wrapper to remove itself from its parent wrapper. Use this method if you'd like to get rid of an element in a given DOM structure.
  * @return The parent wrapper object of the element that got removed
  */
  remove() {
    var ref;
    (ref = this._node.parentNode) === null || ref === void 0 ? void 0 : ref.removeChild(this._node);
    return this.parent();
  }
  /**
  * This method will replace the element with a new element that can be created outside of the current DOM.
  * @param newElement The new Svg object that will be used to replace the current wrapper object
  * @return The wrapper of the new element
  */
  replace(newElement) {
    var ref;
    (ref = this._node.parentNode) === null || ref === void 0 ? void 0 : ref.replaceChild(newElement._node, this._node);
    return newElement;
  }
  /**
  * This method will append an element to the current element as a child.
  * @param element The Svg element that should be added as a child
  * @param insertFirst Specifies if the element should be inserted as first child
  * @return The wrapper of the appended object
  */
  append(element2) {
    let insertFirst = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : false;
    if (insertFirst && this._node.firstChild) {
      this._node.insertBefore(element2._node, this._node.firstChild);
    } else {
      this._node.appendChild(element2._node);
    }
    return this;
  }
  /**
  * Returns an array of class names that are attached to the current wrapper element. This method can not be chained further.
  * @return A list of classes or an empty array if there are no classes on the current element
  */
  classes() {
    const classNames = this._node.getAttribute("class");
    return classNames ? classNames.trim().split(/\s+/) : [];
  }
  /**
  * Adds one or a space separated list of classes to the current element and ensures the classes are only existing once.
  * @param names A white space separated list of class names
  * @return The wrapper of the current element
  */
  addClass(names) {
    this._node.setAttribute("class", this.classes().concat(names.trim().split(/\s+/)).filter(function(elem, pos, self) {
      return self.indexOf(elem) === pos;
    }).join(" "));
    return this;
  }
  /**
  * Removes one or a space separated list of classes from the current element.
  * @param names A white space separated list of class names
  * @return The wrapper of the current element
  */
  removeClass(names) {
    const removedClasses = names.trim().split(/\s+/);
    this._node.setAttribute("class", this.classes().filter(
      (name) => removedClasses.indexOf(name) === -1
    ).join(" "));
    return this;
  }
  /**
  * Removes all classes from the current element.
  * @return The wrapper of the current element
  */
  removeAllClasses() {
    this._node.setAttribute("class", "");
    return this;
  }
  /**
  * Get element height using `clientHeight`
  * @return The elements height in pixels
  */
  height() {
    return this._node.clientHeight;
  }
  /**
  * Get element width using `clientWidth`
  * @return The elements width in pixels
  */
  width() {
    return this._node.clientWidth;
  }
  /**
  * The animate function lets you animate the current element with SMIL animations. You can add animations for multiple attributes at the same time by using an animation definition object. This object should contain SMIL animation attributes. Please refer to http://www.w3.org/TR/SVG/animate.html for a detailed specification about the available animation attributes. Additionally an easing property can be passed in the animation definition object. This can be a string with a name of an easing function in `Svg.Easing` or an array with four numbers specifying a cubic Bézier curve.
  * **An animations object could look like this:**
  * ```javascript
  * element.animate({
  *   opacity: {
  *     dur: 1000,
  *     from: 0,
  *     to: 1
  *   },
  *   x1: {
  *     dur: '1000ms',
  *     from: 100,
  *     to: 200,
  *     easing: 'easeOutQuart'
  *   },
  *   y1: {
  *     dur: '2s',
  *     from: 0,
  *     to: 100
  *   }
  * });
  * ```
  * **Automatic unit conversion**
  * For the `dur` and the `begin` animate attribute you can also omit a unit by passing a number. The number will automatically be converted to milli seconds.
  * **Guided mode**
  * The default behavior of SMIL animations with offset using the `begin` attribute is that the attribute will keep it's original value until the animation starts. Mostly this behavior is not desired as you'd like to have your element attributes already initialized with the animation `from` value even before the animation starts. Also if you don't specify `fill="freeze"` on an animate element or if you delete the animation after it's done (which is done in guided mode) the attribute will switch back to the initial value. This behavior is also not desired when performing simple one-time animations. For one-time animations you'd want to trigger animations immediately instead of relative to the document begin time. That's why in guided mode Svg will also use the `begin` property to schedule a timeout and manually start the animation after the timeout. If you're using multiple SMIL definition objects for an attribute (in an array), guided mode will be disabled for this attribute, even if you explicitly enabled it.
  * If guided mode is enabled the following behavior is added:
  * - Before the animation starts (even when delayed with `begin`) the animated attribute will be set already to the `from` value of the animation
  * - `begin` is explicitly set to `indefinite` so it can be started manually without relying on document begin time (creation)
  * - The animate element will be forced to use `fill="freeze"`
  * - The animation will be triggered with `beginElement()` in a timeout where `begin` of the definition object is interpreted in milli seconds. If no `begin` was specified the timeout is triggered immediately.
  * - After the animation the element attribute value will be set to the `to` value of the animation
  * - The animate element is deleted from the DOM
  * @param animations An animations object where the property keys are the attributes you'd like to animate. The properties should be objects again that contain the SMIL animation attributes (usually begin, dur, from, and to). The property begin and dur is auto converted (see Automatic unit conversion). You can also schedule multiple animations for the same attribute by passing an Array of SMIL definition objects. Attributes that contain an array of SMIL definition objects will not be executed in guided mode.
  * @param guided Specify if guided mode should be activated for this animation (see Guided mode). If not otherwise specified, guided mode will be activated.
  * @param eventEmitter If specified, this event emitter will be notified when an animation starts or ends.
  * @return The current element where the animation was added
  */
  animate(animations) {
    let guided = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : true, eventEmitter = arguments.length > 2 ? arguments[2] : void 0;
    Object.keys(animations).forEach((attribute) => {
      const attributeAnimation = animations[attribute];
      if (Array.isArray(attributeAnimation)) {
        attributeAnimation.forEach(
          (animationDefinition) => createAnimation(this, attribute, animationDefinition, false, eventEmitter)
        );
      } else {
        createAnimation(this, attribute, attributeAnimation, guided, eventEmitter);
      }
    });
    return this;
  }
  /**
  * @param name The name of the SVG element to create or an SVG dom element which should be wrapped into Svg
  * @param attributes An object with properties that will be added as attributes to the SVG element that is created. Attributes with undefined values will not be added.
  * @param className This class or class list will be added to the SVG element
  * @param parent The parent SVG wrapper object where this newly created wrapper and it's element will be attached to as child
  * @param insertFirst If this param is set to true in conjunction with a parent element the newly created element will be added as first child element in the parent element
  */
  constructor(name, attributes, className, parent, insertFirst = false) {
    if (name instanceof Element) {
      this._node = name;
    } else {
      this._node = document.createElementNS(namespaces.svg, name);
      if (name === "svg") {
        this.attr({
          "xmlns:ct": namespaces.ct
        });
      }
    }
    if (attributes) {
      this.attr(attributes);
    }
    if (className) {
      this.addClass(className);
    }
    if (parent) {
      if (insertFirst && parent._node.firstChild) {
        parent._node.insertBefore(this._node, parent._node.firstChild);
      } else {
        parent._node.appendChild(this._node);
      }
    }
  }
}
Svg.Easing = easings;
function createSvg(container) {
  let width = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : "100%", height = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : "100%", className = arguments.length > 3 ? arguments[3] : void 0;
  if (!container) {
    throw new Error("Container element is not found");
  }
  Array.from(container.querySelectorAll("svg")).filter(
    (svg) => svg.getAttributeNS(namespaces.xmlns, "ct")
  ).forEach(
    (svg) => container.removeChild(svg)
  );
  const svg1 = new Svg("svg").attr({
    width,
    height
  }).attr({
    // TODO: Check better solution (browser support) and remove inline styles due to CSP
    style: "width: ".concat(width, "; height: ").concat(height, ";")
  });
  if (className) {
    svg1.addClass(className);
  }
  container.appendChild(svg1.getNode());
  return svg1;
}
function normalizePadding(padding) {
  return typeof padding === "number" ? {
    top: padding,
    right: padding,
    bottom: padding,
    left: padding
  } : padding === void 0 ? {
    top: 0,
    right: 0,
    bottom: 0,
    left: 0
  } : {
    top: typeof padding.top === "number" ? padding.top : 0,
    right: typeof padding.right === "number" ? padding.right : 0,
    bottom: typeof padding.bottom === "number" ? padding.bottom : 0,
    left: typeof padding.left === "number" ? padding.left : 0
  };
}
function createChartRect(svg, options) {
  var ref, ref1, ref2, ref3;
  const hasAxis = Boolean(options.axisX || options.axisY);
  const yAxisOffset = ((ref = options.axisY) === null || ref === void 0 ? void 0 : ref.offset) || 0;
  const xAxisOffset = ((ref1 = options.axisX) === null || ref1 === void 0 ? void 0 : ref1.offset) || 0;
  const yAxisPosition = (ref2 = options.axisY) === null || ref2 === void 0 ? void 0 : ref2.position;
  const xAxisPosition = (ref3 = options.axisX) === null || ref3 === void 0 ? void 0 : ref3.position;
  let width = svg.width() || quantity(options.width).value || 0;
  let height = svg.height() || quantity(options.height).value || 0;
  const normalizedPadding = normalizePadding(options.chartPadding);
  width = Math.max(width, yAxisOffset + normalizedPadding.left + normalizedPadding.right);
  height = Math.max(height, xAxisOffset + normalizedPadding.top + normalizedPadding.bottom);
  const chartRect = {
    x1: 0,
    x2: 0,
    y1: 0,
    y2: 0,
    padding: normalizedPadding,
    width() {
      return this.x2 - this.x1;
    },
    height() {
      return this.y1 - this.y2;
    }
  };
  if (hasAxis) {
    if (xAxisPosition === "start") {
      chartRect.y2 = normalizedPadding.top + xAxisOffset;
      chartRect.y1 = Math.max(height - normalizedPadding.bottom, chartRect.y2 + 1);
    } else {
      chartRect.y2 = normalizedPadding.top;
      chartRect.y1 = Math.max(height - normalizedPadding.bottom - xAxisOffset, chartRect.y2 + 1);
    }
    if (yAxisPosition === "start") {
      chartRect.x1 = normalizedPadding.left + yAxisOffset;
      chartRect.x2 = Math.max(width - normalizedPadding.right, chartRect.x1 + 1);
    } else {
      chartRect.x1 = normalizedPadding.left;
      chartRect.x2 = Math.max(width - normalizedPadding.right - yAxisOffset, chartRect.x1 + 1);
    }
  } else {
    chartRect.x1 = normalizedPadding.left;
    chartRect.x2 = Math.max(width - normalizedPadding.right, chartRect.x1 + 1);
    chartRect.y2 = normalizedPadding.top;
    chartRect.y1 = Math.max(height - normalizedPadding.bottom, chartRect.y2 + 1);
  }
  return chartRect;
}
function createGrid(position, index, axis, offset, length, group, classes, eventEmitter) {
  const positionalData = {
    ["".concat(axis.units.pos, "1")]: position,
    ["".concat(axis.units.pos, "2")]: position,
    ["".concat(axis.counterUnits.pos, "1")]: offset,
    ["".concat(axis.counterUnits.pos, "2")]: offset + length
  };
  const gridElement = group.elem("line", positionalData, classes.join(" "));
  eventEmitter.emit("draw", {
    type: "grid",
    axis,
    index,
    group,
    element: gridElement,
    ...positionalData
  });
}
function createGridBackground(gridGroup, chartRect, className, eventEmitter) {
  const gridBackground = gridGroup.elem("rect", {
    x: chartRect.x1,
    y: chartRect.y2,
    width: chartRect.width(),
    height: chartRect.height()
  }, className, true);
  eventEmitter.emit("draw", {
    type: "gridBackground",
    group: gridGroup,
    element: gridBackground
  });
}
function createLabel(position, length, index, label, axis, axisOffset, labelOffset, group, classes, eventEmitter) {
  const positionalData = {
    [axis.units.pos]: position + labelOffset[axis.units.pos],
    [axis.counterUnits.pos]: labelOffset[axis.counterUnits.pos],
    [axis.units.len]: length,
    [axis.counterUnits.len]: Math.max(0, axisOffset - 10)
  };
  const stepLength = Math.round(positionalData[axis.units.len]);
  const stepCounterLength = Math.round(positionalData[axis.counterUnits.len]);
  const content = document.createElement("span");
  content.className = classes.join(" ");
  content.style[axis.units.len] = stepLength + "px";
  content.style[axis.counterUnits.len] = stepCounterLength + "px";
  content.textContent = String(label);
  const labelElement = group.foreignObject(content, {
    style: "overflow: visible;",
    ...positionalData
  });
  eventEmitter.emit("draw", {
    type: "label",
    axis,
    index,
    group,
    element: labelElement,
    text: label,
    ...positionalData
  });
}
function optionsProvider(options, responsiveOptions, eventEmitter) {
  let currentOptions;
  const mediaQueryListeners = [];
  function updateCurrentOptions(mediaEvent) {
    const previousOptions = currentOptions;
    currentOptions = extend({}, options);
    if (responsiveOptions) {
      responsiveOptions.forEach((responsiveOption) => {
        const mql = window.matchMedia(responsiveOption[0]);
        if (mql.matches) {
          currentOptions = extend({}, currentOptions, responsiveOption[1]);
        }
      });
    }
    if (eventEmitter && mediaEvent) {
      eventEmitter.emit("optionsChanged", {
        previousOptions,
        currentOptions
      });
    }
  }
  function removeMediaQueryListeners() {
    mediaQueryListeners.forEach(
      (mql) => mql.removeEventListener("change", updateCurrentOptions)
    );
  }
  if (!window.matchMedia) {
    throw new Error("window.matchMedia not found! Make sure you're using a polyfill.");
  } else if (responsiveOptions) {
    responsiveOptions.forEach((responsiveOption) => {
      const mql = window.matchMedia(responsiveOption[0]);
      mql.addEventListener("change", updateCurrentOptions);
      mediaQueryListeners.push(mql);
    });
  }
  updateCurrentOptions();
  return {
    removeMediaQueryListeners,
    getCurrentOptions() {
      return currentOptions;
    }
  };
}
const elementDescriptions = {
  m: [
    "x",
    "y"
  ],
  l: [
    "x",
    "y"
  ],
  c: [
    "x1",
    "y1",
    "x2",
    "y2",
    "x",
    "y"
  ],
  a: [
    "rx",
    "ry",
    "xAr",
    "lAf",
    "sf",
    "x",
    "y"
  ]
};
const defaultOptions$3 = {
  // The accuracy in digit count after the decimal point. This will be used to round numbers in the SVG path. If this option is set to false then no rounding will be performed.
  accuracy: 3
};
function element(command, params, pathElements, pos, relative, data) {
  const pathElement = {
    command: relative ? command.toLowerCase() : command.toUpperCase(),
    ...params,
    ...data ? {
      data
    } : {}
  };
  pathElements.splice(pos, 0, pathElement);
}
function forEachParam(pathElements, cb) {
  pathElements.forEach((pathElement, pathElementIndex) => {
    elementDescriptions[pathElement.command.toLowerCase()].forEach((paramName, paramIndex) => {
      cb(pathElement, paramName, pathElementIndex, paramIndex, pathElements);
    });
  });
}
class SvgPath {
  /**
  * This static function on `SvgPath` is joining multiple paths together into one paths.
  * @param paths A list of paths to be joined together. The order is important.
  * @param close If the newly created path should be a closed path
  * @param options Path options for the newly created path.
  */
  static join(paths) {
    let close = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : false, options = arguments.length > 2 ? arguments[2] : void 0;
    const joinedPath = new SvgPath(close, options);
    for (let i = 0; i < paths.length; i++) {
      const path = paths[i];
      for (let j = 0; j < path.pathElements.length; j++) {
        joinedPath.pathElements.push(path.pathElements[j]);
      }
    }
    return joinedPath;
  }
  position(pos) {
    if (pos !== void 0) {
      this.pos = Math.max(0, Math.min(this.pathElements.length, pos));
      return this;
    } else {
      return this.pos;
    }
  }
  /**
  * Removes elements from the path starting at the current position.
  * @param count Number of path elements that should be removed from the current position.
  * @return The current path object for easy call chaining.
  */
  remove(count) {
    this.pathElements.splice(this.pos, count);
    return this;
  }
  /**
  * Use this function to add a new move SVG path element.
  * @param x The x coordinate for the move element.
  * @param y The y coordinate for the move element.
  * @param relative If set to true the move element will be created with relative coordinates (lowercase letter)
  * @param data Any data that should be stored with the element object that will be accessible in pathElement
  * @return The current path object for easy call chaining.
  */
  move(x, y) {
    let relative = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : false, data = arguments.length > 3 ? arguments[3] : void 0;
    element("M", {
      x: +x,
      y: +y
    }, this.pathElements, this.pos++, relative, data);
    return this;
  }
  /**
  * Use this function to add a new line SVG path element.
  * @param x The x coordinate for the line element.
  * @param y The y coordinate for the line element.
  * @param relative If set to true the line element will be created with relative coordinates (lowercase letter)
  * @param data Any data that should be stored with the element object that will be accessible in pathElement
  * @return The current path object for easy call chaining.
  */
  line(x, y) {
    let relative = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : false, data = arguments.length > 3 ? arguments[3] : void 0;
    element("L", {
      x: +x,
      y: +y
    }, this.pathElements, this.pos++, relative, data);
    return this;
  }
  /**
  * Use this function to add a new curve SVG path element.
  * @param x1 The x coordinate for the first control point of the bezier curve.
  * @param y1 The y coordinate for the first control point of the bezier curve.
  * @param x2 The x coordinate for the second control point of the bezier curve.
  * @param y2 The y coordinate for the second control point of the bezier curve.
  * @param x The x coordinate for the target point of the curve element.
  * @param y The y coordinate for the target point of the curve element.
  * @param relative If set to true the curve element will be created with relative coordinates (lowercase letter)
  * @param data Any data that should be stored with the element object that will be accessible in pathElement
  * @return The current path object for easy call chaining.
  */
  curve(x1, y1, x2, y2, x, y) {
    let relative = arguments.length > 6 && arguments[6] !== void 0 ? arguments[6] : false, data = arguments.length > 7 ? arguments[7] : void 0;
    element("C", {
      x1: +x1,
      y1: +y1,
      x2: +x2,
      y2: +y2,
      x: +x,
      y: +y
    }, this.pathElements, this.pos++, relative, data);
    return this;
  }
  /**
  * Use this function to add a new non-bezier curve SVG path element.
  * @param rx The radius to be used for the x-axis of the arc.
  * @param ry The radius to be used for the y-axis of the arc.
  * @param xAr Defines the orientation of the arc
  * @param lAf Large arc flag
  * @param sf Sweep flag
  * @param x The x coordinate for the target point of the curve element.
  * @param y The y coordinate for the target point of the curve element.
  * @param relative If set to true the curve element will be created with relative coordinates (lowercase letter)
  * @param data Any data that should be stored with the element object that will be accessible in pathElement
  * @return The current path object for easy call chaining.
  */
  arc(rx, ry, xAr, lAf, sf, x, y) {
    let relative = arguments.length > 7 && arguments[7] !== void 0 ? arguments[7] : false, data = arguments.length > 8 ? arguments[8] : void 0;
    element("A", {
      rx,
      ry,
      xAr,
      lAf,
      sf,
      x,
      y
    }, this.pathElements, this.pos++, relative, data);
    return this;
  }
  /**
  * Parses an SVG path seen in the d attribute of path elements, and inserts the parsed elements into the existing path object at the current cursor position. Any closing path indicators (Z at the end of the path) will be ignored by the parser as this is provided by the close option in the options of the path object.
  * @param path Any SVG path that contains move (m), line (l) or curve (c) components.
  * @return The current path object for easy call chaining.
  */
  parse(path) {
    const chunks = path.replace(/([A-Za-z])(-?[0-9])/g, "$1 $2").replace(/([0-9])([A-Za-z])/g, "$1 $2").split(/[\s,]+/).reduce((result, pathElement) => {
      if (pathElement.match(/[A-Za-z]/)) {
        result.push([]);
      }
      result[result.length - 1].push(pathElement);
      return result;
    }, []);
    if (chunks[chunks.length - 1][0].toUpperCase() === "Z") {
      chunks.pop();
    }
    const elements = chunks.map((chunk) => {
      const command = chunk.shift();
      const description = elementDescriptions[command.toLowerCase()];
      return {
        command,
        ...description.reduce((result, paramName, index) => {
          result[paramName] = +chunk[index];
          return result;
        }, {})
      };
    });
    this.pathElements.splice(this.pos, 0, ...elements);
    this.pos += elements.length;
    return this;
  }
  /**
  * This function renders to current SVG path object into a final SVG string that can be used in the d attribute of SVG path elements. It uses the accuracy option to round big decimals. If the close parameter was set in the constructor of this path object then a path closing Z will be appended to the output string.
  */
  stringify() {
    const accuracyMultiplier = Math.pow(10, this.options.accuracy);
    return this.pathElements.reduce((path, pathElement) => {
      const params = elementDescriptions[pathElement.command.toLowerCase()].map((paramName) => {
        const value = pathElement[paramName];
        return this.options.accuracy ? Math.round(value * accuracyMultiplier) / accuracyMultiplier : value;
      });
      return path + pathElement.command + params.join(",");
    }, "") + (this.close ? "Z" : "");
  }
  /**
  * Scales all elements in the current SVG path object. There is an individual parameter for each coordinate. Scaling will also be done for control points of curves, affecting the given coordinate.
  * @param x The number which will be used to scale the x, x1 and x2 of all path elements.
  * @param y The number which will be used to scale the y, y1 and y2 of all path elements.
  * @return The current path object for easy call chaining.
  */
  scale(x, y) {
    forEachParam(this.pathElements, (pathElement, paramName) => {
      pathElement[paramName] *= paramName[0] === "x" ? x : y;
    });
    return this;
  }
  /**
  * Translates all elements in the current SVG path object. The translation is relative and there is an individual parameter for each coordinate. Translation will also be done for control points of curves, affecting the given coordinate.
  * @param x The number which will be used to translate the x, x1 and x2 of all path elements.
  * @param y The number which will be used to translate the y, y1 and y2 of all path elements.
  * @return The current path object for easy call chaining.
  */
  translate(x, y) {
    forEachParam(this.pathElements, (pathElement, paramName) => {
      pathElement[paramName] += paramName[0] === "x" ? x : y;
    });
    return this;
  }
  /**
  * This function will run over all existing path elements and then loop over their attributes. The callback function will be called for every path element attribute that exists in the current path.
  * The method signature of the callback function looks like this:
  * ```javascript
  * function(pathElement, paramName, pathElementIndex, paramIndex, pathElements)
  * ```
  * If something else than undefined is returned by the callback function, this value will be used to replace the old value. This allows you to build custom transformations of path objects that can't be achieved using the basic transformation functions scale and translate.
  * @param transformFnc The callback function for the transformation. Check the signature in the function description.
  * @return The current path object for easy call chaining.
  */
  transform(transformFnc) {
    forEachParam(this.pathElements, (pathElement, paramName, pathElementIndex, paramIndex, pathElements) => {
      const transformed = transformFnc(pathElement, paramName, pathElementIndex, paramIndex, pathElements);
      if (transformed || transformed === 0) {
        pathElement[paramName] = transformed;
      }
    });
    return this;
  }
  /**
  * This function clones a whole path object with all its properties. This is a deep clone and path element objects will also be cloned.
  * @param close Optional option to set the new cloned path to closed. If not specified or false, the original path close option will be used.
  */
  clone() {
    let close = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : false;
    const clone = new SvgPath(close || this.close);
    clone.pos = this.pos;
    clone.pathElements = this.pathElements.slice().map(
      (pathElement) => ({
        ...pathElement
      })
    );
    clone.options = {
      ...this.options
    };
    return clone;
  }
  /**
  * Split a Svg.Path object by a specific command in the path chain. The path chain will be split and an array of newly created paths objects will be returned. This is useful if you'd like to split an SVG path by it's move commands, for example, in order to isolate chunks of drawings.
  * @param command The command you'd like to use to split the path
  */
  splitByCommand(command) {
    const split = [
      new SvgPath()
    ];
    this.pathElements.forEach((pathElement) => {
      if (pathElement.command === command.toUpperCase() && split[split.length - 1].pathElements.length !== 0) {
        split.push(new SvgPath());
      }
      split[split.length - 1].pathElements.push(pathElement);
    });
    return split;
  }
  /**
  * Used to construct a new path object.
  * @param close If set to true then this path will be closed when stringified (with a Z at the end)
  * @param options Options object that overrides the default objects. See default options for more details.
  */
  constructor(close = false, options) {
    this.close = close;
    this.pathElements = [];
    this.pos = 0;
    this.options = {
      ...defaultOptions$3,
      ...options
    };
  }
}
function none(options) {
  const finalOptions = {
    fillHoles: false,
    ...options
  };
  return function noneInterpolation(pathCoordinates, valueData) {
    const path = new SvgPath();
    let hole = true;
    for (let i = 0; i < pathCoordinates.length; i += 2) {
      const currX = pathCoordinates[i];
      const currY = pathCoordinates[i + 1];
      const currData = valueData[i / 2];
      if (getMultiValue(currData.value) !== void 0) {
        if (hole) {
          path.move(currX, currY, false, currData);
        } else {
          path.line(currX, currY, false, currData);
        }
        hole = false;
      } else if (!finalOptions.fillHoles) {
        hole = true;
      }
    }
    return path;
  };
}
function monotoneCubic(options) {
  const finalOptions = {
    fillHoles: false,
    ...options
  };
  return function monotoneCubicInterpolation(pathCoordinates, valueData) {
    const segments = splitIntoSegments(pathCoordinates, valueData, {
      fillHoles: finalOptions.fillHoles,
      increasingX: true
    });
    if (!segments.length) {
      return none()([], []);
    } else if (segments.length > 1) {
      return SvgPath.join(segments.map(
        (segment) => monotoneCubicInterpolation(segment.pathCoordinates, segment.valueData)
      ));
    } else {
      pathCoordinates = segments[0].pathCoordinates;
      valueData = segments[0].valueData;
      if (pathCoordinates.length <= 4) {
        return none()(pathCoordinates, valueData);
      }
      const xs = [];
      const ys = [];
      const n = pathCoordinates.length / 2;
      const ms = [];
      const ds = [];
      const dys = [];
      const dxs = [];
      for (let i = 0; i < n; i++) {
        xs[i] = pathCoordinates[i * 2];
        ys[i] = pathCoordinates[i * 2 + 1];
      }
      for (let i1 = 0; i1 < n - 1; i1++) {
        dys[i1] = ys[i1 + 1] - ys[i1];
        dxs[i1] = xs[i1 + 1] - xs[i1];
        ds[i1] = dys[i1] / dxs[i1];
      }
      ms[0] = ds[0];
      ms[n - 1] = ds[n - 2];
      for (let i2 = 1; i2 < n - 1; i2++) {
        if (ds[i2] === 0 || ds[i2 - 1] === 0 || ds[i2 - 1] > 0 !== ds[i2] > 0) {
          ms[i2] = 0;
        } else {
          ms[i2] = 3 * (dxs[i2 - 1] + dxs[i2]) / ((2 * dxs[i2] + dxs[i2 - 1]) / ds[i2 - 1] + (dxs[i2] + 2 * dxs[i2 - 1]) / ds[i2]);
          if (!isFinite(ms[i2])) {
            ms[i2] = 0;
          }
        }
      }
      const path = new SvgPath().move(xs[0], ys[0], false, valueData[0]);
      for (let i3 = 0; i3 < n - 1; i3++) {
        path.curve(
          // First control point
          xs[i3] + dxs[i3] / 3,
          ys[i3] + ms[i3] * dxs[i3] / 3,
          // Second control point
          xs[i3 + 1] - dxs[i3] / 3,
          ys[i3 + 1] - ms[i3 + 1] * dxs[i3] / 3,
          // End point
          xs[i3 + 1],
          ys[i3 + 1],
          false,
          valueData[i3 + 1]
        );
      }
      return path;
    }
  };
}
class EventEmitter {
  on(event, listener) {
    const { allListeners, listeners } = this;
    if (event === "*") {
      allListeners.add(listener);
    } else {
      if (!listeners.has(event)) {
        listeners.set(event, /* @__PURE__ */ new Set());
      }
      listeners.get(event).add(listener);
    }
  }
  off(event, listener) {
    const { allListeners, listeners } = this;
    if (event === "*") {
      if (listener) {
        allListeners.delete(listener);
      } else {
        allListeners.clear();
      }
    } else if (listeners.has(event)) {
      const eventListeners = listeners.get(event);
      if (listener) {
        eventListeners.delete(listener);
      } else {
        eventListeners.clear();
      }
      if (!eventListeners.size) {
        listeners.delete(event);
      }
    }
  }
  /**
  * Use this function to emit an event. All handlers that are listening for this event will be triggered with the data parameter.
  * @param event The event name that should be triggered
  * @param data Arbitrary data that will be passed to the event handler callback functions
  */
  emit(event, data) {
    const { allListeners, listeners } = this;
    if (listeners.has(event)) {
      listeners.get(event).forEach(
        (listener) => listener(data)
      );
    }
    allListeners.forEach(
      (listener) => listener(event, data)
    );
  }
  constructor() {
    this.listeners = /* @__PURE__ */ new Map();
    this.allListeners = /* @__PURE__ */ new Set();
  }
}
const instances = /* @__PURE__ */ new WeakMap();
class BaseChart {
  // TODO: Currently we need to re-draw the chart on window resize. This is usually very bad and will affect performance.
  // This is done because we can't work with relative coordinates when drawing the chart because SVG Path does not
  // work with relative positions yet. We need to check if we can do a viewBox hack to switch to percentage.
  // See http://mozilla.6506.n7.nabble.com/Specyfing-paths-with-percentages-unit-td247474.html
  // Update: can be done using the above method tested here: http://codepen.io/gionkunz/pen/KDvLj
  // The problem is with the label offsets that can't be converted into percentage and affecting the chart container
  /**
  * Updates the chart which currently does a full reconstruction of the SVG DOM
  * @param data Optional data you'd like to set for the chart before it will update. If not specified the update method will use the data that is already configured with the chart.
  * @param options Optional options you'd like to add to the previous options for the chart before it will update. If not specified the update method will use the options that have been already configured with the chart.
  * @param override If set to true, the passed options will be used to extend the options that have been configured already. Otherwise the chart default options will be used as the base
  */
  update(data, options) {
    let override = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : false;
    if (data) {
      this.data = data || {};
      this.data.labels = this.data.labels || [];
      this.data.series = this.data.series || [];
      this.eventEmitter.emit("data", {
        type: "update",
        data: this.data
      });
    }
    if (options) {
      this.options = extend({}, override ? this.options : this.defaultOptions, options);
      if (!this.initializeTimeoutId) {
        var ref;
        (ref = this.optionsProvider) === null || ref === void 0 ? void 0 : ref.removeMediaQueryListeners();
        this.optionsProvider = optionsProvider(this.options, this.responsiveOptions, this.eventEmitter);
      }
    }
    if (!this.initializeTimeoutId && this.optionsProvider) {
      this.createChart(this.optionsProvider.getCurrentOptions());
    }
    return this;
  }
  /**
  * This method can be called on the API object of each chart and will un-register all event listeners that were added to other components. This currently includes a window.resize listener as well as media query listeners if any responsive options have been provided. Use this function if you need to destroy and recreate Chartist charts dynamically.
  */
  detach() {
    if (!this.initializeTimeoutId) {
      var ref;
      window.removeEventListener("resize", this.resizeListener);
      (ref = this.optionsProvider) === null || ref === void 0 ? void 0 : ref.removeMediaQueryListeners();
    } else {
      window.clearTimeout(this.initializeTimeoutId);
    }
    instances.delete(this.container);
    return this;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  on(event, listener) {
    this.eventEmitter.on(event, listener);
    return this;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  off(event, listener) {
    this.eventEmitter.off(event, listener);
    return this;
  }
  initialize() {
    window.addEventListener("resize", this.resizeListener);
    this.optionsProvider = optionsProvider(this.options, this.responsiveOptions, this.eventEmitter);
    this.eventEmitter.on(
      "optionsChanged",
      () => this.update()
    );
    if (this.options.plugins) {
      this.options.plugins.forEach((plugin) => {
        if (Array.isArray(plugin)) {
          plugin[0](this, plugin[1]);
        } else {
          plugin(this);
        }
      });
    }
    this.eventEmitter.emit("data", {
      type: "initial",
      data: this.data
    });
    this.createChart(this.optionsProvider.getCurrentOptions());
    this.initializeTimeoutId = null;
  }
  constructor(query, data, defaultOptions, options, responsiveOptions) {
    this.data = data;
    this.defaultOptions = defaultOptions;
    this.options = options;
    this.responsiveOptions = responsiveOptions;
    this.eventEmitter = new EventEmitter();
    this.resizeListener = () => this.update();
    this.initializeTimeoutId = setTimeout(
      () => this.initialize(),
      0
    );
    const container = typeof query === "string" ? document.querySelector(query) : query;
    if (!container) {
      throw new Error("Target element ".concat(typeof query === "string" ? '"'.concat(query, '"') : "", " is not found"));
    }
    this.container = container;
    const prevInstance = instances.get(container);
    if (prevInstance) {
      prevInstance.detach();
    }
    instances.set(container, this);
  }
}
const axisUnits = {
  x: {
    pos: "x",
    len: "width",
    dir: "horizontal",
    rectStart: "x1",
    rectEnd: "x2",
    rectOffset: "y2"
  },
  y: {
    pos: "y",
    len: "height",
    dir: "vertical",
    rectStart: "y2",
    rectEnd: "y1",
    rectOffset: "x1"
  }
};
class Axis {
  createGridAndLabels(gridGroup, labelGroup, chartOptions, eventEmitter) {
    const axisOptions = this.units.pos === "x" ? chartOptions.axisX : chartOptions.axisY;
    const projectedValues = this.ticks.map(
      (tick, i) => this.projectValue(tick, i)
    );
    const labelValues = this.ticks.map(axisOptions.labelInterpolationFnc);
    projectedValues.forEach((projectedValue, index) => {
      const labelValue = labelValues[index];
      const labelOffset = {
        x: 0,
        y: 0
      };
      let labelLength;
      if (projectedValues[index + 1]) {
        labelLength = projectedValues[index + 1] - projectedValue;
      } else {
        labelLength = Math.max(this.axisLength - projectedValue, this.axisLength / this.ticks.length);
      }
      if (labelValue !== "" && isFalseyButZero(labelValue)) {
        return;
      }
      if (this.units.pos === "x") {
        projectedValue = this.chartRect.x1 + projectedValue;
        labelOffset.x = chartOptions.axisX.labelOffset.x;
        if (chartOptions.axisX.position === "start") {
          labelOffset.y = this.chartRect.padding.top + chartOptions.axisX.labelOffset.y + 5;
        } else {
          labelOffset.y = this.chartRect.y1 + chartOptions.axisX.labelOffset.y + 5;
        }
      } else {
        projectedValue = this.chartRect.y1 - projectedValue;
        labelOffset.y = chartOptions.axisY.labelOffset.y - labelLength;
        if (chartOptions.axisY.position === "start") {
          labelOffset.x = this.chartRect.padding.left + chartOptions.axisY.labelOffset.x;
        } else {
          labelOffset.x = this.chartRect.x2 + chartOptions.axisY.labelOffset.x + 10;
        }
      }
      if (axisOptions.showGrid) {
        createGrid(projectedValue, index, this, this.gridOffset, this.chartRect[this.counterUnits.len](), gridGroup, [
          chartOptions.classNames.grid,
          chartOptions.classNames[this.units.dir]
        ], eventEmitter);
      }
      if (axisOptions.showLabel) {
        createLabel(projectedValue, labelLength, index, labelValue, this, axisOptions.offset, labelOffset, labelGroup, [
          chartOptions.classNames.label,
          chartOptions.classNames[this.units.dir],
          axisOptions.position === "start" ? chartOptions.classNames[axisOptions.position] : chartOptions.classNames.end
        ], eventEmitter);
      }
    });
  }
  constructor(units, chartRect, ticks) {
    this.units = units;
    this.chartRect = chartRect;
    this.ticks = ticks;
    this.counterUnits = units === axisUnits.x ? axisUnits.y : axisUnits.x;
    this.axisLength = chartRect[this.units.rectEnd] - chartRect[this.units.rectStart];
    this.gridOffset = chartRect[this.units.rectOffset];
  }
}
class AutoScaleAxis extends Axis {
  projectValue(value) {
    const finalValue = Number(getMultiValue(value, this.units.pos));
    return this.axisLength * (finalValue - this.bounds.min) / this.bounds.range;
  }
  constructor(axisUnit, data, chartRect, options) {
    const highLow = options.highLow || getHighLow(data, options, axisUnit.pos);
    const bounds = getBounds(chartRect[axisUnit.rectEnd] - chartRect[axisUnit.rectStart], highLow, options.scaleMinSpace || 20, options.onlyInteger);
    const range = {
      min: bounds.min,
      max: bounds.max
    };
    super(axisUnit, chartRect, bounds.values);
    this.bounds = bounds;
    this.range = range;
  }
}
class FixedScaleAxis extends Axis {
  projectValue(value) {
    const finalValue = Number(getMultiValue(value, this.units.pos));
    return this.axisLength * (finalValue - this.range.min) / (this.range.max - this.range.min);
  }
  constructor(axisUnit, data, chartRect, options) {
    const highLow = options.highLow || getHighLow(data, options, axisUnit.pos);
    const divisor = options.divisor || 1;
    const ticks = (options.ticks || times(
      divisor,
      (index) => highLow.low + (highLow.high - highLow.low) / divisor * index
    )).sort(
      (a, b) => Number(a) - Number(b)
    );
    const range = {
      min: highLow.low,
      max: highLow.high
    };
    super(axisUnit, chartRect, ticks);
    this.range = range;
  }
}
class StepAxis extends Axis {
  projectValue(_value, index) {
    return this.stepLength * index;
  }
  constructor(axisUnit, _data, chartRect, options) {
    const ticks = options.ticks || [];
    super(axisUnit, chartRect, ticks);
    const calc = Math.max(1, ticks.length - (options.stretch ? 1 : 0));
    this.stepLength = this.axisLength / calc;
    this.stretch = Boolean(options.stretch);
  }
}
function getSeriesOption(series, options, key) {
  var ref;
  if (safeHasProperty(series, "name") && series.name && ((ref = options.series) === null || ref === void 0 ? void 0 : ref[series.name])) {
    const seriesOptions = options === null || options === void 0 ? void 0 : options.series[series.name];
    const value = seriesOptions[key];
    const result = value === void 0 ? options[key] : value;
    return result;
  } else {
    return options[key];
  }
}
const defaultOptions$2 = {
  // Options for X-Axis
  axisX: {
    // The offset of the labels to the chart area
    offset: 30,
    // Position where labels are placed. Can be set to `start` or `end` where `start` is equivalent to left or top on vertical axis and `end` is equivalent to right or bottom on horizontal axis.
    position: "end",
    // Allows you to correct label positioning on this axis by positive or negative x and y offset.
    labelOffset: {
      x: 0,
      y: 0
    },
    // If labels should be shown or not
    showLabel: true,
    // If the axis grid should be drawn or not
    showGrid: true,
    // Interpolation function that allows you to intercept the value from the axis label
    labelInterpolationFnc: noop,
    // Set the axis type to be used to project values on this axis. If not defined, Chartist.StepAxis will be used for the X-Axis, where the ticks option will be set to the labels in the data and the stretch option will be set to the global fullWidth option. This type can be changed to any axis constructor available (e.g. Chartist.FixedScaleAxis), where all axis options should be present here.
    type: void 0
  },
  // Options for Y-Axis
  axisY: {
    // The offset of the labels to the chart area
    offset: 40,
    // Position where labels are placed. Can be set to `start` or `end` where `start` is equivalent to left or top on vertical axis and `end` is equivalent to right or bottom on horizontal axis.
    position: "start",
    // Allows you to correct label positioning on this axis by positive or negative x and y offset.
    labelOffset: {
      x: 0,
      y: 0
    },
    // If labels should be shown or not
    showLabel: true,
    // If the axis grid should be drawn or not
    showGrid: true,
    // Interpolation function that allows you to intercept the value from the axis label
    labelInterpolationFnc: noop,
    // Set the axis type to be used to project values on this axis. If not defined, Chartist.AutoScaleAxis will be used for the Y-Axis, where the high and low options will be set to the global high and low options. This type can be changed to any axis constructor available (e.g. Chartist.FixedScaleAxis), where all axis options should be present here.
    type: void 0,
    // This value specifies the minimum height in pixel of the scale steps
    scaleMinSpace: 20,
    // Use only integer values (whole numbers) for the scale steps
    onlyInteger: false
  },
  // Specify a fixed width for the chart as a string (i.e. '100px' or '50%')
  width: void 0,
  // Specify a fixed height for the chart as a string (i.e. '100px' or '50%')
  height: void 0,
  // If the line should be drawn or not
  showLine: true,
  // If dots should be drawn or not
  showPoint: true,
  // If the line chart should draw an area
  showArea: false,
  // The base for the area chart that will be used to close the area shape (is normally 0)
  areaBase: 0,
  // Specify if the lines should be smoothed. This value can be true or false where true will result in smoothing using the default smoothing interpolation function Chartist.Interpolation.cardinal and false results in Chartist.Interpolation.none. You can also choose other smoothing / interpolation functions available in the Chartist.Interpolation module, or write your own interpolation function. Check the examples for a brief description.
  lineSmooth: true,
  // If the line chart should add a background fill to the .ct-grids group.
  showGridBackground: false,
  // Overriding the natural low of the chart allows you to zoom in or limit the charts lowest displayed value
  low: void 0,
  // Overriding the natural high of the chart allows you to zoom in or limit the charts highest displayed value
  high: void 0,
  // Padding of the chart drawing area to the container element and labels as a number or padding object {top: 5, right: 5, bottom: 5, left: 5}
  chartPadding: {
    top: 15,
    right: 15,
    bottom: 5,
    left: 10
  },
  // When set to true, the last grid line on the x-axis is not drawn and the chart elements will expand to the full available width of the chart. For the last label to be drawn correctly you might need to add chart padding or offset the last label with a draw event handler.
  fullWidth: false,
  // If true the whole data is reversed including labels, the series order as well as the whole series data arrays.
  reverseData: false,
  // Override the class names that get used to generate the SVG structure of the chart
  classNames: {
    chart: "ct-chart-line",
    label: "ct-label",
    labelGroup: "ct-labels",
    series: "ct-series",
    line: "ct-line",
    point: "ct-point",
    area: "ct-area",
    grid: "ct-grid",
    gridGroup: "ct-grids",
    gridBackground: "ct-grid-background",
    vertical: "ct-vertical",
    horizontal: "ct-horizontal",
    start: "ct-start",
    end: "ct-end"
  }
};
class LineChart extends BaseChart {
  /**
  * Creates a new chart
  */
  createChart(options) {
    const { data } = this;
    const normalizedData = normalizeData(data, options.reverseData, true);
    const svg = createSvg(this.container, options.width, options.height, options.classNames.chart);
    this.svg = svg;
    const gridGroup = svg.elem("g").addClass(options.classNames.gridGroup);
    const seriesGroup = svg.elem("g");
    const labelGroup = svg.elem("g").addClass(options.classNames.labelGroup);
    const chartRect = createChartRect(svg, options);
    let axisX;
    let axisY;
    if (options.axisX.type === void 0) {
      axisX = new StepAxis(axisUnits.x, normalizedData.series, chartRect, {
        ...options.axisX,
        ticks: normalizedData.labels,
        stretch: options.fullWidth
      });
    } else {
      axisX = new options.axisX.type(axisUnits.x, normalizedData.series, chartRect, options.axisX);
    }
    if (options.axisY.type === void 0) {
      axisY = new AutoScaleAxis(axisUnits.y, normalizedData.series, chartRect, {
        ...options.axisY,
        high: isNumeric(options.high) ? options.high : options.axisY.high,
        low: isNumeric(options.low) ? options.low : options.axisY.low
      });
    } else {
      axisY = new options.axisY.type(axisUnits.y, normalizedData.series, chartRect, options.axisY);
    }
    axisX.createGridAndLabels(gridGroup, labelGroup, options, this.eventEmitter);
    axisY.createGridAndLabels(gridGroup, labelGroup, options, this.eventEmitter);
    if (options.showGridBackground) {
      createGridBackground(gridGroup, chartRect, options.classNames.gridBackground, this.eventEmitter);
    }
    each(data.series, (series, seriesIndex) => {
      const seriesElement = seriesGroup.elem("g");
      const seriesName = safeHasProperty(series, "name") && series.name;
      const seriesClassName = safeHasProperty(series, "className") && series.className;
      const seriesMeta = safeHasProperty(series, "meta") ? series.meta : void 0;
      if (seriesName) {
        seriesElement.attr({
          "ct:series-name": seriesName
        });
      }
      if (seriesMeta) {
        seriesElement.attr({
          "ct:meta": serialize(seriesMeta)
        });
      }
      seriesElement.addClass([
        options.classNames.series,
        seriesClassName || "".concat(options.classNames.series, "-").concat(alphaNumerate(seriesIndex))
      ].join(" "));
      const pathCoordinates = [];
      const pathData = [];
      normalizedData.series[seriesIndex].forEach((value, valueIndex) => {
        const p = {
          x: chartRect.x1 + axisX.projectValue(value, valueIndex, normalizedData.series[seriesIndex]),
          y: chartRect.y1 - axisY.projectValue(value, valueIndex, normalizedData.series[seriesIndex])
        };
        pathCoordinates.push(p.x, p.y);
        pathData.push({
          value,
          valueIndex,
          meta: getMetaData(series, valueIndex)
        });
      });
      const seriesOptions = {
        lineSmooth: getSeriesOption(series, options, "lineSmooth"),
        showPoint: getSeriesOption(series, options, "showPoint"),
        showLine: getSeriesOption(series, options, "showLine"),
        showArea: getSeriesOption(series, options, "showArea"),
        areaBase: getSeriesOption(series, options, "areaBase")
      };
      let smoothing;
      if (typeof seriesOptions.lineSmooth === "function") {
        smoothing = seriesOptions.lineSmooth;
      } else {
        smoothing = seriesOptions.lineSmooth ? monotoneCubic() : none();
      }
      const path = smoothing(pathCoordinates, pathData);
      if (seriesOptions.showPoint) {
        path.pathElements.forEach((pathElement) => {
          const { data: pathElementData } = pathElement;
          const point = seriesElement.elem("line", {
            x1: pathElement.x,
            y1: pathElement.y,
            x2: pathElement.x + 0.01,
            y2: pathElement.y
          }, options.classNames.point);
          if (pathElementData) {
            let x;
            let y;
            if (safeHasProperty(pathElementData.value, "x")) {
              x = pathElementData.value.x;
            }
            if (safeHasProperty(pathElementData.value, "y")) {
              y = pathElementData.value.y;
            }
            point.attr({
              "ct:value": [
                x,
                y
              ].filter(isNumeric).join(","),
              "ct:meta": serialize(pathElementData.meta)
            });
          }
          this.eventEmitter.emit("draw", {
            type: "point",
            value: pathElementData === null || pathElementData === void 0 ? void 0 : pathElementData.value,
            index: (pathElementData === null || pathElementData === void 0 ? void 0 : pathElementData.valueIndex) || 0,
            meta: pathElementData === null || pathElementData === void 0 ? void 0 : pathElementData.meta,
            series,
            seriesIndex,
            axisX,
            axisY,
            group: seriesElement,
            element: point,
            x: pathElement.x,
            y: pathElement.y,
            chartRect
          });
        });
      }
      if (seriesOptions.showLine) {
        const line = seriesElement.elem("path", {
          d: path.stringify()
        }, options.classNames.line, true);
        this.eventEmitter.emit("draw", {
          type: "line",
          values: normalizedData.series[seriesIndex],
          path: path.clone(),
          chartRect,
          // TODO: Remove redundant
          index: seriesIndex,
          series,
          seriesIndex,
          meta: seriesMeta,
          axisX,
          axisY,
          group: seriesElement,
          element: line
        });
      }
      if (seriesOptions.showArea && axisY.range) {
        const areaBase = Math.max(Math.min(seriesOptions.areaBase, axisY.range.max), axisY.range.min);
        const areaBaseProjected = chartRect.y1 - axisY.projectValue(areaBase);
        path.splitByCommand("M").filter(
          (pathSegment) => pathSegment.pathElements.length > 1
        ).map((solidPathSegments) => {
          const firstElement = solidPathSegments.pathElements[0];
          const lastElement = solidPathSegments.pathElements[solidPathSegments.pathElements.length - 1];
          return solidPathSegments.clone(true).position(0).remove(1).move(firstElement.x, areaBaseProjected).line(firstElement.x, firstElement.y).position(solidPathSegments.pathElements.length + 1).line(lastElement.x, areaBaseProjected);
        }).forEach((areaPath) => {
          const area = seriesElement.elem("path", {
            d: areaPath.stringify()
          }, options.classNames.area, true);
          this.eventEmitter.emit("draw", {
            type: "area",
            values: normalizedData.series[seriesIndex],
            path: areaPath.clone(),
            series,
            seriesIndex,
            axisX,
            axisY,
            chartRect,
            // TODO: Remove redundant
            index: seriesIndex,
            group: seriesElement,
            element: area,
            meta: seriesMeta
          });
        });
      }
    }, options.reverseData);
    this.eventEmitter.emit("created", {
      chartRect,
      axisX,
      axisY,
      svg,
      options
    });
  }
  /**
  * This method creates a new line chart.
  * @param query A selector query string or directly a DOM element
  * @param data The data object that needs to consist of a labels and a series array
  * @param options The options object with options that override the default options. Check the examples for a detailed list.
  * @param responsiveOptions Specify an array of responsive option arrays which are a media query and options object pair => [[mediaQueryString, optionsObject],[more...]]
  * @return An object which exposes the API for the created chart
  *
  * @example
  * ```ts
  * // Create a simple line chart
  * const data = {
  *   // A labels array that can contain any sort of values
  *   labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
  *   // Our series array that contains series objects or in this case series data arrays
  *   series: [
  *     [5, 2, 4, 2, 0]
  *   ]
  * };
  *
  * // As options we currently only set a static size of 300x200 px
  * const options = {
  *   width: '300px',
  *   height: '200px'
  * };
  *
  * // In the global name space Chartist we call the Line function to initialize a line chart. As a first parameter we pass in a selector where we would like to get our chart created. Second parameter is the actual data object and as a third parameter we pass in our options
  * new LineChart('.ct-chart', data, options);
  * ```
  *
  * @example
  * ```ts
  * // Use specific interpolation function with configuration from the Chartist.Interpolation module
  *
  * const chart = new LineChart('.ct-chart', {
  *   labels: [1, 2, 3, 4, 5],
  *   series: [
  *     [1, 1, 8, 1, 7]
  *   ]
  * }, {
  *   lineSmooth: Chartist.Interpolation.cardinal({
  *     tension: 0.2
  *   })
  * });
  * ```
  *
  * @example
  * ```ts
  * // Create a line chart with responsive options
  *
  * const data = {
  *   // A labels array that can contain any sort of values
  *   labels: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
  *   // Our series array that contains series objects or in this case series data arrays
  *   series: [
  *     [5, 2, 4, 2, 0]
  *   ]
  * };
  *
  * // In addition to the regular options we specify responsive option overrides that will override the default configutation based on the matching media queries.
  * const responsiveOptions = [
  *   ['screen and (min-width: 641px) and (max-width: 1024px)', {
  *     showPoint: false,
  *     axisX: {
  *       labelInterpolationFnc: function(value) {
  *         // Will return Mon, Tue, Wed etc. on medium screens
  *         return value.slice(0, 3);
  *       }
  *     }
  *   }],
  *   ['screen and (max-width: 640px)', {
  *     showLine: false,
  *     axisX: {
  *       labelInterpolationFnc: function(value) {
  *         // Will return M, T, W etc. on small screens
  *         return value[0];
  *       }
  *     }
  *   }]
  * ];
  *
  * new LineChart('.ct-chart', data, null, responsiveOptions);
  * ```
  */
  constructor(query, data, options, responsiveOptions) {
    super(query, data, defaultOptions$2, extend({}, defaultOptions$2, options), responsiveOptions);
    this.data = data;
  }
}
const averageSummerDay = [
  {
    x: 15778368e5,
    y: 1.475365126676601
  },
  {
    x: 15778386e5,
    y: 1.4613839285714267
  },
  {
    x: 15778404e5,
    y: 1.39827380952381
  },
  {
    x: 15778422e5,
    y: 1.3714434523809522
  },
  {
    x: 1577844e6,
    y: 1.3258928571428592
  },
  {
    x: 15778458e5,
    y: 1.284032738095238
  },
  {
    x: 15778476e5,
    y: 1.2462946428571438
  },
  {
    x: 15778494e5,
    y: 1.234330357142858
  },
  {
    x: 15778512e5,
    y: 1.2736011904761921
  },
  {
    x: 1577853e6,
    y: 1.2853273809523815
  },
  {
    x: 15778548e5,
    y: 1.3011160714285728
  },
  {
    x: 15778566e5,
    y: 1.3463839285714307
  },
  {
    x: 15778584e5,
    y: 1.4458184523809523
  },
  {
    x: 15778602e5,
    y: 1.598809523809523
  },
  {
    x: 1577862e6,
    y: 1.8209226190476202
  },
  {
    x: 15778638e5,
    y: 2.120029761904761
  },
  {
    x: 15778656e5,
    y: 2.3530208333333333
  },
  {
    x: 15778674e5,
    y: 2.4526934523809496
  },
  {
    x: 15778692e5,
    y: 2.4028124999999996
  },
  {
    x: 1577871e6,
    y: 2.3023809523809513
  },
  {
    x: 15778728e5,
    y: 2.1809970238095246
  },
  {
    x: 15778746e5,
    y: 2.0536755952380967
  },
  {
    x: 15778764e5,
    y: 1.9810119047619055
  },
  {
    x: 15778782e5,
    y: 1.9570238095238097
  },
  {
    x: 157788e7,
    y: 1.9530208333333348
  },
  {
    x: 15778818e5,
    y: 1.9209226190476199
  },
  {
    x: 15778836e5,
    y: 1.8462797619047617
  },
  {
    x: 15778854e5,
    y: 1.7970684523809501
  },
  {
    x: 15778872e5,
    y: 1.7496130952380955
  },
  {
    x: 1577889e6,
    y: 1.6922023809523787
  },
  {
    x: 15778908e5,
    y: 1.6657589285714274
  },
  {
    x: 15778926e5,
    y: 1.6710267857142862
  },
  {
    x: 15778944e5,
    y: 1.762752976190476
  },
  {
    x: 15778962e5,
    y: 1.942782738095237
  },
  {
    x: 1577898e6,
    y: 2.1783482142857133
  },
  {
    x: 15778998e5,
    y: 2.43078869047619
  },
  {
    x: 15779016e5,
    y: 2.5700744047619026
  },
  {
    x: 15779034e5,
    y: 2.625550595238099
  },
  {
    x: 15779052e5,
    y: 2.584181547619047
  },
  {
    x: 1577907e6,
    y: 2.487693452380954
  },
  {
    x: 15779088e5,
    y: 2.3813839285714273
  },
  {
    x: 15779106e5,
    y: 2.257351190476192
  },
  {
    x: 15779124e5,
    y: 2.1108482142857135
  },
  {
    x: 15779142e5,
    y: 1.9773660714285708
  },
  {
    x: 1577916e6,
    y: 1.9020684523809517
  },
  {
    x: 15779178e5,
    y: 1.7840178571428547
  },
  {
    x: 15779196e5,
    y: 1.6015029761904753
  },
  {
    x: 15779214e5,
    y: 1.4647916666666672
  },
  {
    x: 15779232e5,
    y: 1.475365126676601
  }
];
const averageWinterDay = [
  {
    x: 15778368e5,
    y: 2.1112700729927023
  },
  {
    x: 15778386e5,
    y: 2.316315789473687
  },
  {
    x: 15778404e5,
    y: 2.2909544787077847
  },
  {
    x: 15778422e5,
    y: 2.2269897209985317
  },
  {
    x: 1577844e6,
    y: 2.0390538573508015
  },
  {
    x: 15778458e5,
    y: 1.9082241630276569
  },
  {
    x: 15778476e5,
    y: 1.851578947368419
  },
  {
    x: 15778494e5,
    y: 1.8197514619883057
  },
  {
    x: 15778512e5,
    y: 2.0123830409356738
  },
  {
    x: 1577853e6,
    y: 2.1092105263157905
  },
  {
    x: 15778548e5,
    y: 2.0752192982456164
  },
  {
    x: 15778566e5,
    y: 2.0718713450292396
  },
  {
    x: 15778584e5,
    y: 2.131695906432746
  },
  {
    x: 15778602e5,
    y: 2.221959064327487
  },
  {
    x: 1577862e6,
    y: 2.2922660818713463
  },
  {
    x: 15778638e5,
    y: 2.4222222222222207
  },
  {
    x: 15778656e5,
    y: 2.4985526315789475
  },
  {
    x: 15778674e5,
    y: 2.5081286549707618
  },
  {
    x: 15778692e5,
    y: 2.4156432748538013
  },
  {
    x: 1577871e6,
    y: 2.313494152046784
  },
  {
    x: 15778728e5,
    y: 2.239605263157895
  },
  {
    x: 15778746e5,
    y: 2.1720760233918095
  },
  {
    x: 15778764e5,
    y: 2.1268421052631563
  },
  {
    x: 15778782e5,
    y: 2.11232456140351
  },
  {
    x: 157788e7,
    y: 2.12904970760234
  },
  {
    x: 15778818e5,
    y: 2.1099561403508744
  },
  {
    x: 15778836e5,
    y: 2.060263157894739
  },
  {
    x: 15778854e5,
    y: 2.0267543859649124
  },
  {
    x: 15778872e5,
    y: 1.9937719298245626
  },
  {
    x: 1577889e6,
    y: 1.9811403508771928
  },
  {
    x: 15778908e5,
    y: 1.9991520467836246
  },
  {
    x: 15778926e5,
    y: 2.0620467836257292
  },
  {
    x: 15778944e5,
    y: 2.212470760233917
  },
  {
    x: 15778962e5,
    y: 2.5186695906432743
  },
  {
    x: 1577898e6,
    y: 2.7765935672514597
  },
  {
    x: 15778998e5,
    y: 2.953494152046782
  },
  {
    x: 15779016e5,
    y: 2.9446198830409345
  },
  {
    x: 15779034e5,
    y: 2.8099707602339192
  },
  {
    x: 15779052e5,
    y: 2.6882602339181276
  },
  {
    x: 1577907e6,
    y: 2.588640350877196
  },
  {
    x: 15779088e5,
    y: 2.472558479532163
  },
  {
    x: 15779106e5,
    y: 2.356885964912282
  },
  {
    x: 15779124e5,
    y: 2.2416520467836265
  },
  {
    x: 15779142e5,
    y: 2.1311695906432746
  },
  {
    x: 1577916e6,
    y: 2.1274122807017535
  },
  {
    x: 15779178e5,
    y: 2.0797368421052647
  },
  {
    x: 15779196e5,
    y: 1.9393421052631565
  },
  {
    x: 15779214e5,
    y: 1.8715497076023384
  },
  {
    x: 15779232e5,
    y: 2.1112700729927023
  }
];
const averageDay = [
  {
    x: 15778368e5,
    y: 1.796600294985249
  },
  {
    x: 15778386e5,
    y: 1.8926327433628272
  },
  {
    x: 15778404e5,
    y: 1.8475831485587615
  },
  {
    x: 15778422e5,
    y: 1.802062084257208
  },
  {
    x: 1577844e6,
    y: 1.6864091243561454
  },
  {
    x: 15778458e5,
    y: 1.5995732155997082
  },
  {
    x: 15778476e5,
    y: 1.5516150442477914
  },
  {
    x: 15778494e5,
    y: 1.5296312684365772
  },
  {
    x: 15778512e5,
    y: 1.6462610619469022
  },
  {
    x: 1577853e6,
    y: 1.7009144542772885
  },
  {
    x: 15778548e5,
    y: 1.6915929203539881
  },
  {
    x: 15778566e5,
    y: 1.7123377581120973
  },
  {
    x: 15778584e5,
    y: 1.7917920353982288
  },
  {
    x: 15778602e5,
    y: 1.9131415929203495
  },
  {
    x: 1577862e6,
    y: 2.0586799410029526
  },
  {
    x: 15778638e5,
    y: 2.2724631268436584
  },
  {
    x: 15778656e5,
    y: 2.42643067846608
  },
  {
    x: 15778674e5,
    y: 2.4806563421828933
  },
  {
    x: 15778692e5,
    y: 2.409284660766962
  },
  {
    x: 1577871e6,
    y: 2.3079867256637216
  },
  {
    x: 15778728e5,
    y: 2.2105604719764003
  },
  {
    x: 15778746e5,
    y: 2.113399705014748
  },
  {
    x: 15778764e5,
    y: 2.054572271386432
  },
  {
    x: 15778782e5,
    y: 2.035361356932153
  },
  {
    x: 157788e7,
    y: 2.041814159292033
  },
  {
    x: 15778818e5,
    y: 2.016275811209435
  },
  {
    x: 15778836e5,
    y: 1.9542182890855457
  },
  {
    x: 15778854e5,
    y: 1.9129277286135706
  },
  {
    x: 15778872e5,
    y: 1.8727728613569352
  },
  {
    x: 1577889e6,
    y: 1.8379498525073765
  },
  {
    x: 15778908e5,
    y: 1.8339306784660796
  },
  {
    x: 15778926e5,
    y: 1.8682669616519174
  },
  {
    x: 15778944e5,
    y: 1.9896017699115092
  },
  {
    x: 15778962e5,
    y: 2.233274336283189
  },
  {
    x: 1577898e6,
    y: 2.480117994100298
  },
  {
    x: 15778998e5,
    y: 2.694454277286135
  },
  {
    x: 15779016e5,
    y: 2.7590044247787615
  },
  {
    x: 15779034e5,
    y: 2.7185766961651923
  },
  {
    x: 15779052e5,
    y: 2.6366814159292047
  },
  {
    x: 1577907e6,
    y: 2.5386135693215333
  },
  {
    x: 15779088e5,
    y: 2.4273746312684383
  },
  {
    x: 15779106e5,
    y: 2.3075589970501476
  },
  {
    x: 15779124e5,
    y: 2.176828908554573
  },
  {
    x: 15779142e5,
    y: 2.054948377581121
  },
  {
    x: 1577916e6,
    y: 2.015737463126842
  },
  {
    x: 15779178e5,
    y: 1.933185840707967
  },
  {
    x: 15779196e5,
    y: 1.771917404129796
  },
  {
    x: 15779214e5,
    y: 1.6699705014749273
  },
  {
    x: 15779232e5,
    y: 1.796600294985249
  }
];
const highestDemand = [
  {
    x: 15778368e5,
    y: 3.21
  },
  {
    x: 15778386e5,
    y: 3.27
  },
  {
    x: 15778404e5,
    y: 3.15
  },
  {
    x: 15778422e5,
    y: 3.04
  },
  {
    x: 1577844e6,
    y: 2.85
  },
  {
    x: 15778458e5,
    y: 2.85
  },
  {
    x: 15778476e5,
    y: 2.63
  },
  {
    x: 15778494e5,
    y: 2.57
  },
  {
    x: 15778512e5,
    y: 3.1
  },
  {
    x: 1577853e6,
    y: 3.07
  },
  {
    x: 15778548e5,
    y: 3.07
  },
  {
    x: 15778566e5,
    y: 3.11
  },
  {
    x: 15778584e5,
    y: 3.18
  },
  {
    x: 15778602e5,
    y: 3.29
  },
  {
    x: 1577862e6,
    y: 3.52
  },
  {
    x: 15778638e5,
    y: 3.78
  },
  {
    x: 15778656e5,
    y: 4.11
  },
  {
    x: 15778674e5,
    y: 4.25
  },
  {
    x: 15778692e5,
    y: 4.11
  },
  {
    x: 1577871e6,
    y: 4.04
  },
  {
    x: 15778728e5,
    y: 4.83
  },
  {
    x: 15778746e5,
    y: 5.25
  },
  {
    x: 15778764e5,
    y: 4.96
  },
  {
    x: 15778782e5,
    y: 5.58
  },
  {
    x: 157788e7,
    y: 6.02
  },
  {
    x: 15778818e5,
    y: 6.3
  },
  {
    x: 15778836e5,
    y: 5
  },
  {
    x: 15778854e5,
    y: 5.34
  },
  {
    x: 15778872e5,
    y: 5.37
  },
  {
    x: 1577889e6,
    y: 4.91
  },
  {
    x: 15778908e5,
    y: 4.8
  },
  {
    x: 15778926e5,
    y: 4.75
  },
  {
    x: 15778944e5,
    y: 6.58
  },
  {
    x: 15778962e5,
    y: 7.47
  },
  {
    x: 1577898e6,
    y: 7.44
  },
  {
    x: 15778998e5,
    y: 7.61
  },
  {
    x: 15779016e5,
    y: 7.37
  },
  {
    x: 15779034e5,
    y: 6.81
  },
  {
    x: 15779052e5,
    y: 6.12
  },
  {
    x: 1577907e6,
    y: 4.25
  },
  {
    x: 15779088e5,
    y: 3.9
  },
  {
    x: 15779106e5,
    y: 3.72
  },
  {
    x: 15779124e5,
    y: 3.42
  },
  {
    x: 15779142e5,
    y: 3.2
  },
  {
    x: 1577916e6,
    y: 3.39
  },
  {
    x: 15779178e5,
    y: 3.06
  },
  {
    x: 15779196e5,
    y: 2.77
  },
  {
    x: 15779214e5,
    y: 2.59
  }
];
const lowestDemand = [
  {
    x: 15778368e5,
    y: 1.07
  },
  {
    x: 15778386e5,
    y: 1.08
  },
  {
    x: 15778404e5,
    y: 1.12
  },
  {
    x: 15778422e5,
    y: 1.1
  },
  {
    x: 1577844e6,
    y: 1.06
  },
  {
    x: 15778458e5,
    y: 1.02
  },
  {
    x: 15778476e5,
    y: 1.01
  },
  {
    x: 15778494e5,
    y: 0.98
  },
  {
    x: 15778512e5,
    y: 1.02
  },
  {
    x: 1577853e6,
    y: 1.03
  },
  {
    x: 15778548e5,
    y: 1.05
  },
  {
    x: 15778566e5,
    y: 1.08
  },
  {
    x: 15778584e5,
    y: 1.13
  },
  {
    x: 15778602e5,
    y: 1.23
  },
  {
    x: 1577862e6,
    y: 1.26
  },
  {
    x: 15778638e5,
    y: 1.34
  },
  {
    x: 15778656e5,
    y: 1.45
  },
  {
    x: 15778674e5,
    y: 1.49
  },
  {
    x: 15778692e5,
    y: 1.4
  },
  {
    x: 1577871e6,
    y: 1.35
  },
  {
    x: 15778728e5,
    y: 1.4
  },
  {
    x: 15778746e5,
    y: 1.33
  },
  {
    x: 15778764e5,
    y: 1.25
  },
  {
    x: 15778782e5,
    y: 1.27
  },
  {
    x: 157788e7,
    y: 1.22
  },
  {
    x: 15778818e5,
    y: 1.23
  },
  {
    x: 15778836e5,
    y: 1.24
  },
  {
    x: 15778854e5,
    y: 1.18
  },
  {
    x: 15778872e5,
    y: 1.17
  },
  {
    x: 1577889e6,
    y: 1.08
  },
  {
    x: 15778908e5,
    y: 1.08
  },
  {
    x: 15778926e5,
    y: 1.09
  },
  {
    x: 15778944e5,
    y: 1.14
  },
  {
    x: 15778962e5,
    y: 1.31
  },
  {
    x: 1577898e6,
    y: 1.5
  },
  {
    x: 15778998e5,
    y: 1.75
  },
  {
    x: 15779016e5,
    y: 1.8
  },
  {
    x: 15779034e5,
    y: 1.76
  },
  {
    x: 15779052e5,
    y: 1.74
  },
  {
    x: 1577907e6,
    y: 1.66
  },
  {
    x: 15779088e5,
    y: 1.6
  },
  {
    x: 15779106e5,
    y: 1.48
  },
  {
    x: 15779124e5,
    y: 1.42
  },
  {
    x: 15779142e5,
    y: 1.38
  },
  {
    x: 1577916e6,
    y: 1.28
  },
  {
    x: 15779178e5,
    y: 1.35
  },
  {
    x: 15779196e5,
    y: 1.23
  },
  {
    x: 15779214e5,
    y: 1.03
  }
];
const twoSTDsAbove = [
  {
    x: 15778368e5,
    y: 0.8833560033974328
  },
  {
    x: 15778386e5,
    y: 0.8974435757769449
  },
  {
    x: 15778404e5,
    y: 0.8180674081661015
  },
  {
    x: 15778422e5,
    y: 0.8150140378990215
  },
  {
    x: 1577844e6,
    y: 0.8511808086901624
  },
  {
    x: 15778458e5,
    y: 0.8509138348853221
  },
  {
    x: 15778476e5,
    y: 0.8262899982877309
  },
  {
    x: 15778494e5,
    y: 0.8267750699005103
  },
  {
    x: 15778512e5,
    y: 0.6980400535891562
  },
  {
    x: 1577853e6,
    y: 0.7396759142396357
  },
  {
    x: 15778548e5,
    y: 0.766731132667119
  },
  {
    x: 15778566e5,
    y: 0.8396227100298621
  },
  {
    x: 15778584e5,
    y: 0.9189500549595101
  },
  {
    x: 15778602e5,
    y: 1.081676577555232
  },
  {
    x: 1577862e6,
    y: 1.2797907004898077
  },
  {
    x: 15778638e5,
    y: 1.5400851492750545
  },
  {
    x: 15778656e5,
    y: 1.7040910511289953
  },
  {
    x: 15778674e5,
    y: 1.817143427987616
  },
  {
    x: 15778692e5,
    y: 1.7813792865167033
  },
  {
    x: 1577871e6,
    y: 1.6995753195025232
  },
  {
    x: 15778728e5,
    y: 1.5946259998751464
  },
  {
    x: 15778746e5,
    y: 1.489144411460439
  },
  {
    x: 15778764e5,
    y: 1.4326888046093842
  },
  {
    x: 15778782e5,
    y: 1.3467562834780789
  },
  {
    x: 157788e7,
    y: 1.2940591354283133
  },
  {
    x: 15778818e5,
    y: 1.3047465235322107
  },
  {
    x: 15778836e5,
    y: 1.2818871648438146
  },
  {
    x: 15778854e5,
    y: 1.2082401146265274
  },
  {
    x: 15778872e5,
    y: 1.1707971195828337
  },
  {
    x: 1577889e6,
    y: 1.1191790678645948
  },
  {
    x: 15778908e5,
    y: 1.1144762942121402
  },
  {
    x: 15778926e5,
    y: 1.1261582132731403
  },
  {
    x: 15778944e5,
    y: 1.0758686058683464
  },
  {
    x: 15778962e5,
    y: 0.8136966620170081
  },
  {
    x: 1577898e6,
    y: 0.7521729174815699
  },
  {
    x: 15778998e5,
    y: 1.0434240321514605
  },
  {
    x: 15779016e5,
    y: 1.3879583287067045
  },
  {
    x: 15779034e5,
    y: 1.9155353618751558
  },
  {
    x: 15779052e5,
    y: 2.0083118081705598
  },
  {
    x: 1577907e6,
    y: 1.9482420795696302
  },
  {
    x: 15779088e5,
    y: 1.8482215814108518
  },
  {
    x: 15779106e5,
    y: 1.7322797732560766
  },
  {
    x: 15779124e5,
    y: 1.6274269141468867
  },
  {
    x: 15779142e5,
    y: 1.5381786882205106
  },
  {
    x: 1577916e6,
    y: 1.4800960053152175
  },
  {
    x: 15779178e5,
    y: 1.411709545277752
  },
  {
    x: 15779196e5,
    y: 1.2626961196149105
  },
  {
    x: 15779214e5,
    y: 1.1248384072016075
  }
];
const twoSTDsBelow = [
  {
    x: 15778368e5,
    y: 2.709844586573065
  },
  {
    x: 15778386e5,
    y: 2.8878219109487095
  },
  {
    x: 15778404e5,
    y: 2.8798320001179287
  },
  {
    x: 15778422e5,
    y: 2.7917759029293845
  },
  {
    x: 1577844e6,
    y: 2.5266084322825737
  },
  {
    x: 15778458e5,
    y: 2.352947624215641
  },
  {
    x: 15778476e5,
    y: 2.276940090207852
  },
  {
    x: 15778494e5,
    y: 2.232487466972644
  },
  {
    x: 15778512e5,
    y: 2.5944820703046485
  },
  {
    x: 1577853e6,
    y: 2.6621529943149413
  },
  {
    x: 15778548e5,
    y: 2.616454708040857
  },
  {
    x: 15778566e5,
    y: 2.5850528061943328
  },
  {
    x: 15778584e5,
    y: 2.6646340158369477
  },
  {
    x: 15778602e5,
    y: 2.744606608285467
  },
  {
    x: 1577862e6,
    y: 2.8375691815160975
  },
  {
    x: 15778638e5,
    y: 3.0081952935293743
  },
  {
    x: 15778656e5,
    y: 3.148770305803165
  },
  {
    x: 15778674e5,
    y: 3.1478307417540874
  },
  {
    x: 15778692e5,
    y: 3.0407461747379108
  },
  {
    x: 1577871e6,
    y: 2.91639813182492
  },
  {
    x: 15778728e5,
    y: 2.826494944077654
  },
  {
    x: 15778746e5,
    y: 2.743868882483429
  },
  {
    x: 15778764e5,
    y: 2.6764557381634795
  },
  {
    x: 15778782e5,
    y: 2.7329924230998954
  },
  {
    x: 157788e7,
    y: 2.795601130450559
  },
  {
    x: 15778818e5,
    y: 2.7278050988866593
  },
  {
    x: 15778836e5,
    y: 2.626549413327277
  },
  {
    x: 15778854e5,
    y: 2.6204388521631428
  },
  {
    x: 15778872e5,
    y: 2.5775128435168035
  },
  {
    x: 1577889e6,
    y: 2.5567206371501583
  },
  {
    x: 15778908e5,
    y: 2.553385062720019
  },
  {
    x: 15778926e5,
    y: 2.6103757100306946
  },
  {
    x: 15778944e5,
    y: 2.903334933954672
  },
  {
    x: 15778962e5,
    y: 3.65285201054937
  },
  {
    x: 1577898e6,
    y: 4.208063070719026
  },
  {
    x: 15778998e5,
    y: 4.349461576704627
  },
  {
    x: 15779016e5,
    y: 4.134122852105104
  },
  {
    x: 15779034e5,
    y: 3.5256306897853618
  },
  {
    x: 15779052e5,
    y: 3.268942804375568
  },
  {
    x: 1577907e6,
    y: 3.132732090172066
  },
  {
    x: 15779088e5,
    y: 3.0101105219101854
  },
  {
    x: 15779106e5,
    y: 2.8828382208442185
  },
  {
    x: 15779124e5,
    y: 2.726230902962259
  },
  {
    x: 15779142e5,
    y: 2.5717180669417314
  },
  {
    x: 1577916e6,
    y: 2.5513789209384665
  },
  {
    x: 15779178e5,
    y: 2.454662136138182
  },
  {
    x: 15779196e5,
    y: 2.2811386886446816
  },
  {
    x: 15779214e5,
    y: 2.215102595748247
  }
];
function roundUpToQuarterSignificant(num) {
  if (num === 0) return 0;
  const absNum = Math.abs(num);
  const order = Math.floor(Math.log10(absNum));
  const factor = Math.pow(10, order);
  const normalized = absNum / factor;
  const roundedNormalized = Math.ceil(normalized * 4) / 4;
  const result = roundedNormalized * factor;
  return num < 0 ? -result : result;
}
const initDropdown = function() {
  const initCheckboxDropdown = (el) => {
    let isOpen = false;
    let areAllChecked = false;
    const label = el.querySelector(".dropdown-label");
    const checkAll = el.querySelector('[data-toggle="check-all"]');
    const inputs = Array.from(el.querySelectorAll('input[type="checkbox"]'));
    const updateStatus = () => {
      var _a;
      const checked = inputs.filter((input) => input.checked);
      areAllChecked = false;
      checkAll.textContent = "Check All";
      if (checked.length === 0) {
        label.textContent = "Select Sites to display on graph";
      } else if (checked.length === 1) {
        const labelText = ((_a = checked[0].closest("label")) == null ? void 0 : _a.textContent.trim()) || "1 Selected";
        label.textContent = labelText;
      } else if (checked.length === inputs.length) {
        label.textContent = "All Selected";
        areAllChecked = true;
        checkAll.textContent = "Uncheck All";
      } else {
        label.textContent = `${checked.length} Selected`;
      }
    };
    const setAll = (checked) => {
      inputs.forEach((input) => input.checked = checked);
    };
    const toggleAll = () => {
      if (!areAllChecked) {
        setAll(true);
        areAllChecked = true;
        checkAll.textContent = "Uncheck All";
      } else {
        setAll(false);
        areAllChecked = false;
        checkAll.textContent = "Check All";
      }
      updateStatus();
    };
    const toggleOpen = (forceOpen = false) => {
      console.log("toggle open");
      if (!isOpen || forceOpen) {
        isOpen = true;
        el.classList.add("on");
        const onOutsideClick = (e) => {
          if (!el.contains(e.target)) {
            isOpen = false;
            el.classList.remove("on");
            document.removeEventListener("click", onOutsideClick);
          }
        };
        setTimeout(() => document.addEventListener("click", onOutsideClick), 0);
      } else {
        isOpen = false;
        el.classList.remove("on");
      }
    };
    updateStatus();
    label.addEventListener("click", (e) => {
      e.preventDefault();
      toggleOpen();
    });
    checkAll.addEventListener("click", (e) => {
      e.preventDefault();
      toggleAll();
    });
    inputs.forEach((input) => {
      input.addEventListener("change", updateStatus);
    });
  };
  const dropdowns = document.querySelectorAll('[data-control="checkbox-dropdown"]');
  dropdowns.forEach(initCheckboxDropdown);
};
class Float64RingBuffer {
  constructor(size) {
    this.size = size;
    this.xBuffer = new Float64Array(size);
    this.yBuffer = new Float64Array(size);
    this.index = 0;
    this.count = 0;
  }
  push(...points) {
    for (const point of points) {
      const { x, y } = point;
      this.xBuffer[this.index] = x;
      this.yBuffer[this.index] = y;
      this.index = (this.index + 1) % this.size;
      if (this.count < this.size) this.count++;
    }
  }
  getHighestY() {
    return this.yBuffer.reduce((a, b) => Math.max(a, b), 0);
  }
  getValues(scale = 1) {
    const result = [];
    const start = this.count === this.size ? this.index : 0;
    for (let i = 0; i < this.count; i++) {
      const idx = (start + i) % this.size;
      if (this.xBuffer[idx] != 0) {
        result.push({
          x: this.xBuffer[idx],
          y: this.yBuffer[idx] * scale
        });
      }
    }
    return result;
  }
  editRecent(n, point) {
    if (n >= this.count) throw new RangeError("Not enough elements in buffer");
    const idx = (this.index - 1 - n + this.size) % this.size;
    if (point.x !== void 0) this.xBuffer[idx] = point.x;
    if (point.y !== void 0) this.yBuffer[idx] = point.y;
  }
  getRecent(n) {
    if (n >= this.count) throw new RangeError("Not enough elements in buffer");
    const idx = (this.index - 1 - n + this.size) % this.size;
    return { x: this.xBuffer[idx], y: this.yBuffer[idx] };
  }
}
const server = "https://home.harrylegg.co.uk/solar";
let liveData = {};
const sitePeriodData = {};
const periods = [1, 7, 31, 365];
const periodExpectedGaps = [6e4, 15 * 6e4, 180 * 6e4, 24 * 60 * 6e4];
const total = document.getElementById("total");
const daily = document.getElementById("daily");
const week = document.getElementById("week");
const year = document.getElementById("year");
if (Date.now() < 17960832e5) {
  year.parentElement.classList.add("display-none");
}
const explainTotals = document.getElementById("explainTotals");
const current = document.getElementById("current");
const bestProduction = document.getElementById("bestProduction");
const rank = document.querySelector("#rank table tbody");
const explainRanks = document.getElementById("explainRanks");
const generationInPeriod = document.getElementById("generationInPeriod");
const siteDialog = document.getElementById("siteOverview");
const siteGraph = document.getElementById("siteGraph");
const siteSelection = document.getElementById("siteSelection");
const sites_carousel = document.getElementById("sites");
const glide_carousel = document.querySelector(".glide");
const config_carousel = {
  type: "carousel",
  focusAt: "center",
  perView: 3
};
const updateTimer = {
  element: document.getElementById("timeToUpdate"),
  element2: document.getElementById("timeToUpdateOption"),
  time: 59.9,
  eta: Date.now() + 6e4,
  interval: null,
  update: function() {
    this.time = Math.round((this.eta - Date.now()) / 100) / 10;
    if (this.time < -3600) {
      window.location.reload();
    }
    this.element.textContent = this.time.toFixed(0);
    this.element2.textContent = this.time.toFixed(0);
    const { width, height } = this.element.getBoundingClientRect();
    this.element.style.left = `calc(50% - ${width / 2}px)`;
    this.element.style.top = `calc(50% - ${height / 2}px)`;
  },
  start: function() {
    if (this.interval === null) {
      this.newEta();
      this.interval = setInterval(() => updateTimer.update(), 100);
    }
    return this.interval;
  },
  newEta: function() {
    this.eta = Date.now() + 6e4;
  }
};
const sortingOptions = document.querySelectorAll("[name=sort]");
const demandGraph = document.getElementById("demandGraph");
const legend = {
  average: document.getElementById("legend_average"),
  end: document.getElementById("legend_end"),
  now: document.getElementById("legend_now"),
  min: document.getElementById("legend_min"),
  max: document.getElementById("legend_max"),
  summer: document.getElementById("legend_summer"),
  winter: document.getElementById("legend_winter"),
  std: document.getElementById("legend_std"),
  solar: document.getElementById("legend_solar"),
  max_value: {
    average: averageDay.reduce((a, b) => Math.max(a, b.y), 0),
    min: lowestDemand.reduce((a, b) => Math.max(a, b.y), 0),
    max: highestDemand.reduce((a, b) => Math.max(a, b.y), 0),
    summmer: averageSummerDay.reduce((a, b) => Math.max(a, b.y), 0),
    winter: averageWinterDay.reduce((a, b) => Math.max(a, b.y), 0),
    standard_deviation: twoSTDsBelow.reduce((a, b) => Math.max(a, b.y), 0)
  }
};
const averagedDataTransitionX = referenceDay().valueOf();
const combinedSolarData = new Float64RingBuffer(3e3);
const time = document.getElementById("time");
const averageDemand = document.getElementById("averageDemand");
const percentOfDemand = document.getElementById("percentOfDemand");
const letters = [..."abcdefghijklmnopqrstuvwxyz"];
const resizeSiteGraph = new ResizeObserver(drawSiteGraph);
const resizeDemandGraph = new ResizeObserver(drawAverageChart);
resizeSiteGraph.observe(siteGraph);
resizeDemandGraph.observe(demandGraph);
makeModal(siteDialog, null, "closeSiteOverview");
makeModal(explainTotals, "explainTotalsLink", "closeExplainTotals");
makeModal(explainRanks, "explainRanksLink", "closeExplainRanks");
fetchCombinedSolarData();
drawAverageChart();
function drawAverageChart() {
  if (document.hidden) return;
  legend.max_value.solar = combinedSolarData.getHighestY();
  const max_value = roundUpToQuarterSignificant(Math.max(
    legend.average.checked ? legend.max_value.average : 0,
    legend.solar.checked ? legend.max_value.solar : 0,
    legend.min.checked ? legend.max_value.min : 0,
    legend.max.checked ? legend.max_value.max : 0,
    legend.summer.checked ? legend.max_value.summmer : 0,
    legend.winter.checked ? legend.max_value.winter : 0,
    legend.std.checked ? legend.max_value.standard_deviation : 0
  ));
  const noLine = [{ x: referenceDay(), y: 0 }, { x: referenceDay().valueOf() + 1, y: 0 }];
  const solarData = legend.solar.checked ? combinedSolarData.getValues() : noLine;
  const endLine = [{ x: averagedDataTransitionX, y: max_value }, { x: averagedDataTransitionX + 100, y: 0 }];
  const nowLine = [{ x: referenceDay(), y: max_value }, { x: referenceDay().valueOf() + 100, y: 0 }];
  const average = { name: "Average Day", data: legend.average.checked ? averageDay : noLine };
  const end = { name: "pageLoad", data: legend.solar.checked && legend.end.checked ? endLine : noLine };
  const now = { name: "Now", data: legend.now.checked ? nowLine : noLine };
  const summer = { name: "Average Summer", data: legend.summer.checked ? averageSummerDay : noLine };
  const winter = { name: "Average Winter", data: legend.winter.checked ? averageWinterDay : noLine };
  const low = { name: "Two Standard Deviations Below", data: legend.std.checked ? twoSTDsBelow : noLine };
  const high = { name: "Two Standard Deviations Above", data: legend.std.checked ? twoSTDsAbove : noLine };
  const solar = { name: "Solar", data: solarData };
  const lowest = { name: "Lowest", data: legend.min.checked ? lowestDemand : noLine };
  const highest = { name: "Average Winter", data: legend.max.checked ? highestDemand : noLine };
  if (demandGraph.graph) {
    demandGraph.graph.update({
      series: [
        average,
        end,
        now,
        solar,
        summer,
        winter,
        lowest,
        highest,
        high,
        low
      ]
    });
  } else {
    demandGraph.graph = new LineChart(
      "#demandGraph",
      {
        series: [
          average,
          end,
          now,
          solar,
          summer,
          winter,
          lowest,
          highest,
          high,
          low
        ]
      },
      {
        axisX: {
          type: FixedScaleAxis,
          divisor: 12,
          labelInterpolationFnc: (value) => new Date(value).toLocaleString(
            void 0,
            {
              hour: "numeric",
              minute: "numeric"
            }
          )
        },
        axisY: {
          labelInterpolationFnc: (value) => `${value} MW`
        }
      }
    );
  }
}
function drawSiteGraph(recreateGraph = false) {
  if (document.hidden) return;
  const checkedbox = document.querySelector('[name="period"]:checked');
  if (!(checkedbox == null ? void 0 : checkedbox.disabled)) {
    const period = checkedbox == null ? void 0 : checkedbox.value;
    let localeString = {};
    if (period <= 1) {
      localeString.hour = "numeric";
      localeString.minute = "numeric";
      localeString.weekday = "short";
    } else if (period <= 7) {
      localeString.weekday = "short";
      localeString.day = "numeric";
    } else if (period <= 31) {
      localeString.day = "numeric";
      localeString.month = "short";
    } else {
      localeString.day = "numeric";
      localeString.month = "short";
    }
    const noLine = [{ x: Date.now() - 1, y: 0 }, { x: Date.now(), y: 0 }];
    const series = [];
    if (Object.keys(sitePeriodData).length > 0) {
      sitePeriodData[period.toString()].forEach((site) => {
        const spacelessName = site.name.replaceAll(" ", "");
        if (document.querySelector("#" + spacelessName + "_checkbox").checked) {
          series.push(site.data.map((d) => {
            return { x: d[0], y: d[1] };
          }));
        } else {
          series.push(noLine);
        }
      });
    }
    if (siteGraph.graph && !recreateGraph) {
      siteGraph.graph.update({ series });
    } else {
      siteGraph.graph = new LineChart(
        "#siteGraph",
        {
          series
        },
        {
          axisX: {
            type: FixedScaleAxis,
            divisor: 12,
            labelInterpolationFnc: (value) => new Date(value).toLocaleString(void 0, localeString)
          },
          axisY: {
            labelInterpolationFnc: (value) => `${value}`
          }
        }
      );
    }
  }
}
function updateDemand(currentGeneration) {
  time.textContent = (/* @__PURE__ */ new Date()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const averageMW = demandAtTime(Date.now());
  averageDemand.textContent = formatWatts(averageMW * 1e6);
  percentOfDemand.textContent = (currentGeneration / (averageMW * 10)).toFixed(2);
  drawAverageChart();
}
function updateAggregated() {
  total.textContent = formatWatts(liveData["total_kwh"] * 1e3, true);
  current.textContent = formatWatts(liveData["current_w"]);
  daily.textContent = formatWatts(liveData["day_kwh"] * 1e3, true);
  week.textContent = formatWatts(liveData["week_kwh"] * 1e3, true);
  year.textContent = formatWatts(liveData["year_kwh"] * 1e3, true);
}
function updateTable() {
  if (liveData.sites === null) {
    return;
  }
  const selected = document.querySelector('input[name="sort"]:checked');
  let option = "generation";
  if (selected) {
    option = selected.value;
  }
  const virtualSite = liveData.sites.pop();
  switch (option) {
    case "meter":
      liveData.sites.sort((a, b) => b.today - a.today);
      break;
    case "max":
      liveData.sites.sort((a, b) => b.max_percent - a.max_percent);
      break;
    case "generation":
    default:
      liveData.sites.sort((a, b) => b.snapshot - a.snapshot);
      break;
  }
  while (rank.firstChild) {
    rank.firstChild.remove();
  }
  liveData.sites.slice(0, 5).forEach((site, i) => {
    rank.append(createSiteRow(i + 1, site));
  });
  liveData.sites.push(virtualSite);
  rank.append(createSiteRow("", virtualSite));
}
function updateSiteOverview(recreateGraph = false) {
  const periodsWithData = [];
  const keys = Object.keys(sitePeriodData);
  keys.forEach((k) => {
    if (sitePeriodData[k][0].data) {
      periodsWithData.push(k);
    }
  });
  let firstAvaialble = null;
  document.querySelectorAll("[name='period']").forEach((input) => {
    if (!periodsWithData.includes(input.value)) {
      input.disabled = true;
      input.checked = false;
      input.parentElement.classList.add("disabled");
    } else {
      input.disabled = false;
      input.parentElement.classList.remove("disabled");
      if (!firstAvaialble) {
        firstAvaialble = input;
      }
    }
  });
  let selectedPeriodCheckbox = document.querySelector("[name='period']:checked");
  if (!selectedPeriodCheckbox) {
    selectedPeriodCheckbox = firstAvaialble;
    firstAvaialble.checked = true;
  }
  const selectedPeriod = selectedPeriodCheckbox === null ? "1" : selectedPeriodCheckbox.value.toString();
  const selectedSites = Array.from(document.querySelectorAll(".dropdown-option:has([type=checkbox]:checked)")).map((s) => s.textContent);
  const dataForPeriod = sitePeriodData[selectedPeriod.toString()][0].data;
  const lengthOfData = dataForPeriod.length;
  const lastDataPoint = dataForPeriod[lengthOfData - 1];
  const ageOfData = Date.now() - lastDataPoint[0];
  let dataStale = 36e5;
  switch (selectedPeriod) {
    case "7":
      dataStale = 3 * 36e5;
      break;
    case "31":
    case "365":
      dataStale = 6 * 36e5;
      break;
  }
  if (ageOfData > dataStale) {
    fetchOnePeriodData(selectedPeriod);
  }
  let generation_in_period = 0;
  let highest = 0;
  let bestSite = "";
  sitePeriodData[selectedPeriod].forEach((site) => {
    const found = selectedSites.indexOf(site.name);
    if (found >= 0) {
      generation_in_period += site.generation_in_period;
      if (site.max > highest) {
        highest = site.max;
        bestSite = site.name;
      }
    }
  });
  generationInPeriod.textContent = formatWatts(generation_in_period * 1e3, true);
  bestProduction.textContent = `${bestSite} with ${formatWatts(highest)}`;
  drawSiteGraph(recreateGraph);
}
document.addEventListener("DOMContentLoaded", () => {
  const eventSource = new EventSource(`${server}/sse`);
  eventSource.addEventListener("message", (e) => {
    var _a;
    liveData = JSON.parse(e.data);
    if (liveData.sites && liveData.sites.length) {
      liveData.sites.forEach((site) => {
        site.max_percent = site.snapshot / site.max * 100;
      });
    }
    if (sites_carousel.firstElementChild) {
      console.log(liveData.sites);
      updateTimer.newEta();
      liveData.sites.forEach((site, i) => {
        const spacelessName = site.name.replaceAll(" ", "").replaceAll("(", "").replaceAll(")", "");
        sites_carousel.querySelectorAll(`.${spacelessName}-snapshot`).forEach((span) => {
          span.textContent = formatWatts(site.snapshot);
        });
      });
      combinedSolarData.push({
        x: referenceDay(),
        y: liveData["current_w"] / 1e6
      });
    } else {
      updateTimer.start();
      if (((_a = liveData["sites"]) == null ? void 0 : _a.length) > 0) {
        const virtualSite = liveData.sites.pop();
        const sortedSites = liveData["sites"].sort((a, b) => b.snapshot - a.snapshot);
        sortedSites.push(virtualSite);
        sortedSites.forEach((site, i) => {
          sites_carousel.append(createSiteCard(site));
          siteSelection.append(createSiteSelector(site.name, letters[i]));
          addBullet(glide_carousel);
        });
      }
      new Glide(".glide", config_carousel).mount();
      document.querySelectorAll(".site-card span.name").forEach((e2) => {
        e2.addEventListener("click", handleCardClick);
      });
      initDropdown();
      const dropDownOptions = document.querySelectorAll("[name='selectedSites']");
      dropDownOptions.forEach((d) => {
        d.addEventListener("change", handleSiteSelection);
      });
      fetchAllPeriodData(0);
    }
    updateTable();
    updateAggregated();
    updateDemand(parseFloat(liveData["current_w"]) / 1e3);
  });
  window.addEventListener("beforeunload", () => {
    eventSource.close();
  });
});
document.querySelectorAll('[name="period"]').forEach((s) => {
  s.addEventListener("change", handlePeriodSelection);
});
sortingOptions.forEach((e) => {
  e.addEventListener("click", () => {
    updateTable();
  });
});
document.querySelectorAll("[name=legend]").forEach((e) => {
  e.addEventListener("input", drawAverageChart);
});
document.getElementById("selectAllSites").addEventListener("click", () => {
  setTimeout(updateSiteOverview, 0);
});
document.getElementById("legend-toggle").state = false;
document.getElementById("legend-toggle").addEventListener("click", (e) => {
  e.target.state = !e.target.state;
  if (e.target.state) {
    e.target.textContent = "... Show Less";
    document.querySelectorAll("#legend-more").forEach((e2) => e2.classList.remove("hide-more"));
    document.querySelectorAll("#legend-more").forEach((e2) => e2.classList.add("show-more"));
  } else {
    e.target.textContent = "... Show More";
    document.querySelectorAll("#legend-more").forEach((e2) => e2.classList.add("hide-more"));
    document.querySelectorAll("#legend-more").forEach((e2) => e2.classList.remove("show-more"));
  }
});
function createSiteRow(rank2, siteData) {
  const row = document.createElement("tr");
  const rankCell = document.createElement("td");
  const nameCell = document.createElement("td");
  const generationCell = document.createElement("td");
  const meterCell = document.createElement("td");
  const maxPercentCell = document.createElement("td");
  rankCell.textContent = rank2;
  const name = document.createElement("a");
  name.textContent = siteData.name;
  name.classList.add("name");
  name.title = "See a graph of this sites generation";
  name.addEventListener("click", handleCardClick);
  nameCell.append(name);
  generationCell.textContent = formatWatts(siteData.snapshot);
  generationCell.title = "What this site is currently generating.";
  meterCell.textContent = formatWatts(siteData.today * 1e3, true);
  meterCell.title = "The increase in this sites meter since midnight.";
  maxPercentCell.textContent = siteData.max_percent.toFixed(2) + "%";
  maxPercentCell.title = "The current output as a percentage of this sites best output.";
  row.append(rankCell, nameCell, generationCell, meterCell, maxPercentCell);
  return row;
}
function createSiteCard(siteData) {
  const li = document.createElement("li");
  li.classList.add("site-card", "glide__slide");
  const img = document.createElement("img");
  const name = document.createElement("span");
  name.classList.add("name");
  const srcToTry = `/imgs/${siteData.name.replaceAll(" ", "%20")}.png`;
  img.src = srcToTry;
  img.addEventListener("error", () => {
    document.querySelectorAll(`[src="${srcToTry}"]`).forEach((i) => i.src = "/imgs/RoofTop.png");
  });
  name.textContent = siteData.name;
  name.setAttributeNS(null, "data-name", siteData.name);
  const span = document.createElement("span");
  span.classList.add("generation-total");
  const spacelessName = siteData.name.replaceAll(" ", "").replaceAll("(", "").replaceAll(")", "");
  span.classList.add(`${spacelessName}-snapshot`);
  span.textContent = formatWatts(siteData.snapshot);
  span.title = `Current ouptut from ${siteData.name}`;
  li.append(img, name, span);
  return li;
}
function createSiteSelector(siteName, seriesLetter) {
  const label = document.createElement("label");
  label.textContent = siteName;
  label.classList.add("dropdown-option", `ct-series-${seriesLetter}`);
  const checkbox = document.createElement("input");
  const spacelessName = siteName.replaceAll(" ", "");
  checkbox.id = spacelessName + "_checkbox";
  label.setAttribute("for", spacelessName + "_checkbox");
  checkbox.name = "selectedSites";
  checkbox.type = "checkbox";
  label.append(checkbox);
  return label;
}
function addBullet(glide_el) {
  const bullets = glide_el.querySelector(".glide__bullets");
  const current_number = bullets.children.length;
  const button = document.createElement("button");
  button.classList.add("glide__bullet");
  button.setAttributeNS(null, "data-glide-dir", `=${current_number}`);
  bullets.append(button);
}
function makeModal(el, openLinkId, closeLinkId) {
  var _a, _b;
  el.show = () => el.classList.remove("display-none");
  el.close = () => el.classList.add("display-none");
  if (openLinkId != null) (_a = document.getElementById(openLinkId)) == null ? void 0 : _a.addEventListener("click", el.show);
  if (closeLinkId != null) (_b = document.getElementById(closeLinkId)) == null ? void 0 : _b.addEventListener("click", el.close);
}
function handleSiteSelection() {
  updateSiteOverview();
}
function handlePeriodSelection() {
  updateSiteOverview(true);
}
function handleCardClick(e) {
  const siteName = e.currentTarget.textContent.replaceAll(" ", "");
  document.getElementById(siteName + "_checkbox").setAttribute("checked", "checked");
  updateSiteOverview();
  siteDialog.show();
  window.scroll(0, 0);
}
function fetchOnePeriodData(period) {
  const address = `${server}/site/all/${period}`;
  fetch(address).then((res) => {
    res.json().then((data3) => {
      if (data3.length > 0) {
        data3.forEach((d3) => {
          if (d3.data) {
            let periodIndex = periods.indexOf(Number(period));
            if (periodIndex < 0) periodIndex = periodExpectedGaps.length - 1;
            const BIG_GAP = periodExpectedGaps[periodIndex] * 10;
            let filled = [];
            const first = d3.data[0];
            first[0] *= 1e3;
            const now = Date.now().valueOf();
            const startOfPeriod = now - (864e5 * periods[periodIndex] - BIG_GAP / 5);
            if (first[0] > startOfPeriod) {
              filled.push([startOfPeriod, 0]);
              filled.push([first[0] - 1, 0]);
            }
            filled.push(first);
            let last = d3.data[0];
            for (let i = 1; i < d3.data.length; i++) {
              const curr = d3.data[i];
              const lastTime = last[0] * 1e3;
              const currTime = curr[0] * 1e3;
              const gapSize = currTime - lastTime;
              if (gapSize > BIG_GAP) {
                filled.push([lastTime + 1, 0]);
                filled.push([currTime - 1, 0]);
              }
              filled.push([currTime, curr[1]]);
              last = curr;
            }
            d3.data = filled;
          }
        });
        sitePeriodData[period.toString()] = data3;
        drawSiteGraph();
      }
    });
  });
}
function fetchAllPeriodData(periodIndex) {
  const address = `${server}/site/all/${periods[periodIndex]}`;
  fetch(address).then((res) => {
    res.json().then((data3) => {
      if (data3.length > 0) {
        data3.forEach((d3) => {
          if (d3.data) {
            const BIG_GAP = periodExpectedGaps[periodIndex] * 10;
            let filled = [];
            const first = d3.data[0];
            first[0] *= 1e3;
            const now = Date.now().valueOf();
            const startOfPeriod = now - (864e5 * periods[periodIndex] - BIG_GAP / 5);
            if (first[0] > startOfPeriod) {
              filled.push([startOfPeriod, 0]);
              filled.push([first[0] - 1, 0]);
            }
            filled.push(first);
            let last = d3.data[0];
            for (let i = 1; i < d3.data.length; i++) {
              const curr = d3.data[i];
              const lastTime = last[0] * 1e3;
              const currTime = curr[0] * 1e3;
              const gapSize = currTime - lastTime;
              if (gapSize > BIG_GAP) {
                filled.push([lastTime + 1, 0]);
                filled.push([currTime - 1, 0]);
              }
              filled.push([currTime, curr[1]]);
              last = curr;
            }
            d3.data = filled;
          }
        });
        sitePeriodData[periods[periodIndex].toString()] = data3;
        document.querySelector(`[name='period'][value='${periods[periodIndex]}']`).disabled = false;
        periodIndex++;
        if (periodIndex < periods.length) {
          fetchAllPeriodData(periodIndex);
        }
      }
    });
  });
}
function fetchCombinedSolarData() {
  fetch(`${server}/site/all`).then((res) => {
    res.json().then((data3) => {
      var _a;
      if (((_a = data3.values) == null ? void 0 : _a.length) > 0) {
        combinedSolarData.push(...data3.values.map((r) => {
          return {
            x: referenceDay(r[0] * 1e3).valueOf() - 15 * 60 * 1e3,
            //Prometheus uses seconds so convert to milliseconds for js, also move the data point to the middle of the time period it represents
            y: parseFloat(r[1] / 1e6)
            //the supplied value is in watts, convert to MW for the graph
          };
        }));
        const zero = combinedSolarData.getRecent(1).x + 15 * 60 * 1e3;
        const lastAveragedPoint = zero + (referenceDay().valueOf() - zero) / 2;
        combinedSolarData.editRecent(0, { x: lastAveragedPoint });
        drawAverageChart();
      }
    });
  });
}
function demandAtTime(pointInTime) {
  const referenceTime = referenceDay(pointInTime);
  let index = 0;
  while (index < averageDay.length && referenceTime.valueOf() > new Date(averageDay[index].x).valueOf()) {
    index++;
  }
  if (index == 0) {
    return averageDay[index].y;
  }
  const y1 = averageDay[index - 1].y;
  const y2 = averageDay[index].y;
  const mins = referenceTime.getMinutes();
  const xd = mins < 30 ? mins : mins - 30;
  const changePerMinute = (y2 - y1) / 30;
  return y1 + xd * changePerMinute;
}
function referenceDay(time2 = Date.now()) {
  return /* @__PURE__ */ new Date(`1 jan 2020 ${new Date(time2).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`);
}
function formatWatts(watts, wattHour = false) {
  const units = ["W", "kW", "MW", "GW"];
  let index = 0;
  let value = watts;
  while (value >= 1e3 && index < units.length - 1) {
    value /= 1e3;
    index++;
  }
  return `${value.toFixed(2)} ${units[index]}${wattHour ? "h" : ""}`;
}
