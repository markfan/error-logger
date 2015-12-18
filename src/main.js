/**
 * ER-Track
 * Copyright 2013 Baidu Inc. All rights reserved.
 *
 * @file 错误监控模块
 * @author fanxueliang(fanxueliang@baidu.com)
 */

(function (root) {

    function ErrorLogger() {

        /**
         * 浏览器userAgent
         *
         * @protected
         * @type {string}
         */
        this.ua = window.navigator.userAgent.toLowerCase();

        /**
         * 操作系统
         *
         * @protected
         * @type {string}
         */
        this.os = window.navigator.platform;
    }
    /**
     * 获取浏览器型号和版本号
     *
     * @protected
     * @return {string}
     */
    ErrorLogger.prototype.getBrowser = function () {
        if (/chrome\/(\d+\.\d)/i.test(this.ua)) {
            return 'chrome ' + RegExp['\x241'];
        }
        else if (/firefox\/(\d+\.\d)/i.test(this.ua)) {
            return 'firefox ' + RegExp['\x241'];
        }
        else if (/msie\/(\d+\.\d)/i.test(this.ua)) {
            return 'IE ' + (document.documentMode || RegExp['\x241']);
        }
        else if (/opera\/(\d+\.\d)/i.test(this.ua)) {
            return 'opera ' + RegExp['\x241'];
        }
        else if (/(\d+\.\d)?(?:\.\d)?\s+safari\/?(\d+\.\d+)?/i.test(this.ua) && !/chrome/i.test(this.ua)) {
            return 'safari ' + RegExp['\x241'];
        }
        else if (/gecko/i.test(this.ua) && !/like gecko/i.test(this.ua)) {
            return 'gecko';
        }
        else if (/webkit/i.test(this.ua)) {
            return 'webkit';
        }
        else if (external && external.max_version && /(\d+\.\d)/.test(external.max_version)) {
            return 'maxthon ' + RegExp['\x241']
        }
        else {
            return 'Not identified browser';
        }
    };

    /**
     * 对外提供的自动捕获异常的方法
     *
     * @protected
     * @param {Function | string} func 方法或方法名
     * @param {Object | null} bindscope 作用域
     */
    ErrorLogger.prototype.catchExceptions = function (func, bindscope) {
        var xargs = arguments.length > 2 ? [].slice.call(arguments, 2) : null;
        var fn = '[object String]' == Object.prototype.toString.call(func) ? bindscope[func] : func;
        var args = (xargs) ? xargs.concat([].slice.call(arguments, 0)) : arguments;
        try {
            fn.apply(bindscope || fn, args);
        } catch (e) {
            this.report(this.normalizeError('', '', '', '', e));
        }
    };

    /**
     * 发送错误日志请求
     *
     * @protected
     * @param {string} url 请求地址
     */
    ErrorLogger.prototype.send = function (url) {
        var image = new Image();
        var name = "error_logger_" + Math.floor(Math.random() * 2147483648).toString(36);
        window[name] = image;

        function sendAbort() {
            image.onload = null;
            image.onerror = null;
            image.onabort = null;
            image = null;
            window[name] = null;
        }
        image.onload = sendAbort;
        image.onerror = sendAbort;
        image.onabort = sendAbort;
        image.src = url
    };

    /**
     * 对象序列化
     *
     * @protected
     * @param {Object} source 源数据
     * @return {string}
     */
    ErrorLogger.prototype.stringify = function (source) {
        var me = this;
        if ("JSON" in window) {
            return JSON.stringify(source);
        }
        var type = typeof(source);
        if (type != "object" || source === null) {
            if (type == "string") {
                source = '"' + source + '"';
            }
            return String(source);
        } else {
            var escapeMap = {
                "\b": '\\b',
                "\t": '\\t',
                "\n": '\\n',
                "\f": '\\f',
                "\r": '\\r',
                '"': '\\"',
                "\\": '\\\\'
            };

            function encodeString(source) {
                if (/["\\\x00-\x1f]/.test(source)) {
                    source = source.replace(/["\\\x00-\x1f]/g, function (match) {
                        var value = escapeMap[match];
                        if (value) {
                            return value;
                        }
                        value = match.charCodeAt();
                        return "\\u00" + Math.floor(value / 16).toString(16) + (value % 16).toString(16);
                    })
                }
                return '"' + source + '"';
            }

            function encodeArray(source) {
                var result = ["["];
                var len = source.length;
                var preComma;
                var i;
                var item;
                for (i = 0; i < len; i++) {
                    item = source[i];
                    switch (typeof item) {
                        case "undefined":
                        case "function":
                        case "unknown":
                            break;
                        default:
                            if (preComma) {
                                result.push(",");
                            }
                            result.push(me.stringify(item));
                            preComma = 1;
                    }
                }
                result.push("]");
                return result.join("");
            }

            switch (typeof source) {
                case "undefined":
                    return "undefined";
                case "number":
                    return isFinite(source) ? String(source) : "null";
                case "string":
                    return encodeString(source);
                case "boolean":
                    return String(source);
                default:
                    if (source === null) {
                        return "null";
                    }
                    else {
                        if (source instanceof Array) {
                            return encodeArray(source);
                        }
                        else {
                            var result = ["{"];
                            var encode = me.stringify;
                            var preComma;
                            var item;
                            for (var key in source) {
                                if (Object.prototype.hasOwnProperty.call(source, key)) {
                                    item = source[key];
                                    switch (typeof item) {
                                        case "undefined":
                                        case "unknown":
                                        case "function":
                                            break;
                                        default:
                                            if (preComma) {
                                                result.push(",");
                                            }
                                            preComma = 1;
                                            result.push(encode(key) + ":" + encode(item));
                                    }
                                }
                            }
                            result.push("}");
                            return result.join("");
                        }
                    }
            }
        }
    }

    /**
     * 参数收集，请求地址拼接
     *
     * @protected
     * @param {Object} data 日志数据
     */
    ErrorLogger.prototype.report = function (data) {
        // 向服务器发送数据
        data.browser = this.getBrowser();
        data.location = window.top.location.href;
        if (this.token && this.url) {
            // send data
            var params = [];
            var argsArr = [
                'token', 'browser', 'os', 'ua',
                'location', 'message', 'name',
                'line', 'script', 'column'
            ];
            for (var i = 0; i < argsArr.length; i++) {
                params.push(argsArr[i] + '=' + encodeURIComponent(this[argsArr[i]] || data[argsArr[i]]));
            }
            params.push('stack=' + encodeURIComponent(this.stringify(data.stack)));
            params.push('date=' + new Date().valueOf());
            if (this.url.indexOf('?') != -1) {
                this.send(this.url + '&' + params.join('&'));
            }
            else {
                this.send(this.url + '?' + params.join('&'));
            }
        }
    };

    /**
     * 格式化错误日志堆栈数据
     *
     * @protected
     * @param {string} input 堆栈数据
     * @param {Array} outputArr
     */
    ErrorLogger.prototype.formatStack = function (input) {
        var inputArr = input.split('\n');
        var outputArr = [];
        var lineAddr;
        var firstFlag = false;

        function parseLineandCol(inputStr) {
            var parseArr = inputStr.split(':');
            var len = parseArr.length;
            var script = parseArr.slice(0, len-2).join(':');
            return {
                line: parseArr[len-2],
                column: parseArr[len-1],
                script: script
            };
        }

        for (var i = 0; i < inputArr.length; i++) {
            var regexp = /((http|ftp|https|file):([^'"\s\u4E00-\u9FA5])+)/ig;
            if (regexp.test(inputArr[i]) && !firstFlag) {
                // 去除首尾空格，再去除 方法名称前面的 "at " 去除"(",")" （IE9+、chrome）
                //  最后将"@" 替换成空格，并以空格作为分隔符
                var items = inputArr[i].replace(/^\s*/, '')
                    .replace(/\s*$/, '')
                    .replace(/^(at)\s+/, '')
                    .replace('(', '')
                    .replace(')', '')
                    .replace('@', ' ')
                    .split(' ');
                var len = items.length;

                if (len === 1) {
                    outputArr.push({
                        functionName: '',
                        errLocation: items[0]
                    });
                    lineAddr = parseLineandCol(items[0]);
                } else if (len === 2) {
                    outputArr.push({
                        functionName: items[0],
                        errLocation: items[1]
                    });
                    lineAddr = parseLineandCol(items[1]);
                } else {
                    var functionName = items.splice(0, 1);
                    outputArr.push({
                        functionName: functionName.join(''),
                        errLocation: items.join('')
                    });
                    lineAddr = parseLineandCol(items.join(''));
                }
                firstFlag = true;
            }
        };
        return {
            outputArr: outputArr,
            lineAddr: lineAddr
        };
    }

    /**
     * 格式化错误日志数据
     *
     * @protected
     * @param {string} message 错误信息
     * @param {string} scriptURI 错误脚本
     * @param {string} line 错误所在行
     * @param {string} column 错误所在列
     * @param {Object} error 错误信息
     * @param {Object} 格式化后的数据
     */
    ErrorLogger.prototype.normalizeError = function (message, scriptURI, line, column, error) {
        var errorData = {
            message: '',
            name: '',
            stack: '',
            line: '',
            script: '',
            column: column
        };
        var lineAddr = {};
        errorData.message = message || error.message || '';
        errorData.name = error.name;
        if (error.stack) {
            var stackData = this.formatStack(error.stack);
            errorData.stack = stackData.outputArr;
            lineAddr = stackData.lineAddr;
        } else {
            errorData.stack = [];
        }
        errorData.line = line || error.line || error.lineNumber || lineAddr.line || '';
        errorData.column = column || error.column || error.columnNumber || lineAddr.column || '';
        errorData.script = scriptURI || error.script || error.fileName || error.sourceURL || lineAddr.script || '';
        errorData.error = this.stringify(error);
        return errorData;
    };

    /**
     * 错误日志收集入口（window.onerror的句柄）
     *
     * @protected
     * @param {string | Object} messageOrError 错误信息或Error对象
     * @param {string} scriptURI 错误脚本
     * @param {string} line 错误所在行
     * @param {string} column 错误所在列
     * @param {Object} error 错误信息
     */
    ErrorLogger.prototype.launch = function (messageOrError, scriptURI, line, column, error) {
        var errorObject;
        if (messageOrError && typeof messageOrError === 'object') {
            errorObject = this.normalizeError('', '', 0, 0, messageOrError);
        }
        else if (error) {
            errorObject = this.normalizeError(messageOrError, scriptURI, line, column, error);
        } else {
            errorObject = {
                message: messageOrError,
                name: '',
                stack: [],
                script: scriptURI,
                line: line,
                column: column
            };
        }
        this.report(errorObject);
    };

    /**
     * 初始化参数
     *
     * @protected
     * @param {Object} config 初始化参数对象
     */
    ErrorLogger.prototype.init = function (config) {
        this.token = config.token;
        this.url = config.url;
    };

    var errorLogger = new ErrorLogger();

    if (typeof exports === 'object' && typeof module === 'object') {
        // For CommonJS
        exports = module.exports = errorLogger;
    }
    else if (typeof define === 'function' && define.amd) {
        // For AMD
        define(errorLogger);
    }
    else {
        // For <script src="..."
        root.errorLogger = errorLogger;
    }

})(this);
