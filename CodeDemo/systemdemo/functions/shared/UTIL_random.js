// ============================================================
// UTIL_random.js — 通用工具函数 (函数文件夹/shared)
// 加权随机、UUID等基础工具，全局可用
// ============================================================

/**
 * 加权随机抽取
 * @param {Array} pool - [{ id, weight, ... }, ...]
 * @returns {Object} 被选中的元素
 */
function UTIL_weightedRandom(pool) {
    var totalWeight = 0;
    for (var i = 0; i < pool.length; i++) {
        totalWeight += pool[i].weight;
    }
    var roll = Math.random() * totalWeight;
    var cumulative = 0;
    for (var i = 0; i < pool.length; i++) {
        cumulative += pool[i].weight;
        if (roll < cumulative) {
            return pool[i];
        }
    }
    return pool[pool.length - 1]; // 兜底
}

/**
 * 对加权池应用额外加成（不修改原池）
 * @param {Array} pool - 原始池
 * @param {Object} bonus - { id: bonusWeight, ... }
 * @returns {Array} 新池
 */
function UTIL_applyBonus(pool, bonus) {
    if (!bonus || Object.keys(bonus).length === 0) return pool;
    return pool.map(function (item) {
        var b = bonus[item.id] || 0;
        var w = item.weight + b;
        if (w < 1) w = 1; // 保底权重，防止归零
        return Object.assign({}, item, { weight: w });
    });
}

/**
 * 将池子的权重格式化为可读字符串
 */
function UTIL_poolWeightsStr(pool) {
    return pool.map(function (item) {
        return (item.name || item.id) + ':' + item.weight;
    }).join(', ');
}

/**
 * 生成简易UUID
 */
function UTIL_generateUUID() {
    return 'npc_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 9);
}
