const Promise = require("../external/es6-promise.min");
/**
 * 请求队列 解决小程序5个并行连接问题
 */
class HttpQueue {
  constructor(max = 10) {
    // 缓存参数
    this.map = {};
    // 缓存句柄
    this.mq = [];
    // 进程队列
    this.running = [];
    // 队列容量
    this.MAX_QUEUE = max;
  }

  // 缓存 参数 随机句柄Id
  push(args) {
    args.t = +new Date();
    // 缓存句柄 取随机句柄，最多10个，如果存在重新生成随机句柄
    while (this.mq.indexOf(args.t) > -1 || this.running.indexOf(args.t) > -1) {
      args.t += (10 * Math.random()) >> 0;
    }
    // 添加缓存句柄
    this.mq.push(args.t);
    // 按句柄 缓存参数
    this.map[args.t] = args;
  }

  // 请求
  next() {
    // 如果 异步小于5个直接请求 否则加入队列请求
    if (0 !== this.mq.length && this.running.length < this.MAX_QUEUE - 1) {
      // 取缓存句柄
      const t = this.mq.shift();
      // 取缓存参数
      const currArgs = this.map[t];
      // 取自定义 complete
      const complete = currArgs.complete;
      // 重新定义 complete
      currArgs.complete = (...args) => {
        // 删除 缓存句柄
        this.running.splice(this.running.indexOf(currArgs.t), 1);
        // 删除 缓存参数
        delete this.map[currArgs.t];
        // 如果 自定义complete存在 则调用
        complete && complete.apply(currArgs, args);
        // 递归调用 请求
        this.next();
      };
      // 线程数加1 缓存句柄
      this.running.push(currArgs.t);
      // 发送请求
      wx.request(currArgs);
    }
  }

  // 请求封装 缓存参数 重构参数 config
  request(config = {}) {
    if (typeof config === "string") {
      config = Object.assign(
        {
          url: arguments[0]
        },
        arguments[1]
      );
    }
    this.push(config);
    return this.next();
  }
}

/**
 * 请求 函数处理
 */
class Http {
  constructor(config = {}) {
    this.interceptors = {
      request: new InterruptsManager(),
      response: new InterruptsManager()
    };
    this.defaultConfig = Object.assign({}, config);
    this.httpQueue = new HttpQueue();
    this.init()
  }

  // 代理请求
  dispatch(args) {
    return new Promise((resolve, reject) => {
      ["fail", "success", "complete"].forEach(func => {
        args[func] = function(res) {
          "success" === func ? resolve(res) : "fail" === func && reject(res);
        };
      });
      this.httpQueue.request(args);
    });
  }

  init() {
    [
      "OPTIONS",
      "GET",
      "HEAD",
      "POST",
      "PUT",
      "DELETE",
      "TRACE",
      "CONNECT"
    ].forEach(method => {
      this[method.toLowerCase()] = function(config) {
        if (typeof config === "string") {
          config = Object.assign(
            {
              url: arguments[0]
            },
            arguments[1]
          );
        }
        return this.request(Object.assign(config, { method: method }));
      };
    });
  }

  // 请求
  request(config) {
    if (typeof config === "string") {
      config = Object.assign(
        {
          url: arguments[0]
        },
        arguments[1]
      );
    }

    // hook函数
    let chain = [this.dispatch.bind(this), undefined];
    let promise = Promise.resolve(config);

    this.interceptors.request.forEach(function(interceptor) {
      chain.unshift(interceptor.fulfilled, interceptor.rejected);
    });

    this.interceptors.response.forEach(function(interceptor) {
      chain.push(interceptor.fulfilled, interceptor.rejected);
    });

    while (chain.length) {
      promise = promise.then(chain.shift(), chain.shift());
    }

    return promise;
  }
}
/**
 * 拦截器 管理函数（axios）
 */
class InterruptsManager {
  constructor() {
    this.handlers = [];
  }

  // 添加拦截器 返回拦截器id
  use(fulfilled, rejected) {
    this.handlers.push({
      fulfilled: fulfilled,
      rejected: rejected
    });
    return this.handlers.length - 1;
  }

  // 通过id删除拦截器
  eject(id) {
    if (this.handlers[id]) {
      this.handlers[id] = null;
    }
  }

  // 循环拦截器 执行操作
  forEach(fn) {
    this.handlers.forEach(item => {
      if (item) {
        item && fn(item);
      }
    });
  }
}

export default Http;
