# error-logger
========

用于页面错误统计套件

    var logger = require('error-logger');

    var config = {
        token: '',
        url: ''
    };

    logger.init(config);
    window.onerror = logger.launch;

