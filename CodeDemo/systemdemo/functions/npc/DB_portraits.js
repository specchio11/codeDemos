// ============================================================
// DB_portraits.js — 立绘资源ID映射 (函数文件夹/npc)
// 模拟易次元的 $id 形式资源管理
// ============================================================

// 男性立绘 — raceAffinity: 种族亲和度权重
// male1: 仙>妖>人>魔
// male2: 魔>>妖=仙>人
// male3: 妖>>魔
var NPC_PORTRAIT_MALE = Object.freeze([
    { id: '$img_male_001', file: 'male1.png',
      raceAffinity: { xian: 10, yao: 7, ren: 5, mo: 3 } },
    { id: '$img_male_002', file: 'male2.png',
      raceAffinity: { mo: 12, yao: 5, xian: 5, ren: 3 } },
    { id: '$img_male_003', file: 'male3.png',
      raceAffinity: { yao: 12, mo: 5, xian: 1, ren: 1 } },
]);

// 女性立绘 — raceAffinity: 种族亲和度权重
// female1: 四种族均可无倾向
// female2: 妖>仙>人>>魔
// female3: 仙>>人>>魔 (妖不可)
var NPC_PORTRAIT_FEMALE = Object.freeze([
    { id: '$img_female_001', file: 'female1.png',
      raceAffinity: { xian: 5, ren: 5, yao: 5, mo: 5 } },
    { id: '$img_female_002', file: 'female2.png',
      raceAffinity: { yao: 12, xian: 7, ren: 5, mo: 1 } },
    { id: '$img_female_003', file: 'female3.png',
      raceAffinity: { xian: 12, ren: 4, mo: 2, yao: 0 } },
]);

// 全部立绘查找表
var NPC_PORTRAIT_MAP = Object.freeze(
    (function () {
        var map = {};
        NPC_PORTRAIT_MALE.forEach(function (p) { map[p.id] = p; });
        NPC_PORTRAIT_FEMALE.forEach(function (p) { map[p.id] = p; });
        return map;
    })()
);

/**
 * 根据立绘ID获取本地图片路径
 * @param {string} portraitId - 立绘ID (如 '$img_male_001')
 * @param {string} basePath - 图片基础路径（相对于当前HTML文件）
 * @returns {string} 本地图片路径
 */
function MG_getPortraitPath(portraitId, basePath) {
    var base = basePath || '/npcIllu/';
    var entry = NPC_PORTRAIT_MAP[portraitId];
    if (!entry) return base + 'default.png';
    return base + entry.file;
}
