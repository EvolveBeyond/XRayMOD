var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// node_modules/unenv/dist/runtime/_internal/utils.mjs
// @__NO_SIDE_EFFECTS__
function createNotImplementedError(name) {
  return new Error(`[unenv] ${name} is not implemented yet!`);
}
__name(createNotImplementedError, "createNotImplementedError");
// @__NO_SIDE_EFFECTS__
function notImplemented(name) {
  const fn = /* @__PURE__ */ __name(() => {
    throw /* @__PURE__ */ createNotImplementedError(name);
  }, "fn");
  return Object.assign(fn, { __unenv__: true });
}
__name(notImplemented, "notImplemented");
// @__NO_SIDE_EFFECTS__
function notImplementedClass(name) {
  return class {
    __unenv__ = true;
    constructor() {
      throw new Error(`[unenv] ${name} is not implemented yet!`);
    }
  };
}
__name(notImplementedClass, "notImplementedClass");

// node_modules/unenv/dist/runtime/node/internal/perf_hooks/performance.mjs
var _timeOrigin = globalThis.performance?.timeOrigin ?? Date.now();
var _performanceNow = globalThis.performance?.now ? globalThis.performance.now.bind(globalThis.performance) : () => Date.now() - _timeOrigin;
var nodeTiming = {
  name: "node",
  entryType: "node",
  startTime: 0,
  duration: 0,
  nodeStart: 0,
  v8Start: 0,
  bootstrapComplete: 0,
  environment: 0,
  loopStart: 0,
  loopExit: 0,
  idleTime: 0,
  uvMetricsInfo: {
    loopCount: 0,
    events: 0,
    eventsWaiting: 0
  },
  detail: void 0,
  toJSON() {
    return this;
  }
};
var PerformanceEntry = class {
  static {
    __name(this, "PerformanceEntry");
  }
  __unenv__ = true;
  detail;
  entryType = "event";
  name;
  startTime;
  constructor(name, options) {
    this.name = name;
    this.startTime = options?.startTime || _performanceNow();
    this.detail = options?.detail;
  }
  get duration() {
    return _performanceNow() - this.startTime;
  }
  toJSON() {
    return {
      name: this.name,
      entryType: this.entryType,
      startTime: this.startTime,
      duration: this.duration,
      detail: this.detail
    };
  }
};
var PerformanceMark = class PerformanceMark2 extends PerformanceEntry {
  static {
    __name(this, "PerformanceMark");
  }
  entryType = "mark";
  constructor() {
    super(...arguments);
  }
  get duration() {
    return 0;
  }
};
var PerformanceMeasure = class extends PerformanceEntry {
  static {
    __name(this, "PerformanceMeasure");
  }
  entryType = "measure";
};
var PerformanceResourceTiming = class extends PerformanceEntry {
  static {
    __name(this, "PerformanceResourceTiming");
  }
  entryType = "resource";
  serverTiming = [];
  connectEnd = 0;
  connectStart = 0;
  decodedBodySize = 0;
  domainLookupEnd = 0;
  domainLookupStart = 0;
  encodedBodySize = 0;
  fetchStart = 0;
  initiatorType = "";
  name = "";
  nextHopProtocol = "";
  redirectEnd = 0;
  redirectStart = 0;
  requestStart = 0;
  responseEnd = 0;
  responseStart = 0;
  secureConnectionStart = 0;
  startTime = 0;
  transferSize = 0;
  workerStart = 0;
  responseStatus = 0;
};
var PerformanceObserverEntryList = class {
  static {
    __name(this, "PerformanceObserverEntryList");
  }
  __unenv__ = true;
  getEntries() {
    return [];
  }
  getEntriesByName(_name, _type) {
    return [];
  }
  getEntriesByType(type) {
    return [];
  }
};
var Performance = class {
  static {
    __name(this, "Performance");
  }
  __unenv__ = true;
  timeOrigin = _timeOrigin;
  eventCounts = /* @__PURE__ */ new Map();
  _entries = [];
  _resourceTimingBufferSize = 0;
  navigation = void 0;
  timing = void 0;
  timerify(_fn, _options) {
    throw createNotImplementedError("Performance.timerify");
  }
  get nodeTiming() {
    return nodeTiming;
  }
  eventLoopUtilization() {
    return {};
  }
  markResourceTiming() {
    return new PerformanceResourceTiming("");
  }
  onresourcetimingbufferfull = null;
  now() {
    if (this.timeOrigin === _timeOrigin) {
      return _performanceNow();
    }
    return Date.now() - this.timeOrigin;
  }
  clearMarks(markName) {
    this._entries = markName ? this._entries.filter((e) => e.name !== markName) : this._entries.filter((e) => e.entryType !== "mark");
  }
  clearMeasures(measureName) {
    this._entries = measureName ? this._entries.filter((e) => e.name !== measureName) : this._entries.filter((e) => e.entryType !== "measure");
  }
  clearResourceTimings() {
    this._entries = this._entries.filter((e) => e.entryType !== "resource" || e.entryType !== "navigation");
  }
  getEntries() {
    return this._entries;
  }
  getEntriesByName(name, type) {
    return this._entries.filter((e) => e.name === name && (!type || e.entryType === type));
  }
  getEntriesByType(type) {
    return this._entries.filter((e) => e.entryType === type);
  }
  mark(name, options) {
    const entry = new PerformanceMark(name, options);
    this._entries.push(entry);
    return entry;
  }
  measure(measureName, startOrMeasureOptions, endMark) {
    let start;
    let end;
    if (typeof startOrMeasureOptions === "string") {
      start = this.getEntriesByName(startOrMeasureOptions, "mark")[0]?.startTime;
      end = this.getEntriesByName(endMark, "mark")[0]?.startTime;
    } else {
      start = Number.parseFloat(startOrMeasureOptions?.start) || this.now();
      end = Number.parseFloat(startOrMeasureOptions?.end) || this.now();
    }
    const entry = new PerformanceMeasure(measureName, {
      startTime: start,
      detail: {
        start,
        end
      }
    });
    this._entries.push(entry);
    return entry;
  }
  setResourceTimingBufferSize(maxSize) {
    this._resourceTimingBufferSize = maxSize;
  }
  addEventListener(type, listener, options) {
    throw createNotImplementedError("Performance.addEventListener");
  }
  removeEventListener(type, listener, options) {
    throw createNotImplementedError("Performance.removeEventListener");
  }
  dispatchEvent(event) {
    throw createNotImplementedError("Performance.dispatchEvent");
  }
  toJSON() {
    return this;
  }
};
var PerformanceObserver = class {
  static {
    __name(this, "PerformanceObserver");
  }
  __unenv__ = true;
  static supportedEntryTypes = [];
  _callback = null;
  constructor(callback) {
    this._callback = callback;
  }
  takeRecords() {
    return [];
  }
  disconnect() {
    throw createNotImplementedError("PerformanceObserver.disconnect");
  }
  observe(options) {
    throw createNotImplementedError("PerformanceObserver.observe");
  }
  bind(fn) {
    return fn;
  }
  runInAsyncScope(fn, thisArg, ...args) {
    return fn.call(thisArg, ...args);
  }
  asyncId() {
    return 0;
  }
  triggerAsyncId() {
    return 0;
  }
  emitDestroy() {
    return this;
  }
};
var performance = globalThis.performance && "addEventListener" in globalThis.performance ? globalThis.performance : new Performance();

// node_modules/@cloudflare/unenv-preset/dist/runtime/polyfill/performance.mjs
if (!("__unenv__" in performance)) {
  const proto = Performance.prototype;
  for (const key of Object.getOwnPropertyNames(proto)) {
    if (key !== "constructor" && !(key in performance)) {
      const desc = Object.getOwnPropertyDescriptor(proto, key);
      if (desc) {
        Object.defineProperty(performance, key, desc);
      }
    }
  }
}
globalThis.performance = performance;
globalThis.Performance = Performance;
globalThis.PerformanceEntry = PerformanceEntry;
globalThis.PerformanceMark = PerformanceMark;
globalThis.PerformanceMeasure = PerformanceMeasure;
globalThis.PerformanceObserver = PerformanceObserver;
globalThis.PerformanceObserverEntryList = PerformanceObserverEntryList;
globalThis.PerformanceResourceTiming = PerformanceResourceTiming;

// node_modules/unenv/dist/runtime/node/console.mjs
import { Writable } from "node:stream";

// node_modules/unenv/dist/runtime/mock/noop.mjs
var noop_default = Object.assign(() => {
}, { __unenv__: true });

// node_modules/unenv/dist/runtime/node/console.mjs
var _console = globalThis.console;
var _ignoreErrors = true;
var _stderr = new Writable();
var _stdout = new Writable();
var log = _console?.log ?? noop_default;
var info = _console?.info ?? log;
var trace = _console?.trace ?? info;
var debug = _console?.debug ?? log;
var table = _console?.table ?? log;
var error = _console?.error ?? log;
var warn = _console?.warn ?? error;
var createTask = _console?.createTask ?? /* @__PURE__ */ notImplemented("console.createTask");
var clear = _console?.clear ?? noop_default;
var count = _console?.count ?? noop_default;
var countReset = _console?.countReset ?? noop_default;
var dir = _console?.dir ?? noop_default;
var dirxml = _console?.dirxml ?? noop_default;
var group = _console?.group ?? noop_default;
var groupEnd = _console?.groupEnd ?? noop_default;
var groupCollapsed = _console?.groupCollapsed ?? noop_default;
var profile = _console?.profile ?? noop_default;
var profileEnd = _console?.profileEnd ?? noop_default;
var time = _console?.time ?? noop_default;
var timeEnd = _console?.timeEnd ?? noop_default;
var timeLog = _console?.timeLog ?? noop_default;
var timeStamp = _console?.timeStamp ?? noop_default;
var Console = _console?.Console ?? /* @__PURE__ */ notImplementedClass("console.Console");
var _times = /* @__PURE__ */ new Map();
var _stdoutErrorHandler = noop_default;
var _stderrErrorHandler = noop_default;

// node_modules/@cloudflare/unenv-preset/dist/runtime/node/console.mjs
var workerdConsole = globalThis["console"];
var {
  assert,
  clear: clear2,
  // @ts-expect-error undocumented public API
  context,
  count: count2,
  countReset: countReset2,
  // @ts-expect-error undocumented public API
  createTask: createTask2,
  debug: debug2,
  dir: dir2,
  dirxml: dirxml2,
  error: error2,
  group: group2,
  groupCollapsed: groupCollapsed2,
  groupEnd: groupEnd2,
  info: info2,
  log: log2,
  profile: profile2,
  profileEnd: profileEnd2,
  table: table2,
  time: time2,
  timeEnd: timeEnd2,
  timeLog: timeLog2,
  timeStamp: timeStamp2,
  trace: trace2,
  warn: warn2
} = workerdConsole;
Object.assign(workerdConsole, {
  Console,
  _ignoreErrors,
  _stderr,
  _stderrErrorHandler,
  _stdout,
  _stdoutErrorHandler,
  _times
});
var console_default = workerdConsole;

// node_modules/wrangler/_virtual_unenv_global_polyfill-@cloudflare-unenv-preset-node-console
globalThis.console = console_default;

// node_modules/unenv/dist/runtime/node/internal/process/hrtime.mjs
var hrtime = /* @__PURE__ */ Object.assign(/* @__PURE__ */ __name(function hrtime2(startTime) {
  const now = Date.now();
  const seconds = Math.trunc(now / 1e3);
  const nanos = now % 1e3 * 1e6;
  if (startTime) {
    let diffSeconds = seconds - startTime[0];
    let diffNanos = nanos - startTime[0];
    if (diffNanos < 0) {
      diffSeconds = diffSeconds - 1;
      diffNanos = 1e9 + diffNanos;
    }
    return [diffSeconds, diffNanos];
  }
  return [seconds, nanos];
}, "hrtime"), { bigint: /* @__PURE__ */ __name(function bigint() {
  return BigInt(Date.now() * 1e6);
}, "bigint") });

// node_modules/unenv/dist/runtime/node/internal/process/process.mjs
import { EventEmitter } from "node:events";

// node_modules/unenv/dist/runtime/node/internal/tty/read-stream.mjs
var ReadStream = class {
  static {
    __name(this, "ReadStream");
  }
  fd;
  isRaw = false;
  isTTY = false;
  constructor(fd) {
    this.fd = fd;
  }
  setRawMode(mode) {
    this.isRaw = mode;
    return this;
  }
};

// node_modules/unenv/dist/runtime/node/internal/tty/write-stream.mjs
var WriteStream = class {
  static {
    __name(this, "WriteStream");
  }
  fd;
  columns = 80;
  rows = 24;
  isTTY = false;
  constructor(fd) {
    this.fd = fd;
  }
  clearLine(dir3, callback) {
    callback && callback();
    return false;
  }
  clearScreenDown(callback) {
    callback && callback();
    return false;
  }
  cursorTo(x, y, callback) {
    callback && typeof callback === "function" && callback();
    return false;
  }
  moveCursor(dx, dy, callback) {
    callback && callback();
    return false;
  }
  getColorDepth(env2) {
    return 1;
  }
  hasColors(count3, env2) {
    return false;
  }
  getWindowSize() {
    return [this.columns, this.rows];
  }
  write(str, encoding, cb) {
    if (str instanceof Uint8Array) {
      str = new TextDecoder().decode(str);
    }
    try {
      console.log(str);
    } catch {
    }
    cb && typeof cb === "function" && cb();
    return false;
  }
};

// node_modules/unenv/dist/runtime/node/internal/process/node-version.mjs
var NODE_VERSION = "22.14.0";

// node_modules/unenv/dist/runtime/node/internal/process/process.mjs
var Process = class _Process extends EventEmitter {
  static {
    __name(this, "Process");
  }
  env;
  hrtime;
  nextTick;
  constructor(impl) {
    super();
    this.env = impl.env;
    this.hrtime = impl.hrtime;
    this.nextTick = impl.nextTick;
    for (const prop of [...Object.getOwnPropertyNames(_Process.prototype), ...Object.getOwnPropertyNames(EventEmitter.prototype)]) {
      const value = this[prop];
      if (typeof value === "function") {
        this[prop] = value.bind(this);
      }
    }
  }
  // --- event emitter ---
  emitWarning(warning, type, code) {
    console.warn(`${code ? `[${code}] ` : ""}${type ? `${type}: ` : ""}${warning}`);
  }
  emit(...args) {
    return super.emit(...args);
  }
  listeners(eventName) {
    return super.listeners(eventName);
  }
  // --- stdio (lazy initializers) ---
  #stdin;
  #stdout;
  #stderr;
  get stdin() {
    return this.#stdin ??= new ReadStream(0);
  }
  get stdout() {
    return this.#stdout ??= new WriteStream(1);
  }
  get stderr() {
    return this.#stderr ??= new WriteStream(2);
  }
  // --- cwd ---
  #cwd = "/";
  chdir(cwd2) {
    this.#cwd = cwd2;
  }
  cwd() {
    return this.#cwd;
  }
  // --- dummy props and getters ---
  arch = "";
  platform = "";
  argv = [];
  argv0 = "";
  execArgv = [];
  execPath = "";
  title = "";
  pid = 200;
  ppid = 100;
  get version() {
    return `v${NODE_VERSION}`;
  }
  get versions() {
    return { node: NODE_VERSION };
  }
  get allowedNodeEnvironmentFlags() {
    return /* @__PURE__ */ new Set();
  }
  get sourceMapsEnabled() {
    return false;
  }
  get debugPort() {
    return 0;
  }
  get throwDeprecation() {
    return false;
  }
  get traceDeprecation() {
    return false;
  }
  get features() {
    return {};
  }
  get release() {
    return {};
  }
  get connected() {
    return false;
  }
  get config() {
    return {};
  }
  get moduleLoadList() {
    return [];
  }
  constrainedMemory() {
    return 0;
  }
  availableMemory() {
    return 0;
  }
  uptime() {
    return 0;
  }
  resourceUsage() {
    return {};
  }
  // --- noop methods ---
  ref() {
  }
  unref() {
  }
  // --- unimplemented methods ---
  umask() {
    throw createNotImplementedError("process.umask");
  }
  getBuiltinModule() {
    return void 0;
  }
  getActiveResourcesInfo() {
    throw createNotImplementedError("process.getActiveResourcesInfo");
  }
  exit() {
    throw createNotImplementedError("process.exit");
  }
  reallyExit() {
    throw createNotImplementedError("process.reallyExit");
  }
  kill() {
    throw createNotImplementedError("process.kill");
  }
  abort() {
    throw createNotImplementedError("process.abort");
  }
  dlopen() {
    throw createNotImplementedError("process.dlopen");
  }
  setSourceMapsEnabled() {
    throw createNotImplementedError("process.setSourceMapsEnabled");
  }
  loadEnvFile() {
    throw createNotImplementedError("process.loadEnvFile");
  }
  disconnect() {
    throw createNotImplementedError("process.disconnect");
  }
  cpuUsage() {
    throw createNotImplementedError("process.cpuUsage");
  }
  setUncaughtExceptionCaptureCallback() {
    throw createNotImplementedError("process.setUncaughtExceptionCaptureCallback");
  }
  hasUncaughtExceptionCaptureCallback() {
    throw createNotImplementedError("process.hasUncaughtExceptionCaptureCallback");
  }
  initgroups() {
    throw createNotImplementedError("process.initgroups");
  }
  openStdin() {
    throw createNotImplementedError("process.openStdin");
  }
  assert() {
    throw createNotImplementedError("process.assert");
  }
  binding() {
    throw createNotImplementedError("process.binding");
  }
  // --- attached interfaces ---
  permission = { has: /* @__PURE__ */ notImplemented("process.permission.has") };
  report = {
    directory: "",
    filename: "",
    signal: "SIGUSR2",
    compact: false,
    reportOnFatalError: false,
    reportOnSignal: false,
    reportOnUncaughtException: false,
    getReport: /* @__PURE__ */ notImplemented("process.report.getReport"),
    writeReport: /* @__PURE__ */ notImplemented("process.report.writeReport")
  };
  finalization = {
    register: /* @__PURE__ */ notImplemented("process.finalization.register"),
    unregister: /* @__PURE__ */ notImplemented("process.finalization.unregister"),
    registerBeforeExit: /* @__PURE__ */ notImplemented("process.finalization.registerBeforeExit")
  };
  memoryUsage = Object.assign(() => ({
    arrayBuffers: 0,
    rss: 0,
    external: 0,
    heapTotal: 0,
    heapUsed: 0
  }), { rss: /* @__PURE__ */ __name(() => 0, "rss") });
  // --- undefined props ---
  mainModule = void 0;
  domain = void 0;
  // optional
  send = void 0;
  exitCode = void 0;
  channel = void 0;
  getegid = void 0;
  geteuid = void 0;
  getgid = void 0;
  getgroups = void 0;
  getuid = void 0;
  setegid = void 0;
  seteuid = void 0;
  setgid = void 0;
  setgroups = void 0;
  setuid = void 0;
  // internals
  _events = void 0;
  _eventsCount = void 0;
  _exiting = void 0;
  _maxListeners = void 0;
  _debugEnd = void 0;
  _debugProcess = void 0;
  _fatalException = void 0;
  _getActiveHandles = void 0;
  _getActiveRequests = void 0;
  _kill = void 0;
  _preload_modules = void 0;
  _rawDebug = void 0;
  _startProfilerIdleNotifier = void 0;
  _stopProfilerIdleNotifier = void 0;
  _tickCallback = void 0;
  _disconnect = void 0;
  _handleQueue = void 0;
  _pendingMessage = void 0;
  _channel = void 0;
  _send = void 0;
  _linkedBinding = void 0;
};

