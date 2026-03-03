// ============================================================
// 易次元平台环境模拟 (YiCiYuan Platform Simulation)
// ============================================================
var ac = (function () {
    var _canUseStorage = false;
    try { var _t = '__ac_test__'; localStorage.setItem(_t, '1'); localStorage.removeItem(_t); _canUseStorage = true; }
    catch (e) { console.warn('[yiciyuan_sim] localStorage 不可用，回退到内存存储'); }

    var _memVar = {}, _memCVar = {};
    function _makeProxy(store, prefix, storage) {
        return new Proxy({}, {
            get: function (_, p) {
                if (typeof p === 'symbol') return undefined;
                if (_canUseStorage) { try { var v = storage.getItem(prefix + p); if (v === null) return store[p]; var n = Number(v); return (v !== '' && !isNaN(n)) ? n : v; } catch (e) { return store[p]; } }
                return store[p];
            },
            set: function (_, p, v) { store[p] = v; if (_canUseStorage) { try { storage.setItem(prefix + p, String(v)); } catch (e) {} } return true; }
        });
    }
    var _var = _makeProxy(_memVar, 'ac_var_', sessionStorage);
    var _cVar = _makeProxy(_memCVar, 'ac_cvar_', localStorage);
    var _arrStore = {};
    var _arr = new Proxy({}, {
        get: function (_, n) { if (!_arrStore[n]) _arrStore[n] = new Proxy({}, { get: function (t, i) { return t[i]; }, set: function (t, i, v) { t[i] = v; return true; } }); return _arrStore[n]; }
    });
    function _random(o) { var mn = o.min || 0, mx = o.max || 1; return Promise.resolve(Math.floor(Math.random() * (mx - mn + 1)) + mn); }
    function _delay(o) { return new Promise(function (r) { setTimeout(r, o.time || 0); }); }
    return { Var: _var, cVar: _cVar, arr: _arr, random: _random, delay: _delay, updateNotification: function () {} };
})();
