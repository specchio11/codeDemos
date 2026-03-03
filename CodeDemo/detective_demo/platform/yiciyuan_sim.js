// ============================================================
// 易次元平台环境模拟 (YiCiYuan Platform Simulation)
// 模拟 ac.Var / ac.cVar / ac.arr 全局存储
// 用于本地demo开发，保证代码模式与易次元一致
// ============================================================

var ac = (function () {

    var _canUseStorage = false;
    try {
        var _testKey = '__ac_storage_test__';
        localStorage.setItem(_testKey, '1');
        localStorage.removeItem(_testKey);
        _canUseStorage = true;
    } catch (e) {
        console.warn('[yiciyuan_sim] localStorage 不可用，回退到内存存储');
    }

    var _memVarStore = {};
    var _memCVarStore = {};

    var _var = new Proxy({}, {
        get: function (target, prop) {
            if (typeof prop === 'symbol') return undefined;
            if (_canUseStorage) {
                try {
                    var val = sessionStorage.getItem('ac_var_' + String(prop));
                    if (val === null) return undefined;
                    var num = Number(val);
                    return (val !== '' && !isNaN(num)) ? num : val;
                } catch (e) { return _memVarStore[prop]; }
            }
            return _memVarStore[prop];
        },
        set: function (target, prop, value) {
            _memVarStore[prop] = value;
            if (_canUseStorage) {
                try { sessionStorage.setItem('ac_var_' + String(prop), String(value)); } catch (e) {}
            }
            return true;
        }
    });

    var _cVar = new Proxy({}, {
        get: function (target, prop) {
            if (typeof prop === 'symbol') return undefined;
            if (_canUseStorage) {
                try {
                    var val = localStorage.getItem('ac_cvar_' + String(prop));
                    if (val === null) return _memCVarStore[prop];
                    var num = Number(val);
                    return (val !== '' && !isNaN(num)) ? num : val;
                } catch (e) { return _memCVarStore[prop]; }
            }
            return _memCVarStore[prop];
        },
        set: function (target, prop, value) {
            _memCVarStore[prop] = value;
            if (_canUseStorage) {
                try { localStorage.setItem('ac_cvar_' + String(prop), String(value)); } catch (e) {}
            }
            return true;
        }
    });

    var _arrStore = {};
    var _arr = new Proxy({}, {
        get: function (target, arrName) {
            if (!_arrStore[arrName]) {
                _arrStore[arrName] = new Proxy({}, {
                    get: function (t, idx) { return t[idx]; },
                    set: function (t, idx, val) { t[idx] = val; return true; }
                });
            }
            return _arrStore[arrName];
        }
    });

    function _random(options) {
        var min = options.min || 0;
        var max = options.max || 1;
        return Promise.resolve(Math.floor(Math.random() * (max - min + 1)) + min);
    }

    function _delay(options) {
        return new Promise(function (resolve) {
            setTimeout(resolve, options.time || 0);
        });
    }

    function _updateNotification() {}

    return {
        Var: _var,
        cVar: _cVar,
        arr: _arr,
        random: _random,
        delay: _delay,
        updateNotification: _updateNotification
    };
})();