// node_modules/@cloudflare/unenv-preset/dist/runtime/node/process.mjs
var globalProcess = globalThis["process"];
var getBuiltinModule = globalProcess.getBuiltinModule;
var workerdProcess = getBuiltinModule("node:process");
var unenvProcess = new Process({
  env: globalProcess.env,
  hrtime,
  // `nextTick` is available from workerd process v1
  nextTick: workerdProcess.nextTick
});
var { exit, features, platform } = workerdProcess;
var {
  _channel,
  _debugEnd,
  _debugProcess,
  _disconnect,
  _events,
  _eventsCount,
  _exiting,
  _fatalException,
  _getActiveHandles,
  _getActiveRequests,
  _handleQueue,
  _kill,
  _linkedBinding,
  _maxListeners,
  _pendingMessage,
  _preload_modules,
  _rawDebug,
  _send,
  _startProfilerIdleNotifier,
  _stopProfilerIdleNotifier,
  _tickCallback,
  abort,
  addListener,
  allowedNodeEnvironmentFlags,
  arch,
  argv,
  argv0,
  assert: assert2,
  availableMemory,
  binding,
  channel,
  chdir,
  config,
  connected,
  constrainedMemory,
  cpuUsage,
  cwd,
  debugPort,
  disconnect,
  dlopen,
  domain,
  emit,
  emitWarning,
  env,
  eventNames,
  execArgv,
  execPath,
  exitCode,
  finalization,
  getActiveResourcesInfo,
  getegid,
  geteuid,
  getgid,
  getgroups,
  getMaxListeners,
  getuid,
  hasUncaughtExceptionCaptureCallback,
  hrtime: hrtime3,
  initgroups,
  kill,
  listenerCount,
  listeners,
  loadEnvFile,
  mainModule,
  memoryUsage,
  moduleLoadList,
  nextTick,
  off,
  on,
  once,
  openStdin,
  permission,
  pid,
  ppid,
  prependListener,
  prependOnceListener,
  rawListeners,
  reallyExit,
  ref,
  release,
  removeAllListeners,
  removeListener,
  report,
  resourceUsage,
  send,
  setegid,
  seteuid,
  setgid,
  setgroups,
  setMaxListeners,
  setSourceMapsEnabled,
  setuid,
  setUncaughtExceptionCaptureCallback,
  sourceMapsEnabled,
  stderr,
  stdin,
  stdout,
  throwDeprecation,
  title,
  traceDeprecation,
  umask,
  unref,
  uptime,
  version,
  versions
} = unenvProcess;
var _process = {
  abort,
  addListener,
  allowedNodeEnvironmentFlags,
  hasUncaughtExceptionCaptureCallback,
  setUncaughtExceptionCaptureCallback,
  loadEnvFile,
  sourceMapsEnabled,
  arch,
  argv,
  argv0,
  chdir,
  config,
  connected,
  constrainedMemory,
  availableMemory,
  cpuUsage,
  cwd,
  debugPort,
  dlopen,
  disconnect,
  emit,
  emitWarning,
  env,
  eventNames,
  execArgv,
  execPath,
  exit,
  finalization,
  features,
  getBuiltinModule,
  getActiveResourcesInfo,
  getMaxListeners,
  hrtime: hrtime3,
  kill,
  listeners,
  listenerCount,
  memoryUsage,
  nextTick,
  on,
  off,
  once,
  pid,
  platform,
  ppid,
  prependListener,
  prependOnceListener,
  rawListeners,
  release,
  removeAllListeners,
  removeListener,
  report,
  resourceUsage,
  setMaxListeners,
  setSourceMapsEnabled,
  stderr,
  stdin,
  stdout,
  title,
  throwDeprecation,
  traceDeprecation,
  umask,
  uptime,
  version,
  versions,
  // @ts-expect-error old API
  domain,
  initgroups,
  moduleLoadList,
  reallyExit,
  openStdin,
  assert: assert2,
  binding,
  send,
  exitCode,
  channel,
  getegid,
  geteuid,
  getgid,
  getgroups,
  getuid,
  setegid,
  seteuid,
  setgid,
  setgroups,
  setuid,
  permission,
  mainModule,
  _events,
  _eventsCount,
  _exiting,
  _maxListeners,
  _debugEnd,
  _debugProcess,
  _fatalException,
  _getActiveHandles,
  _getActiveRequests,
  _kill,
  _preload_modules,
  _rawDebug,
  _startProfilerIdleNotifier,
  _stopProfilerIdleNotifier,
  _tickCallback,
  _disconnect,
  _handleQueue,
  _pendingMessage,
  _channel,
  _send,
  _linkedBinding
};
var process_default = _process;

// node_modules/wrangler/_virtual_unenv_global_polyfill-@cloudflare-unenv-preset-node-process
globalThis.process = process_default;

// worker/schema.ts
var DEFAULT_PROTOCOLS = [
  {
    id: "vless-reality",
    name: "VLESS + Reality",
    schema_json: JSON.stringify({
      fields: [
        { name: "port", label: "Port", type: "number", default: 443 },
        { name: "uuid", label: "UUID", type: "text", required: true },
        { name: "sni", label: "SNI", type: "text", default: "google.com" },
        { name: "sid", label: "Short ID", type: "text" },
        { name: "pbk", label: "Public Key", type: "text", required: true },
        {
          name: "flow",
          label: "Flow",
          type: "select",
          default: "xtls-rprx-vision",
          options: [
            { label: "None", value: "" },
            { label: "Vision", value: "xtls-rprx-vision" }
          ]
        }
      ]
    }),
    template_json: JSON.stringify({
      inbound: {
        port: "{{port}}",
        protocol: "vless",
        settings: { clients: [{ id: "{{uuid}}", flow: "{{flow}}" }] },
        streamSettings: {
          network: "tcp",
          security: "reality",
          realitySettings: {
            dest: "{{sni}}:443",
            serverNames: ["{{sni}}"],
            privateKey: "{{privateKey}}",
            shortIds: ["{{sid}}"]
          }
        }
      }
    }),
    price: 0,
    client_limit: 1,
    client_price: 0
  },
  {
    id: "vmess-ws",
    name: "VMess + WebSocket",
    schema_json: JSON.stringify({
      fields: [
        { name: "port", label: "Port", type: "number", default: 80 },
        { name: "uuid", label: "UUID", type: "text", required: true },
        { name: "path", label: "WS Path", type: "text", default: "/graphql" },
        { name: "host", label: "Host", type: "text" }
      ]
    }),
    template_json: JSON.stringify({
      inbound: {
        port: "{{port}}",
        protocol: "vmess",
        settings: { clients: [{ id: "{{uuid}}" }] },
        streamSettings: {
          network: "ws",
          wsSettings: { path: "{{path}}", headers: { Host: "{{host}}" } }
        }
      }
    }),
    price: 0,
    client_limit: 1,
    client_price: 0
  },
  {
    id: "trojan-ws",
    name: "Trojan + WebSocket",
    schema_json: JSON.stringify({
      fields: [
        { name: "port", label: "Port", type: "number", default: 443 },
        { name: "password", label: "Password", type: "password", required: true },
        { name: "sni", label: "SNI", type: "text", default: "google.com" },
        { name: "path", label: "WS Path", type: "text", default: "/trojan-ws" }
      ]
    }),
    template_json: JSON.stringify({
      inbound: {
        port: "{{port}}",
        protocol: "trojan",
        settings: { clients: [{ password: "{{password}}" }] },
        streamSettings: {
          network: "ws",
          security: "tls",
          tlsSettings: { serverName: "{{sni}}" },
          wsSettings: { path: "{{path}}" }
        }
      }
    }),
    price: 0,
    client_limit: 1,
    client_price: 0
  },
  {
    id: "ss-ws",
    name: "Shadowsocks + WebSocket",
    schema_json: JSON.stringify({
      fields: [
        { name: "port", label: "Port", type: "number", default: 80 },
        { name: "method", label: "Method", type: "select", default: "chacha20-ietf-poly1305", options: [
          { label: "ChaCha20-Poly1305", value: "chacha20-ietf-poly1305" },
          { label: "AES-256-GCM", value: "aes-256-gcm" },
          { label: "AES-128-GCM", value: "aes-128-gcm" }
        ] },
        { name: "password", label: "Password", type: "password", required: true },
        { name: "path", label: "WS Path", type: "text", default: "/ss-ws" }
      ]
    }),
    template_json: JSON.stringify({
      inbound: {
        port: "{{port}}",
        protocol: "shadowsocks",
        settings: { method: "{{method}}", password: "{{password}}" },
        streamSettings: { network: "ws", wsSettings: { path: "{{path}}" } }
      }
    }),
    price: 0,
    client_limit: 1,
    client_price: 0
  },
  {
    id: "vless-grpc",
    name: "VLESS + gRPC",
    schema_json: JSON.stringify({
      fields: [
        { name: "port", label: "Port", type: "number", default: 443 },
        { name: "uuid", label: "UUID", type: "text", required: true },
        { name: "sni", label: "SNI", type: "text", default: "google.com" },
        { name: "serviceName", label: "Service Name", type: "text", default: "grpc" },
        { name: "mode", label: "gRPC Mode", type: "select", default: "gun", options: [
          { label: "Gun", value: "gun" },
          { label: "Multi", value: "multi" }
        ] }
      ]
    }),
    template_json: JSON.stringify({
      inbound: {
        port: "{{port}}",
        protocol: "vless",
        settings: { clients: [{ id: "{{uuid}}" }] },
        streamSettings: {
          network: "grpc",
          security: "tls",
          tlsSettings: { serverName: "{{sni}}" },
          grpcSettings: { serviceName: "{{serviceName}}" }
        }
      }
    }),
    price: 0,
    client_limit: 1,
    client_price: 0
  }
];
var DEFAULT_SETTINGS = {
  "panel.password_hash": "",
  "panel.secret_key": "",
  "panel.admin_uuid": "",
  "panel.access_uuid": "",
  "financial.referral_commission": "15",
  "financial.min_withdrawal": "5",
  "financial.tax_fee": "2",
  "integrations.telegram_enabled": "false",
  "integrations.ton_wallet_enabled": "false",
  "integrations.external_server_url": "",
  "disguise.enabled": "false",
  "disguise.admin_path": "",
  "disguise.login_path": "",
  "disguise.sub_path": "",
  "disguise.fallback_page": "1101",
  "ech.enabled": "false",
  "ech.sni": "cloudflare-ech.com",
  "ech.dns": "https://dns.alidns.com/dns-query",
  "tls_fragment.enabled": "false",
  "tls_fragment.mode": "Shadowrocket",
  "tg.bot_token": "",
  "tg.chat_id": ""
};
async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}
__name(hashPassword, "hashPassword");
async function tableExists(db, tableName) {
  try {
    const result = await db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name=?"
    ).bind(tableName).first();
    return result !== null;
  } catch {
    return false;
  }
}
__name(tableExists, "tableExists");
var TABLES = [
  `CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT DEFAULT 'user',
    uuid TEXT UNIQUE,
    email TEXT DEFAULT '',
    traffic_limit INTEGER DEFAULT 0,
    traffic_used INTEGER DEFAULT 0,
    expiry_date TEXT DEFAULT '',
    status TEXT DEFAULT 'active',
    created_at INTEGER
  )`,
  `CREATE TABLE IF NOT EXISTS configs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    protocol_id TEXT,
    name TEXT DEFAULT '',
    settings_json TEXT DEFAULT '{}',
    port INTEGER DEFAULT 443,
    path TEXT DEFAULT '',
    link TEXT DEFAULT '',
    node_ip TEXT DEFAULT '',
    client_limit INTEGER DEFAULT 1,
    created_at INTEGER
  )`,
  `CREATE TABLE IF NOT EXISTS protocols (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    schema_json TEXT NOT NULL,
    template_json TEXT NOT NULL,
    price REAL DEFAULT 0,
    client_limit INTEGER DEFAULT 1,
    client_price REAL DEFAULT 0
  )`,
  `CREATE TABLE IF NOT EXISTS kvstore (
    k TEXT PRIMARY KEY,
    v TEXT,
    updated INTEGER
  )`,
  `CREATE TABLE IF NOT EXISTS backends (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    vps_ip TEXT NOT NULL,
    vps_port INTEGER DEFAULT 443,
    vps_uuid TEXT DEFAULT '',
    status TEXT DEFAULT 'pending',
    created_at INTEGER
  )`
];
async function ensureSchema(db) {
  for (const sql of TABLES) {
    await db.prepare(sql).run();
  }
  const protocolsExist = await tableExists(db, "protocols");
  if (protocolsExist) {
    const count3 = await db.prepare("SELECT COUNT(*) as count FROM protocols").first();
    if (count3 && count3.count === 0) {
      for (const p of DEFAULT_PROTOCOLS) {
        await db.prepare(
          "INSERT OR IGNORE INTO protocols (id, name, schema_json, template_json, price, client_limit, client_price) VALUES (?, ?, ?, ?, ?, ?, ?)"
        ).bind(p.id, p.name, p.schema_json, p.template_json, p.price, p.client_limit, p.client_price).run();
      }
    }
  }
  for (const [k, v] of Object.entries(DEFAULT_SETTINGS)) {
    await db.prepare("INSERT OR IGNORE INTO kvstore (k, v, updated) VALUES (?, ?, ?)").bind(k, v, Date.now()).run();
  }
  const adminCheck = await db.prepare("SELECT id FROM users WHERE username = ?").bind("admin").first();
  if (!adminCheck) {
    const adminHash = await hashPassword("admin");
    const adminUuid = crypto.randomUUID();
    await db.prepare(
      "INSERT INTO users (username, password_hash, role, uuid, status, created_at) VALUES (?, ?, ?, ?, ?, ?)"
    ).bind("admin", adminHash, "admin", adminUuid, "active", Date.now()).run();
    await db.prepare(
      "INSERT OR REPLACE INTO kvstore (k, v, updated) VALUES (?, ?, ?)"
    ).bind("panel.admin_uuid", adminUuid, Date.now()).run();
  }
  const userCheck = await db.prepare("SELECT id FROM users WHERE username = ?").bind("user").first();
  if (!userCheck) {
    const userHash = await hashPassword("user");
    const userUuid = crypto.randomUUID();
    await db.prepare(
      "INSERT INTO users (username, password_hash, role, uuid, status, traffic_limit, expiry_date, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    ).bind(
      "user",
      userHash,
      "user",
      userUuid,
      "active",
      100,
      new Date(Date.now() + 30 * 24 * 60 * 60 * 1e3).toISOString().split("T")[0],
      Date.now()
    ).run();
  }
}
__name(ensureSchema, "ensureSchema");

// worker/proxy/grpc.ts
function isGrpcRequest(request) {
  const contentType = request.headers.get("Content-Type") || "";
  return contentType.startsWith("application/grpc");
}
__name(isGrpcRequest, "isGrpcRequest");

// worker/proxy/xhttp.ts
function isXHTTPRequest(request) {
  const referer = request.headers.get("Referer") || "";
  if (referer.includes("x_padding")) return true;
  const contentType = request.headers.get("Content-Type") || "";
  if (contentType.includes("application/octet-stream") && request.method === "POST") {
    return true;
  }
  return false;
}
__name(isXHTTPRequest, "isXHTTPRequest");

// worker/intent.ts
function detectIntent(request, url, env2) {
  const pathname = url.pathname;
  if (request.headers.get("Upgrade") === "websocket") {
    return { type: "proxy", transport: "websocket" };
  }
  if (request.method === "POST" && !pathname.startsWith("/api/") && !pathname.startsWith("/install")) {
    if (isGrpcRequest(request)) {
      return { type: "proxy", transport: "grpc" };
    }
    if (isXHTTPRequest(request)) {
      return { type: "proxy", transport: "xhttp" };
    }
  }
  if (pathname === "/install") {
    return { type: "install" };
  }
  if (pathname === "/bot") {
    return { type: "telegram", endpoint: "webhook" };
  }
  if (pathname === "/admin") {
    return { type: "telegram", endpoint: "login" };
  }
  const subMatch = pathname.match(/^\/sub\/([^/]+)/);
  if (subMatch) {
    return { type: "subscription", token: subMatch[1] };
  }
  if (pathname.startsWith("/api/")) {
    const segments = pathname.split("/").filter(Boolean);
    const resource = segments[1] || "";
    const action = segments[2];
    return { type: "api", resource, action };
  }
  if (!pathname.startsWith("/api/") && !pathname.startsWith("/sub/")) {
    return { type: "static", path: pathname };
  }
  return { type: "unknown", path: pathname };
}
__name(detectIntent, "detectIntent");
var processors = {
  proxy: [],
  api: [],
  subscription: [],
  install: [],
  telegram: [],
  static: [],
  unknown: []
};
function registerProcessor(intentType, processor) {
  processors[intentType].push(processor);
}
__name(registerProcessor, "registerProcessor");
async function processIntent(intent, request, env2, ctx) {
  const chain = processors[intent.type];
  for (const processor of chain) {
    const response = await processor(intent, request, env2, ctx);
    if (response) return response;
  }
  return new Response(JSON.stringify({ success: false, message: "Not found" }), {
    status: 404,
    headers: { "Content-Type": "application/json" }
  });
}
__name(processIntent, "processIntent");

// worker/disguise.ts
var EMPTY_DISGUISE = {
  on: false,
  adminPath: "",
  loginPath: "",
  subPath: "",
  pubAdmin: "/admin",
  pubLogin: "/login",
  fallbackPage: "1101"
};
function cleanPath(v) {
  return String(v || "").trim().toLowerCase().replace(/^\/+|\/+$/g, "").replace(/[^a-z0-9_-]/g, "").slice(0, 40);
}
__name(cleanPath, "cleanPath");
async function getDisguiseConfig(env2, db) {
  try {
    if (env2.PANEL_RECOVERY === "1" || env2.PANEL_RECOVERY === "true") {
      return { ...EMPTY_DISGUISE };
    }
    const rows = await db.prepare("SELECT k, v FROM kvstore WHERE k LIKE ?").bind("disguise.%").all();
    const settings = {};
    for (const row of rows.results) {
      settings[row.k] = row.v;
    }
    const enabled = settings["disguise.enabled"] === "true";
    const adminPath = cleanPath(env2.ADMIN_PATH) || cleanPath(settings["disguise.admin_path"]);
    const loginPath = cleanPath(env2.LOGIN_PATH) || cleanPath(settings["disguise.login_path"]);
    const subPath = cleanPath(env2.SUB_PATH) || cleanPath(settings["disguise.sub_path"]);
    const on2 = (enabled || !!(env2.ADMIN_PATH || env2.LOGIN_PATH || env2.SUB_PATH)) && !!(adminPath || loginPath || subPath);
    if (!on2) {
      return { ...EMPTY_DISGUISE, fallbackPage: settings["disguise.fallback_page"] || "1101" };
    }
    return {
      on: true,
      adminPath,
      loginPath,
      subPath,
      pubAdmin: adminPath ? "/" + adminPath : "/admin",
      pubLogin: loginPath ? "/" + loginPath : "/login",
      fallbackPage: env2.DISGUISE_PAGE || settings["disguise.fallback_page"] || "1101"
    };
  } catch {
    return { ...EMPTY_DISGUISE };
  }
}
__name(getDisguiseConfig, "getDisguiseConfig");
function html1101(host) {
  const now = /* @__PURE__ */ new Date();
  const ts = now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0") + "-" + String(now.getDate()).padStart(2, "0") + " " + String(now.getHours()).padStart(2, "0") + ":" + String(now.getMinutes()).padStart(2, "0") + ":" + String(now.getSeconds()).padStart(2, "0");
  const rayId = Array.from(crypto.getRandomValues(new Uint8Array(8))).map((b) => b.toString(16).padStart(2, "0")).join("");
  return `<!DOCTYPE html>
<!--[if lt IE 7]> <html class="no-js ie6 oldie" lang="en-US"> <![endif]-->
<!--[if IE 7]>    <html class="no-js ie7 oldie" lang="en-US"> <![endif]-->
<!--[if IE 8]>    <html class="no-js ie8 oldie" lang="en-US"> <![endif]-->
<!--[if gt IE 8]><!--> <html class="no-js" lang="en-US"> <!--<![endif]-->
<head>
<title>Worker threw exception | ${host} | Cloudflare</title>
<meta charset="UTF-8" />
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
<meta http-equiv="X-UA-Compatible" content="IE=Edge" />
<meta name="robots" content="noindex, nofollow" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<link rel="stylesheet" id="cf_styles-css" href="/cdn-cgi/styles/cf.errors.css" />
<!--[if lt IE 9]><link rel="stylesheet" id='cf_styles-ie.css' href="/cdn-cgi/styles/cf.errors.ie.css" /><![endif]-->
<style>body{margin:0;padding:0}</style>

<!--[if gte IE 10]><!-->
<script>
  if (!navigator.cookieEnabled) {
    window.addEventListener('DOMContentLoaded', function () {
      var cookieEl = document.getElementById('cookie-alert');
      cookieEl.style.display = 'block';
    })
  }
<\/script>
<!--<![endif]-->

</head>
<body>
    <div id="cf-wrapper">
        <div class="cf-alert cf-alert-error cf-cookie-error" id="cookie-alert" data-translate="enable_cookies">Please enable cookies.</div>
        <div id="cf-error-details" class="cf-error-details-wrapper">
            <div class="cf-wrapper cf-header cf-error-overview">
                <h1>
                    <span class="cf-error-type" data-translate="error">Error</span>
                    <span class="cf-error-code">1101</span>
                    <small class="heading-ray-id">Ray ID: ${rayId} &bull; ${ts} UTC</small>
                </h1>
                <h2 class="cf-subheadline" data-translate="error_desc">Worker threw exception</h2>
            </div>

            <section></section>

            <div class="cf-section cf-wrapper">
                <div class="cf-columns two">
                    <div class="cf-column">
                        <h2 data-translate="what_happened">What happened?</h2>
                        <p>You've requested a page on a website (${host}) that is on the <a href="https://www.cloudflare.com/5xx-error-landing?utm_source=error_100x" target="_blank">Cloudflare</a> network. An unknown error occurred while rendering the page.</p>
                    </div>

                    <div class="cf-column">
                        <h2 data-translate="what_can_i_do">What can I do?</h2>
                        <p><strong>If you are the owner of this website:</strong><br />refer to <a href="https://developers.cloudflare.com/workers/observability/errors/" target="_blank">Workers - Errors and Exceptions</a> and check Workers Logs for ${host}.</p>
                    </div>
                </div>
            </div>

            <div class="cf-section cf-wrapper">
                <h2 data-translate="more_info">More information</h2>
                <p>If you are the owner of this website, you can check <a href="https://developers.cloudflare.com/workers/observability/errors/" target="_blank">Workers Logs</a> for ${host} to learn more about this error.</p>
            </div>
        </div>
    </div>
</body>
</html>`;
}
__name(html1101, "html1101");
function nginxPage() {
  return `<!DOCTYPE html>
<html>
<head>
<title>Welcome to nginx!</title>
<style>
  body {
    width: 35em;
    margin: 0 auto;
    font-family: Tahoma, Verdana, Arial, sans-serif;
  }
</style>
</head>
<body>
<h1>Welcome to nginx!</h1>
<p>If you see this page, the nginx web server is successfully installed and
working. Further configuration is required.</p>

<p>For online documentation and support please refer to
<a href="http://nginx.org/">nginx.org</a>.<br/>
Commercial support is available at
<a href="http://nginx.com/">nginx.com</a>.</p>

<p><em>Thank you for using nginx.</em></p>
</body>
</html>`;
}
__name(nginxPage, "nginxPage");
function getDecoyResponse(host, pageType) {
  const html = pageType === "1101" ? html1101(host) : nginxPage();
  return new Response(html, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=UTF-8" }
  });
}
__name(getDecoyResponse, "getDecoyResponse");

// worker/proxy/vless.ts
function parseVlessHeader(buffer) {
  const view = new Uint8Array(buffer);
  if (view.length < 22) return null;
  const version2 = view[0];
  if (version2 !== 0) return null;
  const uuidBytes = view.slice(1, 17);
  const uuid = formatUuid(uuidBytes);
  const command = view[18];
  const port = view[19] << 8 | view[20];
  const atype = view[21];
  let address = "";
  let offset = 22;
  switch (atype) {
    case 1:
      if (view.length < offset + 4) return null;
      address = `${view[offset]}.${view[offset + 1]}.${view[offset + 2]}.${view[offset + 3]}`;
      offset += 4;
      break;
    case 2:
      if (view.length < offset + 1) return null;
      const domainLen = view[offset];
      offset += 1;
      if (view.length < offset + domainLen) return null;
      address = new TextDecoder().decode(view.slice(offset, offset + domainLen));
      offset += domainLen;
      break;
    case 3:
      if (view.length < offset + 16) return null;
      const ipv6Parts = [];
      for (let i = 0; i < 8; i++) {
        ipv6Parts.push(
          (view[offset + i * 2] << 8 | view[offset + i * 2 + 1]).toString(16)
        );
      }
      address = ipv6Parts.join(":");
      offset += 16;
      break;
    default:
      return null;
  }
  return { uuid, command, address, port };
}
__name(parseVlessHeader, "parseVlessHeader");
function formatUuid(bytes) {
  const hex = Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32)
  ].join("-");
}
__name(formatUuid, "formatUuid");
function buildVlessResponse() {
  return new Uint8Array([0, 0, 1, 0, 0, 0]);
}
__name(buildVlessResponse, "buildVlessResponse");

// worker/proxy/trojan.ts
function parseTrojanHeader(buffer) {
  const view = new Uint8Array(buffer);
  if (view.length < 62) return null;
  if (view[0] !== 13 || view[1] !== 10) return null;
  const passwordHex = new TextDecoder().decode(view.slice(2, 58));
  if (view[58] !== 13 || view[59] !== 10) return null;
  const command = view[60];
  const atype = view[61];
  let address = "";
  let offset = 62;
  switch (atype) {
    case 1:
      if (view.length < offset + 4) return null;
      address = `${view[offset]}.${view[offset + 1]}.${view[offset + 2]}.${view[offset + 3]}`;
      offset += 4;
      break;
    case 2:
      if (view.length < offset + 1) return null;
      const domainLen = view[offset];
      offset += 1;
      if (view.length < offset + domainLen) return null;
      address = new TextDecoder().decode(view.slice(offset, offset + domainLen));
      offset += domainLen;
      break;
    case 3:
      if (view.length < offset + 16) return null;
      const ipv6Parts = [];
      for (let i = 0; i < 8; i++) {
        ipv6Parts.push(
          (view[offset + i * 2] << 8 | view[offset + i * 2 + 1]).toString(16)
        );
      }
      address = ipv6Parts.join(":");
      offset += 16;
      break;
    default:
      return null;
  }
  if (view.length < offset + 2) return null;
  const port = view[offset] << 8 | view[offset + 1];
  return { password: passwordHex, command, address, port };
}
__name(parseTrojanHeader, "parseTrojanHeader");
function buildTrojanResponse() {
  return new Uint8Array([0, 0, 0, 0, 1, 0, 0]);
}
__name(buildTrojanResponse, "buildTrojanResponse");

// worker/proxy/index.ts
async function handleProxyTraffic(request, env2, _ctx) {
  const url = new URL(request.url);
  const path = url.pathname;
  const config2 = await env2.DB.prepare(
    "SELECT c.*, p.id as proto_id, p.template_json FROM configs c LEFT JOIN protocols p ON c.protocol_id = p.id WHERE c.path = ?"
  ).bind(path).first();
  if (!config2) {
    return new Response("Not found", { status: 404 });
  }
  const user = await env2.DB.prepare(
    "SELECT id, uuid, traffic_limit, traffic_used, status, expiry_date FROM users WHERE id = ?"
  ).bind(config2.user_id).first();
  if (!user || user.status !== "active") {
    return new Response("Forbidden", { status: 403 });
  }
  if (user.traffic_limit > 0 && user.traffic_used >= user.traffic_limit) {
    return new Response("Quota exceeded", { status: 403 });
  }
  if (user.expiry_date && new Date(user.expiry_date) < /* @__PURE__ */ new Date()) {
    return new Response("Subscription expired", { status: 403 });
  }
  const upgradeHeader = request.headers.get("Upgrade");
  if (upgradeHeader !== "websocket") {
    return new Response("Expected WebSocket upgrade", { status: 426 });
  }
  const [clientWs, serverWs] = Object.values(new WebSocketPair());
  const protocol = config2.protocol_id;
  serverWs.accept();
  handleWebSocketConnection(
    serverWs,
    protocol,
    config2,
    user,
    env2.DB
  ).catch((err) => {
    console.error("WebSocket error:", err);
    try {
      serverWs.close(1011, "Internal error");
    } catch {
    }
  });
  return new Response(null, {
    status: 101,
    webSocket: clientWs
  });
}
__name(handleProxyTraffic, "handleProxyTraffic");
async function handleWebSocketConnection(ws, protocol, config2, user, db) {
  let totalUpload = 0;
  let totalDownload = 0;
  const firstMessage = await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("Timeout")), 1e4);
    ws.addEventListener(
      "message",
      (event) => {
        clearTimeout(timeout);
        if (event.data instanceof ArrayBuffer) {
          resolve(event.data);
        } else if (event.data instanceof Blob) {
          event.data.arrayBuffer().then(resolve);
        } else {
          resolve(new TextEncoder().encode(String(event.data)).buffer);
        }
      },
      { once: true }
    );
    ws.addEventListener("close", () => {
      clearTimeout(timeout);
      reject(new Error("Closed"));
    });
  });
  totalUpload += firstMessage.byteLength;
  let targetHost = "";
  let targetPort = 0;
  if (protocol === "vless-reality" || protocol === "vless-ws") {
    const parsed = parseVlessHeader(firstMessage);
    if (!parsed) {
      ws.close(1008, "Invalid VLESS header");
      return;
    }
    targetHost = parsed.address;
    targetPort = parsed.port;
    ws.send(buildVlessResponse());
  } else if (protocol === "trojan-ws") {
    const parsed = parseTrojanHeader(firstMessage);
    if (!parsed) {
      ws.close(1008, "Invalid Trojan header");
      return;
    }
    targetHost = parsed.address;
    targetPort = parsed.port;
    ws.send(buildTrojanResponse());
  } else {
    const settings = JSON.parse(config2.settings_json || "{}");
    targetHost = settings.host || settings.sni || "example.com";
    targetPort = settings.port || 443;
  }
  try {
    const targetUrl = `wss://${targetHost}:${targetPort}`;
    const targetWs = new WebSocket(targetUrl);
    await new Promise((resolve, reject) => {
      targetWs.addEventListener("open", () => resolve(), { once: true });
      targetWs.addEventListener("error", (e) => reject(e), { once: true });
      setTimeout(() => reject(new Error("Target connection timeout")), 1e4);
    });
    ws.addEventListener("message", async (event) => {
      const data = event.data instanceof ArrayBuffer ? event.data : event.data instanceof Blob ? await event.data.arrayBuffer() : new TextEncoder().encode(String(event.data)).buffer;
      totalUpload += data.byteLength;
      targetWs.send(data);
    });
    targetWs.addEventListener("message", async (event) => {
      const data = event.data instanceof ArrayBuffer ? event.data : event.data instanceof Blob ? await event.data.arrayBuffer() : new TextEncoder().encode(String(event.data)).buffer;
      totalDownload += data.byteLength;
      ws.send(data);
    });
    ws.addEventListener("close", () => {
      targetWs.close();
    });
    targetWs.addEventListener("close", () => {
      ws.close();
    });
  } catch (err) {
    console.log(`Target ${targetHost}:${targetPort} not reachable, keeping proxy alive`);
  }
  ws.addEventListener("close", async () => {
    try {
      await db.prepare(
        "UPDATE users SET traffic_used = traffic_used + ? WHERE id = ?"
      ).bind(totalUpload + totalDownload, user.id).run();
    } catch (err) {
      console.error("Failed to update traffic:", err);
    }
  });
}
__name(handleWebSocketConnection, "handleWebSocketConnection");

// worker/processors/proxy.ts
var proxyProcessor = /* @__PURE__ */ __name(async (intent, request, env2, ctx) => {
  if (intent.type !== "proxy") return null;
  const pausedRow = await env2.DB.prepare(
    "SELECT v FROM kvstore WHERE k = ?"
  ).bind("panel.paused").first();
  if (pausedRow?.v === "true") {
    return new Response("Service paused", { status: 503 });
  }
  const capRow = await env2.DB.prepare(
    "SELECT v FROM kvstore WHERE k = ?"
  ).bind("panel.monthly_cap_gb").first();
  const capGB = Number(capRow?.v || 0);
  if (capGB > 0) {
    const trafficRow = await env2.DB.prepare(
      "SELECT SUM(traffic_used) as total FROM users"
    ).first();
    const usedBytes = trafficRow?.total || 0;
    if (usedBytes >= capGB * 1073741824) {
      return new Response("Monthly data cap reached", { status: 503 });
    }
  }
  return handleProxyTraffic(request, env2, ctx);
}, "proxyProcessor");

// worker/auth.ts
var SESSION_TTL = 7 * 24 * 60 * 60 * 1e3;
var LOGIN_RATE_LIMIT = 5;
var LOGIN_RATE_WINDOW = 6e4;
async function checkLoginRateLimit(db, ip) {
  const key = `ratelimit:login:${ip}`;
  const row = await db.prepare("SELECT v, updated FROM kvstore WHERE k = ?").bind(key).first();
  if (!row) return true;
  const data = JSON.parse(row.v || '{"count":0,"first":0}');
  const now = Date.now();
  if (now - data.first > LOGIN_RATE_WINDOW) {
    await db.prepare("DELETE FROM kvstore WHERE k = ?").bind(key).run();
    return true;
  }
  return data.count < LOGIN_RATE_LIMIT;
}
__name(checkLoginRateLimit, "checkLoginRateLimit");
async function recordLoginAttempt(db, ip) {
  const key = `ratelimit:login:${ip}`;
  const row = await db.prepare("SELECT v FROM kvstore WHERE k = ?").bind(key).first();
  const now = Date.now();
  let data = { count: 1, first: now };
  if (row) {
    const prev = JSON.parse(row.v || '{"count":0,"first":0}');
    if (now - prev.first > LOGIN_RATE_WINDOW) {
      data = { count: 1, first: now };
    } else {
      data = { count: prev.count + 1, first: prev.first };
    }
  }
  await db.prepare("INSERT OR REPLACE INTO kvstore (k, v, updated) VALUES (?, ?, ?)").bind(key, JSON.stringify(data), now).run();
}
__name(recordLoginAttempt, "recordLoginAttempt");
async function hashPassword2(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}
__name(hashPassword2, "hashPassword");
async function verifyPassword(password, hash) {
  const computed = await hashPassword2(password);
  return computed === hash;
}
__name(verifyPassword, "verifyPassword");
function generateSessionToken() {
  return crypto.randomUUID();
}
__name(generateSessionToken, "generateSessionToken");
async function createSession(db, userId, role) {
  const token = generateSessionToken();
  const sessionData = JSON.stringify({
    userId,
    role,
    created: Date.now()
  });
  await db.prepare("INSERT OR REPLACE INTO kvstore (k, v, updated) VALUES (?, ?, ?)").bind(`session:${token}`, sessionData, Date.now()).run();
  return token;
}
__name(createSession, "createSession");
async function getSession(db, token) {
  const row = await db.prepare("SELECT v FROM kvstore WHERE k = ?").bind(`session:${token}`).first();
  if (!row) return null;
  try {
    const data = JSON.parse(row.v);
    if (Date.now() - data.created > SESSION_TTL) {
      await db.prepare("DELETE FROM kvstore WHERE k = ?").bind(`session:${token}`).run();
      return null;
    }
    return { userId: data.userId, role: data.role };
  } catch {
    return null;
  }
}
__name(getSession, "getSession");
async function deleteSession(db, token) {
  await db.prepare("DELETE FROM kvstore WHERE k = ?").bind(`session:${token}`).run();
}
__name(deleteSession, "deleteSession");
function extractSessionToken(request) {
  const cookieHeader = request.headers.get("Cookie");
  if (!cookieHeader) return null;
  const match = cookieHeader.match(/session=([^;]+)/);
  return match ? match[1] : null;
}
__name(extractSessionToken, "extractSessionToken");
function setSessionCookie(token, maxAge = SESSION_TTL / 1e3) {
  return `session=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}`;
}
__name(setSessionCookie, "setSessionCookie");
function clearSessionCookie() {
  return "session=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0";
}
__name(clearSessionCookie, "clearSessionCookie");
async function authenticateRequest(request, db) {
  const token = extractSessionToken(request);
  if (!token) return null;
  return getSession(db, token);
}
__name(authenticateRequest, "authenticateRequest");
async function requireAuth(request, db) {
  const session = await authenticateRequest(request, db);
  if (!session) {
    throw new Response(
      JSON.stringify({ success: false, message: "Unauthorized" }),
      {
        status: 401,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
  return session;
}
__name(requireAuth, "requireAuth");
async function requireAdmin(request, db) {
  const session = await requireAuth(request, db);
  if (session.role !== "admin") {
    throw new Response(
      JSON.stringify({ success: false, message: "Forbidden" }),
      {
        status: 403,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
  return session;
}
__name(requireAdmin, "requireAdmin");

// worker/api/login.ts
function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...headers }
  });
}
__name(json, "json");
async function handleLogin(request, env2, _ctx, _params) {
  if (request.method !== "POST") {
    return json({ success: false, message: "Method not allowed" }, 405);
  }
  const clientIP = request.headers.get("CF-Connecting-IP") || request.headers.get("X-Forwarded-For") || "unknown";
  const allowed = await checkLoginRateLimit(env2.DB, clientIP);
  if (!allowed) {
    return json({ success: false, message: "Too many attempts, try again later" }, 429);
  }
  try {
    const { username, password } = await request.json();
    if (!username || !password) {
      return json({ success: false, message: "Username and password required" }, 400);
    }
    const user = await env2.DB.prepare(
      "SELECT id, username, password_hash, role, email FROM users WHERE username = ?"
    ).bind(username).first();
    if (!user) {
      await recordLoginAttempt(env2.DB, clientIP);
      return json({ success: false, message: "Invalid credentials" }, 401);
    }
    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) {
      await recordLoginAttempt(env2.DB, clientIP);
      return json({ success: false, message: "Invalid credentials" }, 401);
    }
    const sessionToken = await createSession(env2.DB, user.id, user.role);
    const firstLoginRow = await env2.DB.prepare("SELECT v FROM kvstore WHERE k = ?").bind("panel.first_login_done").first();
    const isFirstLogin = !firstLoginRow?.v || firstLoginRow.v !== "true";
    let initialConfig = null;
    if (isFirstLogin && user.role === "admin") {
      const url = new URL(request.url);
      const accessUUID = await env2.DB.prepare("SELECT v FROM kvstore WHERE k = ?").bind("panel.access_uuid").first();
      const adminUser = await env2.DB.prepare("SELECT uuid FROM users WHERE role = ?").bind("admin").first();
      initialConfig = {
        panelUrl: `${url.protocol}//${url.host}/${accessUUID?.v || ""}`,
        subscriptionUrl: `${url.protocol}//${url.host}/sub/${adminUser?.uuid || ""}`,
        adminUuid: adminUser?.uuid || "",
        accessUuid: accessUUID?.v || "",
        instructions: [
          "Save your Panel URL \u2014 this is the only way to access your panel",
          "Share the Subscription URL with clients to connect",
          "Install a client app (V2RayNG, sing-box, Clash) and import the subscription",
          "Go to Settings to configure protocols, ECH, clean IPs, and Telegram bot"
        ]
      };
      await env2.DB.prepare("INSERT OR REPLACE INTO kvstore (k, v, updated) VALUES (?, ?, ?)").bind("panel.first_login_done", "true", Date.now()).run();
    }
    return json(
      {
        success: true,
        role: user.role,
        user: {
          id: user.id,
          username: user.username,
          email: user.email
        },
        ...initialConfig ? { initialConfig } : {}
      },
      200,
      { "Set-Cookie": setSessionCookie(sessionToken) }
    );
  } catch (e) {
    return json({ success: false, message: "Invalid request body" }, 400);
  }
}
__name(handleLogin, "handleLogin");

// worker/api/logout.ts
async function handleLogout(request, env2, _ctx, _params) {
  const token = extractSessionToken(request);
  if (token) {
    await deleteSession(env2.DB, token);
  }
  return new Response(
    JSON.stringify({ success: true, message: "Logged out" }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Set-Cookie": clearSessionCookie()
      }
    }
  );
}
__name(handleLogout, "handleLogout");

// worker/api/health.ts
function json2(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}
__name(json2, "json");
async function handleHealth(_request, env2, _ctx, _params) {
  try {
    const result = await env2.DB.prepare("SELECT 1 as ok").first();
    const dbOk = result !== null;
    return json2({
      status: "ok",
      service: "xraymod",
      database: dbOk ? "connected" : "disconnected",
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
  } catch (e) {
    return json2({
      status: "error",
      service: "xraymod",
      database: "error",
      error: e instanceof Error ? e.message : "Unknown error"
    }, 500);
  }
}
__name(handleHealth, "handleHealth");

// worker/api/nodes.ts
function json3(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}
__name(json3, "json");
async function handleNodes(request, env2, _ctx, params) {
  try {
    await requireAdmin(request, env2.DB);
  } catch (e) {
    if (e instanceof Response) return e;
    return json3({ success: false, message: "Unauthorized" }, 401);
  }
  if (request.method === "GET") {
    const nodes = await env2.DB.prepare("SELECT * FROM kvstore WHERE k LIKE ?").bind("node:%").all();
    const parsed = nodes.results.map((n) => {
      const data = JSON.parse(n.v);
      return { id: n.k.replace("node:", ""), ...data };
    });
    if (parsed.length === 0) {
      return json3({
        success: true,
        data: [
          { id: "1", name: "Germany - Frankfurt", ip: "1.2.3.4", status: "online", cpu: 12, ram: 45, users: 42, uptime: "14d 2h" },
          { id: "2", name: "Iran - Tehran (Bridge)", ip: "5.6.7.8", status: "online", cpu: 5, ram: 20, users: 12, uptime: "5d 12h" },
          { id: "3", name: "Netherlands - Amsterdam", ip: "9.10.11.12", status: "offline", cpu: 0, ram: 0, users: 0, uptime: "0" }
        ]
      });
    }
    return json3({ success: true, data: parsed });
  }
  if (request.method === "POST") {
    const body = await request.json();
    const id = String(Date.now());
    const nodeData = {
      name: body.name || "New Server",
      ip: body.ip || "0.0.0.0",
      status: "online",
      cpu: 0,
      ram: 0,
      users: 0,
      uptime: "0m"
    };
    await env2.DB.prepare("INSERT OR REPLACE INTO kvstore (k, v, updated) VALUES (?, ?, ?)").bind(`node:${id}`, JSON.stringify(nodeData), Date.now()).run();
    return json3({ success: true, data: { id, ...nodeData } }, 201);
  }
  if (request.method === "DELETE" && params.id) {
    await env2.DB.prepare("DELETE FROM kvstore WHERE k = ?").bind(`node:${params.id}`).run();
    return json3({ success: true });
  }
  return json3({ success: false, message: "Method not allowed" }, 405);
}
__name(handleNodes, "handleNodes");

// worker/api/users.ts
function json4(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}
__name(json4, "json");
async function handleUsers(request, env2, _ctx, params) {
  try {
    await requireAdmin(request, env2.DB);
  } catch (e) {
    if (e instanceof Response) return e;
    return json4({ success: false, message: "Unauthorized" }, 401);
  }
  if (request.method === "GET") {
    const users = await env2.DB.prepare(
      "SELECT id, username, role, uuid, email, traffic_limit, traffic_used, expiry_date, status, created_at FROM users"
    ).all();
    return json4({
      success: true,
      data: users.results.map((u) => ({
        id: u.id,
        username: u.username,
        email: u.email,
        used: Math.round(u.traffic_used / (1024 * 1024 * 1024) * 10) / 10,
        limit: Math.round(u.traffic_limit / (1024 * 1024 * 1024) * 10) / 10,
        status: u.status,
        expiry: u.expiry_date,
        role: u.role
      }))
    });
  }
  if (request.method === "POST") {
    const body = await request.json();
    if (!body.username) {
      return json4({ success: false, message: "Username required" }, 400);
    }
    const password = crypto.randomUUID().slice(0, 12);
    const passwordHash = await hashPassword2(password);
    const uuid = crypto.randomUUID();
    const limitBytes = (body.limit || 100) * 1024 * 1024 * 1024;
    const expiryDate = new Date(
      Date.now() + (body.expiryDays || 30) * 24 * 60 * 60 * 1e3
    ).toISOString().split("T")[0];
    const result = await env2.DB.prepare(
      `INSERT INTO users (username, password_hash, role, uuid, email, traffic_limit, expiry_date, status, created_at)
       VALUES (?, ?, 'user', ?, ?, ?, ?, 'active', ?)`
    ).bind(
      body.username,
      passwordHash,
      uuid,
      body.email || "",
      limitBytes,
      expiryDate,
      Date.now()
    ).run();
    return json4(
      {
        success: true,
        data: {
          id: result.meta.last_row_id,
          username: body.username,
          password,
          uuid
        }
      },
      201
    );
  }
  if ((request.method === "PUT" || request.method === "PATCH") && params.id) {
    const body = await request.json();
    const userId = Number(params.id);
    const updates = [];
    const values = [];
    if (body.limit !== void 0) {
      updates.push("traffic_limit = ?");
      values.push(body.limit * 1024 * 1024 * 1024);
    }
    if (body.expiry !== void 0) {
      updates.push("expiry_date = ?");
      values.push(body.expiry);
    }
    if (body.status !== void 0) {
      updates.push("status = ?");
      values.push(body.status);
    }
    if (body.used !== void 0) {
      updates.push("traffic_used = ?");
      values.push(body.used * 1024 * 1024 * 1024);
    }
    if (updates.length === 0) {
      return json4({ success: false, message: "No updates provided" }, 400);
    }
    values.push(userId);
    await env2.DB.prepare(`UPDATE users SET ${updates.join(", ")} WHERE id = ?`).bind(...values).run();
    return json4({ success: true });
  }
  return json4({ success: false, message: "Method not allowed" }, 405);
}
__name(handleUsers, "handleUsers");

// worker/api/protocols.ts
function json5(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}
__name(json5, "json");
async function handleProtocols(request, env2, _ctx, _params) {
  try {
    await requireAdmin(request, env2.DB);
  } catch (e) {
    if (e instanceof Response) return e;
    return json5({ success: false, message: "Unauthorized" }, 401);
  }
  if (request.method === "GET") {
    const protocols = await env2.DB.prepare("SELECT * FROM protocols").all();
    return json5({
      success: true,
      data: protocols.results.map((p) => ({
        id: p.id,
        name: p.name,
        schema: JSON.parse(p.schema_json),
        template: p.template_json,
        price: p.price,
        clientLimit: p.client_limit,
        clientPrice: p.client_price
      }))
    });
  }
  if (request.method === "POST") {
    const body = await request.json();
    if (!body.id || !body.name) {
      return json5({ success: false, message: "id and name required" }, 400);
    }
    await env2.DB.prepare(
      `INSERT OR REPLACE INTO protocols (id, name, schema_json, template_json, price, client_limit, client_price)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      body.id,
      body.name,
      typeof body.schema === "string" ? body.schema : JSON.stringify(body.schema),
      typeof body.template === "string" ? body.template : JSON.stringify(body.template),
      body.price || 0,
      body.clientLimit || 1,
      body.clientPrice || 0
    ).run();
    return json5({ success: true }, 201);
  }
  return json5({ success: false, message: "Method not allowed" }, 405);
}
__name(handleProtocols, "handleProtocols");

// worker/api/configs.ts
function json6(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}
__name(json6, "json");
async function handleConfigs(request, env2, _ctx, params) {
  try {
    await requireAdmin(request, env2.DB);
  } catch (e) {
    if (e instanceof Response) return e;
    return json6({ success: false, message: "Unauthorized" }, 401);
  }
  if (request.method === "GET") {
    const configs = await env2.DB.prepare(
      `SELECT c.*, u.username FROM configs c
       LEFT JOIN users u ON c.user_id = u.id`
    ).all();
    return json6({
      success: true,
      data: configs.results.map((c) => ({
        id: c.id,
        userId: c.user_id,
        username: c.username,
        protocolId: c.protocol_id,
        name: c.name,
        settings: JSON.parse(c.settings_json || "{}"),
        port: c.port,
        path: c.path,
        link: c.link,
        nodeIp: c.node_ip,
        clientLimit: c.client_limit,
        createdAt: c.created_at
      }))
    });
  }
  if (request.method === "POST") {
    const body = await request.json();
    if (!body.userId || !body.protocolId) {
      return json6({ success: false, message: "userId and protocolId required" }, 400);
    }
    const protocol = await env2.DB.prepare("SELECT * FROM protocols WHERE id = ?").bind(body.protocolId).first();
    if (!protocol) {
      return json6({ success: false, message: "Protocol not found" }, 404);
    }
    const user = await env2.DB.prepare("SELECT uuid FROM users WHERE id = ?").bind(body.userId).first();
    if (!user) {
      return json6({ success: false, message: "User not found" }, 404);
    }
    const configPath = `/proxy/${crypto.randomUUID().slice(0, 8)}`;
    const port = body.settings.port || 443;
    let template = protocol.template_json;
    const templateData = { ...body.settings, uuid: user.uuid };
    for (const [key, value] of Object.entries(templateData)) {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, "g");
      template = template.replace(regex, String(value));
    }
    const link = `${body.protocolId}://${btoa(template)}@server.com:${port}?#${body.name || "Config"}`;
    const result = await env2.DB.prepare(
      `INSERT INTO configs (user_id, protocol_id, name, settings_json, port, path, link, node_ip, client_limit, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      body.userId,
      body.protocolId,
      body.name || "Config",
      JSON.stringify(body.settings),
      port,
      configPath,
      link,
      body.settings.host || "",
      body.clientLimit || 1,
      Date.now()
    ).run();
    return json6(
      {
        success: true,
        data: {
          id: result.meta.last_row_id,
          name: body.name,
          protocolId: body.protocolId,
          link,
          path: configPath
        }
      },
      201
    );
  }
  if (request.method === "DELETE" && params.id) {
    await env2.DB.prepare("DELETE FROM configs WHERE id = ?").bind(Number(params.id)).run();
    return json6({ success: true });
  }
  return json6({ success: false, message: "Method not allowed" }, 405);
}
__name(handleConfigs, "handleConfigs");

// worker/api/settings.ts
function json7(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}
__name(json7, "json");
async function handleSettings(request, env2, _ctx, _params) {
  try {
    await requireAdmin(request, env2.DB);
  } catch (e) {
    if (e instanceof Response) return e;
    return json7({ success: false, message: "Unauthorized" }, 401);
  }
  if (request.method === "GET") {
    const rows = await env2.DB.prepare(
      "SELECT k, v FROM kvstore WHERE k LIKE ?"
    ).bind("panel.%").all();
    const rows2 = await env2.DB.prepare(
      "SELECT k, v FROM kvstore WHERE k LIKE ?"
    ).bind("financial.%").all();
    const rows3 = await env2.DB.prepare(
      "SELECT k, v FROM kvstore WHERE k LIKE ?"
    ).bind("integrations.%").all();
    const rows4 = await env2.DB.prepare(
      "SELECT k, v FROM kvstore WHERE k LIKE ?"
    ).bind("disguise.%").all();
    const rows5 = await env2.DB.prepare(
      "SELECT k, v FROM kvstore WHERE k LIKE ?"
    ).bind("ech.%").all();
    const rows6 = await env2.DB.prepare(
      "SELECT k, v FROM kvstore WHERE k LIKE ?"
    ).bind("tls_fragment.%").all();
    const rows7 = await env2.DB.prepare(
      "SELECT k, v FROM kvstore WHERE k LIKE ?"
    ).bind("tg.%").all();
    const rows8 = await env2.DB.prepare(
      "SELECT k, v FROM kvstore WHERE k LIKE ?"
    ).bind("wizard.%").all();
    const all = [...rows.results, ...rows2.results, ...rows3.results, ...rows4.results, ...rows5.results, ...rows6.results, ...rows7.results, ...rows8.results];
    const settings = {};
    for (const row of all) {
      settings[row.k] = row.v;
    }
    return json7({ success: true, data: settings });
  }
  if (request.method === "PUT" || request.method === "PATCH") {
    const body = await request.json();
    for (const [k, v] of Object.entries(body)) {
      await env2.DB.prepare(
        "INSERT OR REPLACE INTO kvstore (k, v, updated) VALUES (?, ?, ?)"
      ).bind(k, String(v), Date.now()).run();
    }
    return json7({ success: true });
  }
  return json7({ success: false, message: "Method not allowed" }, 405);
}
__name(handleSettings, "handleSettings");

// worker/utils.ts
function detectIranianISP(request) {
  const cf = request.cf || {};
  const org = String(cf.asOrganization || "").toLowerCase();
  const asn = Number(cf.asn || 0);
  const country = String(cf.country || "").toUpperCase();
  if (country !== "IR") return "all";
  if (asn === 44244 || org.includes("irancell") || org.includes("mtn")) return "mtn";
  if (asn === 197207 || org.includes("mcci") || org.includes("hamrah")) return "mci";
  if (asn === 57218 || org.includes("rightel")) return "rightel";
  if (asn === 31549 || org.includes("shatel")) return "shatel";
  return "ir";
}
__name(detectIranianISP, "detectIranianISP");
function getISPInfo(request) {
  const cf = request.cf || {};
  return {
    asn: cf.asn || 0,
    isp: cf.asOrganization || "",
    country: cf.country || "",
    carrier: detectIranianISP(request)
  };
}
__name(getISPInfo, "getISPInfo");
var CIDR_LISTS = {};
var CF_CIDR_URLS = {
  all: "https://raw.githubusercontent.com/Leon406/SubCrawler/master/sub/cf/cloudflare_v4.txt",
  mtn: "https://raw.githubusercontent.com/Leon406/SubCrawler/master/sub/cf/cloudflare_v4.txt",
  mci: "https://raw.githubusercontent.com/Leon406/SubCrawler/master/sub/cf/cloudflare_v4.txt",
  rightel: "https://raw.githubusercontent.com/Leon406/SubCrawler/master/sub/cf/cloudflare_v4.txt",
  shatel: "https://raw.githubusercontent.com/Leon406/SubCrawler/master/sub/cf/cloudflare_v4.txt",
  ir: "https://raw.githubusercontent.com/Leon406/SubCrawler/master/sub/cf/cloudflare_v4.txt"
};
var CF_PORTS = [443, 2053, 2083, 2087, 2096, 8443];
function ipToInt(ip) {
  const parts = ip.split(".").map(Number);
  return (parts[0] << 24 >>> 0) + (parts[1] << 16) + (parts[2] << 8) + parts[3];
}
__name(ipToInt, "ipToInt");
function intToIp(n) {
  return [n >>> 24 & 255, n >>> 16 & 255, n >>> 8 & 255, n & 255].join(".");
}
__name(intToIp, "intToIp");
function randomIPFromCIDR(cidr) {
  const [base, prefixStr] = cidr.split("/");
  const prefix = parseInt(prefixStr);
  const hostBits = 32 - prefix;
  const ipInt = ipToInt(base);
  const mask = 4294967295 << hostBits >>> 0;
  const randomOffset = Math.floor(Math.random() * Math.pow(2, hostBits));
  return intToIp(((ipInt & mask) >>> 0) + randomOffset);
}
__name(randomIPFromCIDR, "randomIPFromCIDR");
async function fetchCIDRList(carrier) {
  const now = Date.now();
  const cached = CIDR_LISTS[carrier];
  if (cached && now - cached.at < 36e5) return cached.list;
  const url = CF_CIDR_URLS[carrier] || CF_CIDR_URLS.all;
  try {
    const r = await fetch(url, {
      headers: { "User-Agent": "XRayMOD" },
      cf: { cacheTtl: 1800, cacheEverything: true }
    });
    if (!r.ok) return ["104.16.0.0/13"];
    const text2 = await r.text();
    const list = text2.split(/[\r\n,;]+/).map((s) => s.trim()).filter((s) => s && /^\d+\.\d+\.\d+\.\d+\/\d+$/.test(s));
    CIDR_LISTS[carrier] = { at: now, list: list.length ? list : ["104.16.0.0/13"] };
    return CIDR_LISTS[carrier].list;
  } catch {
    return ["104.16.0.0/13"];
  }
}
__name(fetchCIDRList, "fetchCIDRList");
async function generateRandomIPs(request, count3 = 16, port = -1) {
  const carrier = detectIranianISP(request);
  const cidrList = await fetchCIDRList(carrier);
  return Array.from({ length: count3 }, () => {
    const ip = randomIPFromCIDR(cidrList[Math.floor(Math.random() * cidrList.length)]);
    const targetPort = port === -1 ? CF_PORTS[Math.floor(Math.random() * CF_PORTS.length)] : port;
    return `${ip}:${targetPort}`;
  });
}
__name(generateRandomIPs, "generateRandomIPs");
async function getCleanIPs(db) {
  try {
    const row = await db.prepare("SELECT v FROM kvstore WHERE k = ?").bind("cleanip.ips").first();
    if (!row || !row.v) return [];
    return row.v.split("\n").map((s) => s.trim()).filter(Boolean);
  } catch {
    return [];
  }
}
__name(getCleanIPs, "getCleanIPs");
async function setCleanIPs(db, ips) {
  const unique = [...new Set(ips)].slice(0, 30);
  await db.prepare("INSERT OR REPLACE INTO kvstore (k, v, updated) VALUES (?, ?, ?)").bind("cleanip.ips", unique.join("\n"), Date.now()).run();
}
__name(setCleanIPs, "setCleanIPs");
async function getCleanIPConfig(db) {
  try {
    const row = await db.prepare("SELECT v, updated FROM kvstore WHERE k = ?").bind("cleanip.ips").first();
    const carrierRow = await db.prepare("SELECT v FROM kvstore WHERE k = ?").bind("cleanip.carrier").first();
    return {
      ips: row ? row.v.split("\n").map((s) => s.trim()).filter(Boolean) : [],
      carrier: carrierRow?.v || "unknown",
      updatedAt: row?.updated || 0
    };
  } catch {
    return { ips: [], carrier: "unknown", updatedAt: 0 };
  }
}
__name(getCleanIPConfig, "getCleanIPConfig");
function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}
__name(jsonResponse, "jsonResponse");

// worker/api/cleanip.ts
async function handleCleanIP(request, env2, _ctx, params) {
  const action = params.action;
  if (action === "scan" && request.method === "GET") {
    const url = new URL(request.url);
    const count3 = Math.min(parseInt(url.searchParams.get("count") || "16"), 32);
    const port = parseInt(url.searchParams.get("port") || "-1");
    const ips = await generateRandomIPs(request, count3, port);
    const ispInfo = getISPInfo(request);
    return jsonResponse({ success: true, data: { ips, isp: ispInfo } });
  }
  if (action === "apply" && request.method === "POST") {
    try {
      await requireAdmin(request, env2.DB);
    } catch (e) {
      if (e instanceof Response) return e;
      return jsonResponse({ success: false, message: "Unauthorized" }, 401);
    }
    try {
      const body = await request.json();
      const ips = body.ips || [];
      if (!ips.length) {
        return jsonResponse({ success: false, message: "No IPs provided" }, 400);
      }
      const validIPs = ips.filter((ip) => /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}(:\d{1,5})?$/.test(ip.trim()));
      if (!validIPs.length) {
        return jsonResponse({ success: false, message: "Invalid IP format" }, 400);
      }
      await setCleanIPs(env2.DB, validIPs);
      const carrier = detectIranianISP(request);
      await env2.DB.prepare("INSERT OR REPLACE INTO kvstore (k, v, updated) VALUES (?, ?, ?)").bind("cleanip.carrier", carrier, Date.now()).run();
      return jsonResponse({ success: true, data: { count: validIPs.length, carrier } });
    } catch {
      return jsonResponse({ success: false, message: "Invalid request" }, 400);
    }
  }
  if (action === "list" && request.method === "GET") {
    try {
      await requireAdmin(request, env2.DB);
    } catch (e) {
      if (e instanceof Response) return e;
      return jsonResponse({ success: false, message: "Unauthorized" }, 401);
    }
    const config2 = await getCleanIPConfig(env2.DB);
    return jsonResponse({ success: true, data: config2 });
  }
  if (!action || action === "") {
    if (request.method === "GET") {
      const ispInfo = getISPInfo(request);
      const ips = await getCleanIPs(env2.DB);
      return jsonResponse({ success: true, data: { isp: ispInfo, activeIPs: ips.length } });
    }
  }
  return jsonResponse({ success: false, message: "Not found" }, 404);
}
__name(handleCleanIP, "handleCleanIP");

// worker/api/backends.ts
function json8(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}
__name(json8, "json");
async function handleBackends(request, env2, _ctx, params) {
  try {
    await requireAdmin(request, env2.DB);
  } catch (e) {
    if (e instanceof Response) return e;
    return json8({ success: false, message: "Unauthorized" }, 401);
  }
  if (request.method === "GET") {
    const rows = await env2.DB.prepare("SELECT * FROM backends ORDER BY created_at DESC").all();
    return json8({ success: true, data: rows.results });
  }
  if (request.method === "POST") {
    const body = await request.json();
    if (!body.vps_ip) {
      return json8({ success: false, message: "VPS IP is required" }, 400);
    }
    if (!/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(body.vps_ip)) {
      return json8({ success: false, message: "Invalid IP format" }, 400);
    }
    const port = body.vps_port || 443;
    const adminRow = await env2.DB.prepare("SELECT id FROM users WHERE role = ?").bind("admin").first();
    const userId = body.user_id || adminRow?.id || 1;
    const userRow = await env2.DB.prepare("SELECT uuid FROM users WHERE id = ?").bind(userId).first();
    await env2.DB.prepare(
      "INSERT INTO backends (user_id, vps_ip, vps_port, vps_uuid, status, created_at) VALUES (?, ?, ?, ?, ?, ?)"
    ).bind(userId, body.vps_ip, port, userRow?.uuid || "", "active", Date.now()).run();
    return json8({ success: true, message: "Backend registered" });
  }
  if (request.method === "DELETE") {
    const id = params.id;
    if (!id) return json8({ success: false, message: "ID required" }, 400);
    await env2.DB.prepare("DELETE FROM backends WHERE id = ?").bind(Number(id)).run();
    return json8({ success: true, message: "Backend removed" });
  }
  return json8({ success: false, message: "Method not allowed" }, 405);
}
__name(handleBackends, "handleBackends");

// worker/api/wizard.ts
function json9(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}
__name(json9, "json");
var CF_API = "https://api.cloudflare.com/client/v4";
async function cfCall(token, path, method = "GET", body) {
  const headers = {
    "Authorization": `Bearer ${token}`,
    "Accept": "application/json"
  };
  const opts = { method, headers };
  if (body) {
    headers["Content-Type"] = "application/json";
    opts.body = JSON.stringify(body);
  }
  const r = await fetch(`${CF_API}${path}`, opts);
  const data = await r.json();
  if (!data.success) {
    const errors = (data.errors || []).map((e) => e.message || JSON.stringify(e)).join("; ");
    throw new Error(errors || "Cloudflare API failed");
  }
  return data.result;
}
__name(cfCall, "cfCall");
async function handleWizard(request, env2, _ctx, params) {
  if (request.method === "GET") {
    const wizardKey = await env2.DB.prepare("SELECT v FROM kvstore WHERE k = ?").bind("wizard.api_key").first();
    return json9({
      success: true,
      data: {
        configured: !!wizardKey?.v,
        hasApiKey: !!wizardKey?.v
      }
    });
  }
  if (request.method === "POST" && params.action === "setup") {
    const authHeader = request.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    try {
      const accounts = await cfCall(token, "/accounts?per_page=1");
      if (!accounts.length) throw new Error("No accounts found");
      await env2.DB.prepare("INSERT OR REPLACE INTO kvstore (k, v, updated) VALUES (?, ?, ?)").bind("wizard.api_key", token, Date.now()).run();
      return json9({
        success: true,
        data: {
          accountName: accounts[0].name,
          accountId: accounts[0].id
        }
      });
    } catch (e) {
      return json9({ success: false, message: e.message || "Invalid API key" }, 400);
    }
  }
  if (request.method === "POST" && params.action === "deploy") {
    try {
      const body = await request.json();
      const savedKey = await env2.DB.prepare("SELECT v FROM kvstore WHERE k = ?").bind("wizard.api_key").first();
      const cfToken = body.cfToken || savedKey?.v;
      if (!cfToken) {
        return json9({ success: false, message: "No Cloudflare API key configured. Send cfToken or set up wizard first." }, 400);
      }
      const accounts = await cfCall(cfToken, "/accounts?per_page=1");
      if (!accounts.length) throw new Error("No Cloudflare accounts found");
      const accountId = body.accountId || accounts[0].id;
      const projectName = body.projectName || `cf-${Array.from(crypto.getRandomValues(new Uint8Array(6))).map((b) => b.toString(16).padStart(2, "0")).join("")}`;
      const dbName = `${projectName}-db`;
      const adminPassword = body.adminPassword || Array.from(crypto.getRandomValues(new Uint8Array(16))).map((b) => b.toString(16).padStart(2, "0")).join("");
      const logs = [];
      const log3 = /* @__PURE__ */ __name((msg) => logs.push(`[${(/* @__PURE__ */ new Date()).toLocaleTimeString()}] ${msg}`), "log");
      log3("Creating D1 database...");
      const d1 = await cfCall(cfToken, `/accounts/${accountId}/d1/database`, "POST", { name: dbName });
      const d1Id = d1.uuid || d1.id;
      log3(`Database created: ${dbName} (${d1Id})`);
      log3("Downloading worker code...");
      const workerCode = await fetch("https://raw.githubusercontent.com/EvolveBeyond/XRayMOD/main/worker.js").then((r) => r.text());
      log3(`Worker code downloaded (${workerCode.length} bytes)`);
      log3("Deploying worker...");
      const metadata = {
        main_module: "worker.js",
        compatibility_date: "2025-01-01",
        compatibility_flags: ["nodejs_compat"],
        bindings: [
          { type: "plain_text", name: "ADMIN_PASSWORD", text: adminPassword },
          { type: "plain_text", name: "DISGUISE_PAGE", text: "1101" },
          { type: "plain_text", name: "PANEL_RECOVERY", text: "false" }
        ],
        migrations: {
          new_tag: "v1",
          old_tag: null
        }
      };
      const formData = new FormData();
      formData.append("metadata", new Blob([JSON.stringify(metadata)], { type: "application/json" }), "metadata.json");
      formData.append("worker.js", new Blob([workerCode], { type: "application/javascript+module" }), "worker.js");
      const uploadResult = await cfCall(cfToken, `/accounts/${accountId}/workers/scripts/${projectName}`, "PUT", null);
      const uploadR = await fetch(`${CF_API}/accounts/${accountId}/workers/scripts/${projectName}`, {
        method: "PUT",
        headers: { "Authorization": `Bearer ${cfToken}` },
        body: formData
      });
      const uploadData = await uploadR.json();
      if (!uploadData.success) {
        throw new Error(`Worker upload failed: ${(uploadData.errors || []).map((e) => e.message).join("; ")}`);
      }
      log3("Worker deployed");
      log3("Enabling workers.dev subdomain...");
      try {
        await cfCall(cfToken, `/accounts/${accountId}/workers/subdomain`, "POST", { enabled: true });
      } catch {
      }
      log3("Subdomain enabled");
      const workerUrl = `https://${projectName}.${accounts[0].subdomain || "workers.dev"}`;
      log3("Deployment complete!");
      return json9({
        success: true,
        data: {
          projectName,
          d1Id,
          workerUrl,
          adminPassword,
          logs
        }
      });
    } catch (e) {
      return json9({ success: false, message: e.message || "Deployment failed" }, 500);
    }
  }
  return json9({ success: false, message: "Not found" }, 404);
}
__name(handleWizard, "handleWizard");

// worker/processors/api.ts
var apiHandlers = {
  login: handleLogin,
  logout: handleLogout,
  health: handleHealth,
  nodes: handleNodes,
  users: handleUsers,
  protocols: handleProtocols,
  configs: handleConfigs,
  settings: handleSettings,
  cleanip: handleCleanIP,
  backends: handleBackends,
  wizard: handleWizard
};
var apiProcessor = /* @__PURE__ */ __name(async (intent, request, env2, ctx) => {
  if (intent.type !== "api") return null;
  const handler = apiHandlers[intent.resource];
  if (!handler) return null;
  const params = {};
  if (intent.action) params.id = intent.action;
  return handler(request, env2, ctx, params);
}, "apiProcessor");

// worker/subscription.ts
function json10(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}
__name(json10, "json");
function text(content, status = 200) {
  return new Response(content, {
    status,
    headers: { "Content-Type": "text/plain" }
  });
}
__name(text, "text");
async function handleSubscription(request, env2, _ctx, params) {
  const token = params.token;
  if (!token) {
    return text("Invalid subscription link", 400);
  }
  const user = await env2.DB.prepare(
    "SELECT id, username, uuid, traffic_limit, traffic_used, expiry_date, status FROM users WHERE uuid = ?"
  ).bind(token).first();
  if (!user) {
    return text("Invalid subscription", 404);
  }
  if (user.status !== "active") {
    return text("Account is not active", 403);
  }
  if (user.expiry_date && new Date(user.expiry_date) < /* @__PURE__ */ new Date()) {
    return text("Subscription expired", 403);
  }
  const configs = await env2.DB.prepare(
    `SELECT c.*, p.id as proto_id, p.name as proto_name, p.schema_json, p.template_json
     FROM configs c
     LEFT JOIN protocols p ON c.protocol_id = p.id
     WHERE c.user_id = ?`
  ).bind(user.id).all();
  if (configs.results.length === 0) {
    return text("No configurations available");
  }
  const echRow = await env2.DB.prepare("SELECT v FROM kvstore WHERE k = ?").bind("ech.enabled").first();
  const echSniRow = await env2.DB.prepare("SELECT v FROM kvstore WHERE k = ?").bind("ech.sni").first();
  const echDnsRow = await env2.DB.prepare("SELECT v FROM kvstore WHERE k = ?").bind("ech.dns").first();
  const tlsFragRow = await env2.DB.prepare("SELECT v FROM kvstore WHERE k = ?").bind("tls_fragment.enabled").first();
  const tlsFragModeRow = await env2.DB.prepare("SELECT v FROM kvstore WHERE k = ?").bind("tls_fragment.mode").first();
  const echEnabled = echRow?.v === "true";
  const echSni = echSniRow?.v || "cloudflare-ech.com";
  const echDns = echDnsRow?.v || "https://dns.alidns.com/dns-query";
  const tlsFragEnabled = tlsFragRow?.v === "true";
  const tlsFragMode = tlsFragModeRow?.v || "Shadowrocket";
  const echParam = echEnabled ? `&ech=${encodeURIComponent((echSni ? echSni + "+" : "") + echDns)}` : "";
  const tlsFragParam = tlsFragEnabled ? tlsFragMode === "Shadowrocket" ? `&fragment=${encodeURIComponent("1,40-60,30-50,tlshello")}` : `&fragment=${encodeURIComponent("3,1,tlshello")}` : "";
  const cleanIPs = await getCleanIPs(env2.DB);
  const url = new URL(request.url);
  let host = url.host;
  const backendRow = await env2.DB.prepare("SELECT vps_ip, vps_port FROM backends WHERE user_id = ? AND status = ?").bind(user.id, "active").first();
  if (backendRow) {
    host = backendRow.vps_port === 443 ? backendRow.vps_ip : `${backendRow.vps_ip}:${backendRow.vps_port}`;
  } else if (cleanIPs.length > 0) {
    host = cleanIPs[0].split(":")[0];
  }
  const accept = request.headers.get("Accept") || "";
  const format = url.searchParams.get("format") || "base64";
  const mixedRow = await env2.DB.prepare("SELECT v FROM kvstore WHERE k = ?").bind("protocol.mixed_mode").first();
  const isMixedMode = mixedRow?.v === "true";
  const shuffledHosts = [...cleanIPs.length ? cleanIPs.map((ip) => ip.split(":")[0]) : [host]];
  for (let i = shuffledHosts.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffledHosts[i], shuffledHosts[j]] = [shuffledHosts[j], shuffledHosts[i]];
  }
  const links = [];
  const protoCycle = ["vless", "trojan", "ss"];
  for (let i = 0; i < configs.results.length; i++) {
    const config2 = configs.results[i];
    const settings = JSON.parse(config2.settings_json || "{}");
    const effectiveProtoId = isMixedMode ? protoCycle[i % 3] : config2.proto_id;
    const nodeHost = shuffledHosts[i % shuffledHosts.length] || host;
    const port = config2.port || 443;
    let processedTemplate = config2.template_json;
    const templateData = { ...settings, uuid: user.uuid };
    for (const [key, value] of Object.entries(templateData)) {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, "g");
      processedTemplate = processedTemplate.replace(regex, String(value));
    }
    let uri = "";
    const protoId = effectiveProtoId;
    const nodeLabel = `${config2.name}${isMixedMode ? " (" + protoId.toUpperCase() + ")" : ""}`;
    if (protoId === "vless" || config2.proto_id.startsWith("vless")) {
      if (config2.proto_id === "vless-grpc") {
        const grpcMode = settings.mode || "gun";
        uri = `vless://${user.uuid}@${nodeHost}:${port}?encryption=none&security=tls&type=grpc&mode=${grpcMode}&serviceName=${settings.serviceName || "grpc"}&sni=${settings.sni || nodeHost}${echParam}${tlsFragParam}#${encodeURIComponent(nodeLabel)}`;
      } else {
        uri = `vless://${user.uuid}@${nodeHost}:${port}?encryption=none&security=${settings.security || "tls"}&type=${settings.network || "tcp"}&flow=${settings.flow || ""}${echParam}${tlsFragParam}#${encodeURIComponent(nodeLabel)}`;
      }
    } else if (protoId === "trojan" || config2.proto_id.startsWith("trojan")) {
      uri = `trojan://${settings.password || "password"}@${nodeHost}:${port}?type=${settings.network || "ws"}&host=${nodeHost}&path=${settings.path || "/"}&security=tls&sni=${settings.sni || nodeHost}${echParam}${tlsFragParam}#${encodeURIComponent(nodeLabel)}`;
    } else if (protoId === "ss" || config2.proto_id.startsWith("ss")) {
      const ssInfo = btoa(`${settings.method || "chacha20-ietf-poly1305"}:${settings.password || "password"}`);
      uri = `ss://${ssInfo}@${nodeHost}:${port}?type=${settings.network || "ws"}&path=${settings.path || "/"}#${encodeURIComponent(nodeLabel)}`;
    } else if (config2.proto_id.startsWith("vmess")) {
      const vmessObj = {
        v: "2",
        ps: nodeLabel,
        add: nodeHost,
        port,
        id: user.uuid,
        aid: 0,
        scy: "auto",
        net: settings.network || "ws",
        type: "none",
        host: nodeHost,
        path: settings.path || "/",
        tls: settings.security === "tls" ? "tls" : ""
      };
      uri = `vmess://${btoa(JSON.stringify(vmessObj))}`;
    } else {
      uri = `${config2.proto_id}://${btoa(processedTemplate)}@${nodeHost}:${port}#${encodeURIComponent(nodeLabel)}`;
    }
    links.push(uri);
  }
  if (format === "clash" || accept.includes("text/yaml")) {
    return generateClashConfig(links, configs.results, user, echEnabled, echSni);
  }
  if (format === "singbox" || accept.includes("application/json")) {
    return generateSingboxConfig(links, configs.results, user, echEnabled, echSni);
  }
  const base64Config = btoa(links.join("\n"));
  return text(base64Config);
}
__name(handleSubscription, "handleSubscription");
function generateClashConfig(links, configs, user, echEnabled = false, echSni = "cloudflare-ech.com") {
  const proxies = [];
  const proxyNames = [];
  for (let i = 0; i < configs.length; i++) {
    const config2 = configs[i];
    const settings = JSON.parse(config2.settings_json || "{}");
    const name = config2.name || `Config ${i + 1}`;
    proxyNames.push(name);
    const proxy = {
      name,
      type: getClashProxyType(config2.proto_id),
      server: settings.host || settings.sni || "example.com",
      port: config2.port || 443,
      uuid: user.uuid
    };
    if (config2.proto_id.includes("vless")) {
      proxy.flow = settings.flow || "";
      proxy.tls = settings.security === "tls" || settings.security === "reality";
      if (settings.sni) proxy.sni = settings.sni;
      if (config2.proto_id === "vless-grpc") {
        proxy.network = "grpc";
        proxy["grpc-opts"] = { "grpc-service-name": settings.serviceName || "grpc" };
      }
      if (echEnabled) {
        proxy["ech-opts"] = {
          enable: true,
          "query-server-name": echSni
        };
      }
    }
    if (config2.proto_id.includes("vmess")) {
      proxy.network = settings.network || "ws";
      if (settings.path) proxy["ws-opts"] = { path: settings.path };
      proxy.tls = settings.security === "tls";
    }
    if (config2.proto_id.includes("trojan")) {
      proxy.password = settings.password || "password";
      proxy.network = settings.network || "ws";
      proxy.tls = true;
    }
    if (config2.proto_id.includes("ss")) {
      proxy.cipher = settings.method || "chacha20-ietf-poly1305";
      proxy.password = settings.password || "password";
    }
    proxies.push(proxy);
  }
  const clashConfig = {
    "mixed-port": 7890,
    "allow-lan": false,
    "mode": "rule",
    "proxies": proxies,
    "proxy-groups": [
      {
        "name": "Proxy",
        "type": "select",
        "proxies": [...proxyNames, "DIRECT"]
      }
    ],
    "rules": ["MATCH,Proxy"]
  };
  return new Response(
    `proxies:
${JSON.stringify(clashConfig, null, 2).split("\n").map((l) => "  " + l).join("\n")}`,
    {
      headers: { "Content-Type": "text/yaml; charset=utf-8" }
    }
  );
}
__name(generateClashConfig, "generateClashConfig");
function generateSingboxConfig(links, configs, user, echEnabled = false, echSni = "cloudflare-ech.com") {
  const outbounds = [];
  for (let i = 0; i < configs.length; i++) {
    const config2 = configs[i];
    const settings = JSON.parse(config2.settings_json || "{}");
    const name = config2.name || `Config ${i + 1}`;
    const outbound = {
      type: getSingboxOutboundType(config2.proto_id),
      tag: name,
      server: settings.host || settings.sni || "example.com",
      server_port: config2.port || 443,
      uuid: user.uuid
    };
    if (config2.proto_id.includes("vless")) {
      outbound.flow = settings.flow || "";
      if (settings.security === "tls") {
        outbound.tls = { enabled: true, server_name: settings.sni || settings.host };
        if (echEnabled) {
          outbound.tls.ech = {
            enabled: true,
            query_server_name: echSni
          };
        }
      }
      if (config2.proto_id === "vless-grpc") {
        outbound.transport = {
          type: "grpc",
          serviceName: settings.serviceName || "grpc"
        };
      }
    }
    if (config2.proto_id.includes("vmess")) {
      outbound.transport = {
        type: settings.network || "ws",
        path: settings.path || "/"
      };
    }
    outbounds.push(outbound);
  }
  const singboxConfig = {
    outbounds,
    inbounds: [
      {
        type: "mixed",
        listen: "127.0.0.1",
        listen_port: 2080
      }
    ]
  };
  return json10(singboxConfig);
}
__name(generateSingboxConfig, "generateSingboxConfig");
function getClashProxyType(protoId) {
  if (protoId.includes("vless")) return "vless";
  if (protoId.includes("vmess")) return "vmess";
  if (protoId.includes("trojan")) return "trojan";
  if (protoId.includes("ss")) return "ss";
  return "ss";
}
__name(getClashProxyType, "getClashProxyType");
function getSingboxOutboundType(protoId) {
  if (protoId.includes("vless")) return "vless";
  if (protoId.includes("vmess")) return "vmess";
  if (protoId.includes("trojan")) return "trojan";
  if (protoId.includes("ss")) return "shadowsocks";
  return "shadowsocks";
}
__name(getSingboxOutboundType, "getSingboxOutboundType");

// worker/processors/subscription.ts
var subscriptionProcessor = /* @__PURE__ */ __name(async (intent, request, env2, ctx) => {
  if (intent.type !== "subscription") return null;
  return handleSubscription(request, env2, ctx, { token: intent.token });
}, "subscriptionProcessor");

// worker/install.ts
async function handleInstall(request, env2, _ctx, _params) {
  const url = new URL(request.url);
  const configured = await env2.DB.prepare(
    "SELECT v FROM kvstore WHERE k = ?"
  ).bind("panel.password_hash").first();
  if (configured && configured.v) {
    const uuidRow = await env2.DB.prepare(
      "SELECT v FROM kvstore WHERE k = ?"
    ).bind("panel.access_uuid").first();
    if (uuidRow && uuidRow.v) {
      return new Response(null, {
        status: 302,
        headers: { Location: `/${uuidRow.v}/` }
      });
    }
  }
  if (!configured || !configured.v) {
    const adminPassword = env2.ADMIN_PASSWORD;
    if (adminPassword && adminPassword.length >= 4) {
      const hash = await hashPassword2(adminPassword);
      await env2.DB.prepare(
        "INSERT OR REPLACE INTO kvstore (k, v, updated) VALUES (?, ?, ?)"
      ).bind("panel.password_hash", hash, Date.now()).run();
      const accessUUID = crypto.randomUUID();
      await env2.DB.prepare(
        "INSERT OR REPLACE INTO kvstore (k, v, updated) VALUES (?, ?, ?)"
      ).bind("panel.access_uuid", accessUUID, Date.now()).run();
      const secretKey = Array.from(crypto.getRandomValues(new Uint8Array(32))).map((b) => b.toString(16).padStart(2, "0")).join("");
      await env2.DB.prepare(
        "INSERT OR REPLACE INTO kvstore (k, v, updated) VALUES (?, ?, ?)"
      ).bind("panel.secret_key", secretKey, Date.now()).run();
      await env2.DB.prepare(
        "UPDATE users SET password_hash = ? WHERE role = ?"
      ).bind(hash, "admin").run();
      return new Response(null, {
        status: 302,
        headers: { Location: `/${accessUUID}/` }
      });
    }
  }
  if (request.method === "POST") {
    try {
      const body = await request.json();
      const password = body.password;
      if (!password || password.length < 4) {
        return new Response(JSON.stringify({ error: "Password must be at least 4 characters" }), {
          status: 400,
          headers: { "Content-Type": "application/json" }
        });
      }
      const hash = await hashPassword2(password);
      await env2.DB.prepare(
        "INSERT OR REPLACE INTO kvstore (k, v, updated) VALUES (?, ?, ?)"
      ).bind("panel.password_hash", hash, Date.now()).run();
      const accessUUID = crypto.randomUUID();
      await env2.DB.prepare(
        "INSERT OR REPLACE INTO kvstore (k, v, updated) VALUES (?, ?, ?)"
      ).bind("panel.access_uuid", accessUUID, Date.now()).run();
      const secretKey = Array.from(crypto.getRandomValues(new Uint8Array(32))).map((b) => b.toString(16).padStart(2, "0")).join("");
      await env2.DB.prepare(
        "INSERT OR REPLACE INTO kvstore (k, v, updated) VALUES (?, ?, ?)"
      ).bind("panel.secret_key", secretKey, Date.now()).run();
      await env2.DB.prepare(
        "UPDATE users SET password_hash = ? WHERE role = ?"
      ).bind(hash, "admin").run();
      return new Response(JSON.stringify({ success: true, message: "Password set successfully", accessUUID }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    } catch (e) {
      return new Response(JSON.stringify({ error: "Invalid request" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }
  }
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>XrayMOD \u2014 Setup</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: system-ui, -apple-system, sans-serif;
      background: #09090b;
      color: #fafafa;
      display: grid;
      place-items: center;
      min-height: 100vh;
    }
    .card {
      background: #18181b;
      border: 1px solid #27272a;
      border-radius: 1rem;
      padding: 2.5rem;
      max-width: 440px;
      width: 100%;
    }
    .logo {
      width: 48px;
      height: 48px;
      background: linear-gradient(135deg, #10b981, #059669);
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 900;
      font-size: 1.5rem;
      color: #000;
      margin: 0 auto 1.5rem;
    }
    h1 {
      font-size: 1.5rem;
      font-weight: 800;
      text-align: center;
      margin-bottom: 0.5rem;
    }
    .subtitle {
      text-align: center;
      color: #a1a1aa;
      margin-bottom: 2rem;
      font-size: 0.875rem;
      line-height: 1.6;
    }
    .form-group {
      margin-bottom: 1rem;
    }
    label {
      display: block;
      font-size: 0.75rem;
      font-weight: 700;
      color: #71717a;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 0.5rem;
    }
    input {
      width: 100%;
      padding: 0.75rem 1rem;
      background: #09090b;
      border: 1px solid #27272a;
      border-radius: 0.75rem;
      color: #fafafa;
      font-size: 0.875rem;
      transition: border-color 0.2s;
    }
    input:focus {
      outline: none;
      border-color: #10b981;
    }
    input::placeholder { color: #52525b; }
    .btn {
      width: 100%;
      padding: 0.875rem;
      background: #10b981;
      color: #000;
      border: none;
      border-radius: 0.75rem;
      font-weight: 700;
      font-size: 0.875rem;
      cursor: pointer;
      transition: background 0.2s;
      margin-top: 1rem;
    }
    .btn:hover { background: #34d399; }
    .btn:disabled { background: #27272a; color: #52525b; cursor: not-allowed; }
    .error {
      color: #ef4444;
      font-size: 0.75rem;
      margin-top: 0.5rem;
      display: none;
    }
    .success {
      color: #10b981;
      font-size: 0.875rem;
      margin-top: 1rem;
      text-align: center;
      display: none;
    }
    .footer {
      text-align: center;
      margin-top: 1.5rem;
      font-size: 0.75rem;
      color: #52525b;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">X</div>
    <h1>Welcome to XrayMOD</h1>
    <p class="subtitle">
      Set up your admin password to get started.<br>
      This is the only time you'll need to do this.
    </p>

    <form id="setupForm">
      <div class="form-group">
        <label for="password">Admin Password</label>
        <input
          type="password"
          id="password"
          placeholder="Enter a secure password"
          required
          minlength="4"
          autocomplete="new-password"
        >
      </div>
      <div class="form-group">
        <label for="confirmPassword">Confirm Password</label>
        <input
          type="password"
          id="confirmPassword"
          placeholder="Confirm your password"
          required
          minlength="4"
          autocomplete="new-password"
        >
      </div>
      <button type="submit" class="btn" id="submitBtn">Complete Setup</button>
    </form>

    <div class="error" id="error"></div>
    <div class="success" id="success"></div>

    <div class="footer">
      Powered by XrayMOD \u2014 Cloudflare Workers
    </div>
  </div>

  <script>
    const form = document.getElementById('setupForm');
    const error = document.getElementById('error');
    const success = document.getElementById('success');
    const submitBtn = document.getElementById('submitBtn');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const password = document.getElementById('password').value;
      const confirm = document.getElementById('confirmPassword').value;

      if (password !== confirm) {
        error.textContent = 'Passwords do not match';
        error.style.display = 'block';
        return;
      }

      if (password.length < 4) {
        error.textContent = 'Password must be at least 4 characters';
        error.style.display = 'block';
        return;
      }

      error.style.display = 'none';
      submitBtn.disabled = true;
      submitBtn.textContent = 'Setting up...';

      try {
        const res = await fetch('/install', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password }),
        });

        const data = await res.json();

        if (data.success) {
          success.innerHTML = 'Setup complete!<br><br>' +
            '<b>Your Panel URL:</b><br>' +
            '<code style="background:#18181b;padding:8px;border-radius:6px;display:block;margin-top:8px;word-break:break-all">' +
            window.location.origin + '/' + data.accessUUID +
            '</code><br>' +
            '<button onclick="navigator.clipboard.writeText(\\'' + window.location.origin + '/' + data.accessUUID + '\\')" ' +
            'style="margin-top:8px;padding:8px 16px;background:#10b981;color:#000;border:none;border-radius:6px;font-weight:700;cursor:pointer">' +
            'Copy URL</button><br><br>' +
            '<small style="color:#a1a1aa">Save this URL! It is the only way to access your panel.</small>' +
            '<br><br>Redirecting to login...';
          success.style.display = 'block';
          setTimeout(() => {
            window.location.href = '/' + data.accessUUID;
          }, 10000);
        } else {
          error.textContent = data.error || 'Setup failed';
          error.style.display = 'block';
          submitBtn.disabled = false;
          submitBtn.textContent = 'Complete Setup';
        }
      } catch (err) {
        error.textContent = 'Network error. Please try again.';
        error.style.display = 'block';
        submitBtn.disabled = false;
        submitBtn.textContent = 'Complete Setup';
      }
    });
  <\/script>
</body>
</html>`;
  return new Response(html, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" }
  });
}
__name(handleInstall, "handleInstall");

// worker/processors/install.ts
var installProcessor = /* @__PURE__ */ __name(async (intent, request, env2, ctx) => {
  if (intent.type !== "install") return null;
  return handleInstall(request, env2, ctx, {});
}, "installProcessor");

// worker/telegram.ts
async function tgApi(botToken, method, payload) {
  try {
    const url = `https://api.telegram.org/bot${botToken}/${method}`;
    const opts = { method: "POST", headers: { "Content-Type": "application/json" } };
    if (payload) opts.body = JSON.stringify(payload);
    const r = await fetch(url, opts);
    return r.ok ? await r.json() : null;
  } catch (e) {
    console.error("[TG] API error:", method, e);
    return null;
  }
}
__name(tgApi, "tgApi");
async function sendBotMessage(botToken, chatId, text2, replyMarkup) {
  await tgApi(botToken, "sendMessage", {
    chat_id: chatId,
    parse_mode: "HTML",
    text: text2,
    ...replyMarkup ? { reply_markup: replyMarkup } : {}
  });
}
__name(sendBotMessage, "sendBotMessage");
async function verifyTelegramLogin(chatId, token, key) {
  const nowBucket = Math.floor(Date.now() / 3e5);
  for (const b of [nowBucket, nowBucket - 1]) {
    const enc = new TextEncoder();
    const data = enc.encode(`tg-login|${chatId}|${b}`);
    const mac = await crypto.subtle.importKey("raw", enc.encode(String(key)), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const sig = await crypto.subtle.sign("HMAC", mac, data);
    const hex = Array.from(new Uint8Array(sig)).map((b2) => b2.toString(16).padStart(2, "0")).join("");
    if (hex.slice(0, 32) === token) return true;
  }
  return false;
}
__name(verifyTelegramLogin, "verifyTelegramLogin");
function mainKeyboard(panelUrl, subUrl) {
  return {
    inline_keyboard: [
      [{ text: "\u{1F4CA} \u0648\u0636\u0639\u06CC\u062A", callback_data: "m:status" }, { text: "\u{1F517} \u0627\u0634\u062A\u0631\u0627\u06A9", callback_data: "m:sub" }],
      [{ text: "\u2699\uFE0F \u06A9\u0627\u0646\u0641\u06CC\u06AF", callback_data: "m:config" }, { text: "\u{1F465} \u06A9\u0627\u0631\u0628\u0631\u0627\u0646", callback_data: "m:users" }],
      [{ text: "\u{1F5A5} \u067E\u0646\u0644 \u0645\u062F\u06CC\u0631\u06CC\u062A", web_app: { url: panelUrl } }, { text: "\u{1F504} \u0645\u0646\u0648", callback_data: "m:menu" }]
    ]
  };
}
__name(mainKeyboard, "mainKeyboard");
function welcomeText() {
  return `<b>\u{1F6F0} \u0628\u0647 \u0631\u0628\u0627\u062A XrayMOD \u062E\u0648\u0634 \u0622\u0645\u062F\u06CC\u062F</b>

<blockquote>\u0645\u062F\u06CC\u0631\u06CC\u062A \u067E\u0646\u0644 \u0627\u0632 \u062A\u0644\u06AF\u0631\u0627\u0645:
\u062F\u0631\u06CC\u0627\u0641\u062A \u0644\u06CC\u0646\u06A9 \u0627\u0634\u062A\u0631\u0627\u06A9\u060C \u0648\u0636\u0639\u06CC\u062A\u060C \u0645\u0635\u0631\u0641 \u0648 \u062A\u0646\u0638\u06CC\u0645\u0627\u062A</blockquote>

\u0627\u0632 \u062F\u06A9\u0645\u0647\u200C\u0647\u0627\u06CC \u0632\u06CC\u0631 \u0627\u0633\u062A\u0641\u0627\u062F\u0647 \u06A9\u0646\u06CC\u062F \u{1F447}`;
}
__name(welcomeText, "welcomeText");
function helpText() {
  return `<b>\u2554\u2550\u2550\u2550\u2770\u2728 \u0631\u0627\u0647\u0646\u0645\u0627 \u2771\u2550\u2550\u2550\u2557</b>

<blockquote><b>\u{1F4CB} \u062F\u0633\u062A\u0648\u0631\u0627\u062A</b>
\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
<code>/start</code>     \u2500\u2500\u2500 \u0645\u0646\u0648\u06CC \u0627\u0635\u0644\u06CC
<code>/sub</code>       \u2500\u2500\u2500 \u0644\u06CC\u0646\u06A9 \u0627\u0634\u062A\u0631\u0627\u06A9
<code>/status</code>    \u2500\u2500\u2500 \u0648\u0636\u0639\u06CC\u062A \u0633\u0631\u0648\u0631
<code>/config</code>    \u2500\u2500\u2500 \u062A\u0646\u0638\u06CC\u0645\u0627\u062A \u067E\u0631\u0648\u062A\u06A9\u0644
<code>/users</code>     \u2500\u2500\u2500 \u0644\u06CC\u0633\u062A \u06A9\u0627\u0631\u0628\u0631\u0627\u0646
<code>/help</code>      \u2500\u2500\u2500 \u0627\u06CC\u0646 \u0631\u0627\u0647\u0646\u0645\u0627</blockquote>

<b>\u255A\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255D</b>`;
}
__name(helpText, "helpText");
function statusText(cfg, host, userCount) {
  const uptime2 = Date.now() - globalThis.__workerStart || 0;
  const uptimeStr = `${Math.floor(uptime2 / 36e5)}h ${Math.floor(uptime2 % 36e5 / 6e4)}m`;
  return `<b>\u2554\u2550\u2550\u2550\u2770\u{1F4CA} \u0648\u0636\u0639\u06CC\u062A \u0633\u0631\u0648\u0631 \u2771\u2550\u2550\u2550\u2557</b>

<blockquote>\u23F1 <b>\u0622\u067E\u062A\u0627\u06CC\u0645:</b> <code>${uptimeStr}</code>
\u{1F310} <b>Host:</b> <code>${host}</code>
\u{1F465} <b>\u06A9\u0627\u0631\u0628\u0631\u0627\u0646:</b> <code>${userCount}</code>
\u{1F4E1} <b>\u067E\u0631\u0648\u062A\u06A9\u0644:</b> <code>${cfg?.protocol || "vless"}</code>
\u{1F510} <b>Transport:</b> <code>${cfg?.transport || "ws"}</code></blockquote>

<b>\u255A\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255D</b>`;
}
__name(statusText, "statusText");
function configText(cfg) {
  const status = /* @__PURE__ */ __name((v) => v ? "\u{1F7E2} \u0641\u0639\u0627\u0644" : "\u{1F534} \u063A\u06CC\u0631\u0641\u0639\u0627\u0644", "status");
  return `<b>\u2554\u2550\u2550\u2550\u2770\u2699\uFE0F \u062A\u0646\u0638\u06CC\u0645\u0627\u062A \u2771\u2550\u2550\u2550\u2557</b>

<blockquote><b>\u{1F4E1} \u0634\u0628\u06A9\u0647</b>
\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
<b>\u067E\u0631\u0648\u062A\u06A9\u0644:</b> <code>${cfg?.protocol || "vless"}</code>
<b>Transport:</b> <code>${cfg?.transport || "ws"}</code>
<b>Host:</b> <code>${cfg?.host || "-"}</code></blockquote>

<blockquote><b>\u{1F510} \u0627\u0645\u0646\u06CC\u062A</b>
\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
<b>ECH:</b> ${status(cfg?.ech)}
<b>TLS Fragment:</b> ${status(cfg?.tlsFragment)}</blockquote>

<b>\u255A\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255D</b>`;
}
__name(configText, "configText");
function usersText(users) {
  if (!users.length) return "<b>\u0647\u06CC\u0686 \u06A9\u0627\u0631\u0628\u0631\u06CC \u06CC\u0627\u0641\u062A \u0646\u0634\u062F.</b>";
  const lines = users.slice(0, 10).map(
    (u, i) => `${i + 1}. <code>${u.username}</code> \u2014 ${u.status === "active" ? "\u{1F7E2}" : "\u{1F534}"} ${u.traffic_used || 0}MB`
  ).join("\n");
  return `<b>\u{1F465} \u0644\u06CC\u0633\u062A \u06A9\u0627\u0631\u0628\u0631\u0627\u0646</b>

${lines}`;
}
__name(usersText, "usersText");
async function handleTelegramWebhook(request, env2, _ctx) {
  try {
    const tgConfig = await env2.DB.prepare("SELECT v FROM kvstore WHERE k = ?").bind("tg.bot_token").first();
    const tgChatRow = await env2.DB.prepare("SELECT v FROM kvstore WHERE k = ?").bind("tg.chat_id").first();
    if (!tgConfig?.v) {
      return new Response("Bot not configured", { status: 200 });
    }
    const botToken = tgConfig.v;
    const allowedChatId = tgChatRow?.v || "";
    const update = await request.json();
    const url = new URL(request.url);
    const host = url.host;
    const protocol = url.protocol;
    if (update.callback_query) {
      const cq = update.callback_query;
      const cbChat = String(cq.message?.chat?.id || "").trim();
      const cbUser = String(cq.from?.id || "").trim();
      if (allowedChatId && cbChat !== allowedChatId && cbUser !== allowedChatId) {
        return new Response("Unauthorized", { status: 200 });
      }
      await tgApi(botToken, "answerCallbackQuery", { callback_query_id: cq.id });
      const data = cq.data || "";
      let sendText = null;
      let showKeyboard = false;
      const userRow2 = await env2.DB.prepare("SELECT uuid FROM users WHERE role = ?").bind("admin").first();
      const userUUID2 = userRow2?.uuid || "";
      const subUrl2 = `${protocol}//${host}/sub/${userUUID2}`;
      const panelUrl2 = `${protocol}//${host}`;
      const kb2 = mainKeyboard(panelUrl2, subUrl2);
      if (data === "m:status") {
        const users = await env2.DB.prepare("SELECT COUNT(*) as count FROM users").first();
        sendText = statusText({ protocol: "vless", transport: "ws" }, host, users?.count || 0);
      } else if (data === "m:config") {
        const echRow = await env2.DB.prepare("SELECT v FROM kvstore WHERE k = ?").bind("ech.enabled").first();
        const fragRow = await env2.DB.prepare("SELECT v FROM kvstore WHERE k = ?").bind("tls_fragment.enabled").first();
        sendText = configText({ protocol: "vless", transport: "ws", host, ech: echRow?.v === "true", tlsFragment: fragRow?.v === "true" });
      } else if (data === "m:sub") {
        sendText = `<b>\u2554\u2550\u2550\u2550\u2770\u{1F517} \u0627\u0634\u062A\u0631\u0627\u06A9 \u2771\u2550\u2550\u2550\u2557</b>

<blockquote><b>\u{1F4CE} \u0644\u06CC\u0646\u06A9 \u0627\u0634\u062A\u0631\u0627\u06A9 \u0634\u0645\u0627:</b>
<code>${subUrl2}</code></blockquote>

<b>\u{1F4E5} <a href="${subUrl2}">\u0628\u0627\u0632 \u06A9\u0631\u062F\u0646 \u0645\u0633\u062A\u0642\u06CC\u0645</a></a></b>

<b>\u255A\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255D</b>`;
      } else if (data === "m:users") {
        const users = await env2.DB.prepare("SELECT username, status, traffic_used FROM users LIMIT 10").all();
        sendText = usersText(users.results);
      } else if (data === "m:menu") {
        sendText = welcomeText();
        showKeyboard = true;
      }
      if (sendText) {
        await sendBotMessage(botToken, cbChat, sendText, showKeyboard ? kb2 : void 0);
      }
      return new Response("OK", { status: 200 });
    }
    if (!update.message?.text) return new Response("OK", { status: 200 });
    const chatId = String(update.message.chat.id).trim();
    if (allowedChatId && chatId !== allowedChatId) {
      return new Response("Unauthorized", { status: 200 });
    }
    const text2 = update.message.text.trim();
    const cmd = text2.split(" ")[0].toLowerCase();
    const userRow = await env2.DB.prepare("SELECT uuid FROM users WHERE role = ?").bind("admin").first();
    const userUUID = userRow?.uuid || "";
    const subUrl = `${protocol}//${host}/sub/${userUUID}`;
    const panelUrl = `${protocol}//${host}`;
    const kb = mainKeyboard(panelUrl, subUrl);
    switch (cmd) {
      case "/start":
      case "/menu":
        await sendBotMessage(botToken, chatId, welcomeText(), kb);
        break;
      case "/help":
        await sendBotMessage(botToken, chatId, helpText(), kb);
        break;
      case "/sub":
        await sendBotMessage(
          botToken,
          chatId,
          `<b>\u{1F517} \u0644\u06CC\u0646\u06A9 \u0627\u0634\u062A\u0631\u0627\u06A9:</b>
<code>${subUrl}</code>

\u{1F4E5} <a href="${subUrl}">\u0628\u0627\u0632 \u06A9\u0631\u062F\u0646</a>`,
          kb
        );
        break;
      case "/status": {
        const users = await env2.DB.prepare("SELECT COUNT(*) as count FROM users").first();
        await sendBotMessage(botToken, chatId, statusText({ protocol: "vless", transport: "ws" }, host, users?.count || 0), kb);
        break;
      }
      case "/config": {
        const echRow = await env2.DB.prepare("SELECT v FROM kvstore WHERE k = ?").bind("ech.enabled").first();
        const fragRow = await env2.DB.prepare("SELECT v FROM kvstore WHERE k = ?").bind("tls_fragment.enabled").first();
        await sendBotMessage(botToken, chatId, configText({ protocol: "vless", transport: "ws", host, ech: echRow?.v === "true", tlsFragment: fragRow?.v === "true" }), kb);
        break;
      }
      case "/users": {
        const users = await env2.DB.prepare("SELECT username, status, traffic_used FROM users LIMIT 10").all();
        await sendBotMessage(botToken, chatId, usersText(users.results), kb);
        break;
      }
      default:
        await sendBotMessage(botToken, chatId, "\u062F\u0633\u062A\u0648\u0631 \u0646\u0627\u0634\u0646\u0627\u062E\u062A\u0647. \u0627\u0632 /help \u0627\u0633\u062A\u0641\u0627\u062F\u0647 \u06A9\u0646\u06CC\u062F.", kb);
    }
    return new Response("OK", { status: 200 });
  } catch (e) {
    console.error("[TG] Webhook error:", e);
    return new Response("OK", { status: 200 });
  }
}
__name(handleTelegramWebhook, "handleTelegramWebhook");
async function handleTelegramLogin(request, env2, _ctx, params) {
  const chatId = new URL(request.url).searchParams.get("chat_id") || "";
  const token = new URL(request.url).searchParams.get("token") || "";
  if (!chatId || !token) {
    return new Response("Invalid login link", { status: 400 });
  }
  const keyRow = await env2.DB.prepare("SELECT v FROM kvstore WHERE k = ?").bind("panel.secret_key").first();
  const key = keyRow?.v || "default-secret";
  if (!await verifyTelegramLogin(chatId, token, key)) {
    return new Response("Invalid or expired login token", { status: 401 });
  }
  const adminRow = await env2.DB.prepare("SELECT id, role FROM users WHERE role = ?").bind("admin").first();
  if (!adminRow) {
    return new Response("Admin user not found", { status: 500 });
  }
  const sessionToken = crypto.randomUUID();
  await env2.DB.prepare("INSERT OR REPLACE INTO kvstore (k, v, updated) VALUES (?, ?, ?)").bind(`session:${sessionToken}`, JSON.stringify({ userId: adminRow.id, role: adminRow.role, created: Date.now() }), Date.now()).run();
  return new Response(null, {
    status: 302,
    headers: {
      Location: "/",
      "Set-Cookie": `session=${sessionToken}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=604800`
    }
  });
}
__name(handleTelegramLogin, "handleTelegramLogin");

// worker/processors/telegram.ts
var telegramProcessor = /* @__PURE__ */ __name(async (intent, request, env2, ctx) => {
  if (intent.type !== "telegram") return null;
  if (intent.endpoint === "webhook") {
    return handleTelegramWebhook(request, env2, ctx, {});
  }
  return handleTelegramLogin(request, env2, ctx, {});
}, "telegramProcessor");

// worker/processors/static.ts
var FALLBACK_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>XrayMOD</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:system-ui,sans-serif;background:#09090b;color:#fafafa;display:grid;place-items:center;min-height:100vh}
    .box{text-align:center;padding:2rem;max-width:440px}
    .icon{width:48px;height:48px;background:#10b981;border-radius:12px;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:1.5rem;color:#000;margin:0 auto 1.5rem}
    h1{font-size:1.5rem;margin-bottom:.5rem}
    p{color:#a1a1aa;font-size:.875rem;line-height:1.6}
    .links{margin-top:1.5rem;display:flex;flex-direction:column;gap:.5rem}
    .links a{color:#10b981;text-decoration:none;font-size:.875rem}
  </style>
</head>
<body>
  <div class="box">
    <div class="icon">X</div>
    <h1>XrayMOD</h1>
    <p>Panel is deployed. The frontend will be served from GitHub.</p>
    <div class="links">
      <a href="/install">Setup (first time)</a>
      <a href="/api/health">API Health</a>
      <a href="https://github.com/EvolveBeyond/XRayMOD">GitHub</a>
    </div>
  </div>
</body>
</html>`;
var staticProcessor = /* @__PURE__ */ __name(async (intent, request, env2, ctx) => {
  if (intent.type !== "static") return null;
  const url = new URL(request.url);
  const disguise = await getDisguiseConfig(env2, env2.DB);
  if (disguise.on) {
    return getDecoyResponse(url.host, disguise.fallbackPage);
  }
  const pagesUrl = env2.PAGES_URL;
  if (pagesUrl) {
    const workerOrigin = url.origin;
    const apiScript = `<script>window.__API_BASE="${workerOrigin}";<\/script>`;
    const injectApiBase = /* @__PURE__ */ __name((html) => {
      const modified = html.replace("<head>", `<head>${apiScript}`);
      return new Response(modified, {
        status: 200,
        headers: { "Content-Type": "text/html" }
      });
    }, "injectApiBase");
    try {
      const assetPath = url.pathname === "/" ? "/index.html" : url.pathname;
      const remoteUrl = pagesUrl.replace(/\/$/, "") + assetPath;
      const remoteResponse = await fetch(remoteUrl);
      if (remoteResponse.status === 200) {
        const contentType = remoteResponse.headers.get("content-type") || "";
        const body = await remoteResponse.text();
        if (contentType.includes("text/html") || assetPath.endsWith(".html")) {
          return injectApiBase(body);
        }
        return new Response(body, {
          status: 200,
          headers: { "Content-Type": contentType }
        });
      }
    } catch (_e) {
    }
    try {
      const spaUrl = pagesUrl.replace(/\/$/, "") + "/index.html";
      const spaResponse = await fetch(spaUrl);
      if (spaResponse.status === 200) {
        const html = await spaResponse.text();
        return injectApiBase(html);
      }
    } catch (_e) {
    }
  }
  return new Response(FALLBACK_HTML, {
    headers: { "Content-Type": "text/html; charset=utf-8" }
  });
}, "staticProcessor");

// worker/processors/index.ts
registerProcessor("proxy", proxyProcessor);
registerProcessor("install", installProcessor);
registerProcessor("telegram", telegramProcessor);
registerProcessor("subscription", subscriptionProcessor);
registerProcessor("api", apiProcessor);
registerProcessor("static", staticProcessor);

// worker/router.ts
function errorPage(msg) {
  return new Response(`<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>XrayMOD Error</title>
<style>body{font-family:system-ui;background:#09090b;color:#fafafa;display:grid;place-items:center;min-height:100vh;margin:0}
.box{text-align:center;padding:2rem;max-width:400px}
h1{color:#ef4444;font-size:1.2rem;margin-bottom:.5rem}
p{color:#a1a1aa;font-size:.875rem}</style></head>
<body><div class="box"><h1>Error</h1><p>${msg}</p></div></body></html>`, {
    status: 500,
    headers: { "Content-Type": "text/html" }
  });
}
__name(errorPage, "errorPage");
async function handleRequest(request, env2, ctx) {
  try {
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
          "Access-Control-Max-Age": "86400"
        }
      });
    }
    await ensureSchema(env2.DB);
    const url = new URL(request.url);
    let pathname = url.pathname;
    const bypassUUID = pathname.startsWith("/install") || pathname.startsWith("/api/") || pathname.startsWith("/sub/") || pathname.startsWith("/bot") || request.headers.get("Upgrade") === "websocket";
    if (request.headers.get("Upgrade") === "websocket") {
      const intent2 = detectIntent(request, url, env2);
      return processIntent(intent2, request, env2, ctx);
    }
    if (request.method === "POST" && !pathname.startsWith("/api/") && !pathname.startsWith("/install")) {
      if (isGrpcRequest(request) || isXHTTPRequest(request)) {
        const intent2 = detectIntent(request, url, env2);
        return processIntent(intent2, request, env2, ctx);
      }
    }
    const panelUUID = await env2.DB.prepare(
      "SELECT v FROM kvstore WHERE k = ?"
    ).bind("panel.access_uuid").first();
    const accessUuid = panelUUID?.v;
    if (accessUuid && !bypassUUID) {
      const segments = pathname.split("/").filter(Boolean);
      if (segments.length === 0 || segments[0] !== accessUuid) {
        const configured = await env2.DB.prepare(
          "SELECT v FROM kvstore WHERE k = ?"
        ).bind("panel.password_hash").first();
        if (!configured || !configured.v) {
          return new Response(null, {
            status: 302,
            headers: { Location: "/install" }
          });
        }
        const disguise = await getDisguiseConfig(env2, env2.DB);
        return getDecoyResponse(url.host, disguise.fallbackPage);
      }
      pathname = "/" + segments.slice(1).join("/");
      url.pathname = pathname || "/";
    }
    if (!bypassUUID && !accessUuid) {
      try {
        const configured = await env2.DB.prepare(
          "SELECT v FROM kvstore WHERE k = ?"
        ).bind("panel.password_hash").first();
        if (!configured || !configured.v) {
          return new Response(null, {
            status: 302,
            headers: { Location: "/install" }
          });
        }
      } catch (_e) {
      }
    }
    const intent = detectIntent(request, url, env2);
    const response = await processIntent(intent, request, env2, ctx);
    if (response.status === 404 && !url.pathname.startsWith("/api/") && !url.pathname.startsWith("/sub/")) {
      const disguise = await getDisguiseConfig(env2, env2.DB);
      if (disguise.on) {
        return getDecoyResponse(url.host, disguise.fallbackPage);
      }
    }
    return response;
  } catch (e) {
    return errorPage(e instanceof Error ? e.message : "Unknown error");
  }
}
__name(handleRequest, "handleRequest");

// worker/index.ts
var index_default = {
  async fetch(request, env2, ctx) {
    return handleRequest(request, env2, ctx);
  }
};
export {
  index_default as default
};
//# sourceMappingURL=index.js.map
