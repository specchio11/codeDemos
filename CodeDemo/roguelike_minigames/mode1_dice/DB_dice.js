/* ============================================================
   灵界幻阵 — 数据库 (DB_dice.js)
   ============================================================ */
var DB_DICE = (function () {
    'use strict';

    /* ---- 全部技能 ---- */
    var SKILLS = [
        {
            id: 1, name: '普通攻击', icon: '⚔️',
            reqDesc: '任意点数，固定3伤',
            check: function () { return true; },
            effect: function (dice, ctx) {
                ctx.dealDamage(3);
                ctx.log('普通攻击！造成 3 点伤害');
            }
        },
        {
            id: 2, name: '灵力护盾', icon: '🛡️',
            reqDesc: '任意点数，固定3盾',
            check: function () { return true; },
            effect: function (dice, ctx) {
                ctx.addShield(3);
                ctx.log('灵力护盾！获得 3 点护盾');
            }
        },
        {
            id: 3, name: '精准刺击', icon: '🎯',
            reqDesc: '点数 = 3',
            check: function (dice) { return dice.value === 3; },
            effect: function (dice, ctx) {
                ctx.dealDamage(3, true);
                ctx.log('精准刺击！造成 3 点穿甲伤害（无视护盾）');
            }
        },
        {
            id: 4, name: '重刃斩', icon: '🗡️',
            reqDesc: '点数 ≥ 4',
            check: function (dice) { return dice.value >= 4; },
            effect: function (dice, ctx) {
                var dmg = dice.value + 4;
                ctx.dealDamage(dmg);
                ctx.log('重刃斩！造成 ' + dmg + ' 点伤害');
            }
        },
        {
            id: 5, name: '连击', icon: '⚡',
            reqDesc: '点数 ≤ 3',
            check: function (dice) { return dice.value <= 3; },
            effect: function (dice, ctx) {
                ctx.dealDamage(dice.value);
                var newVal = Math.floor(Math.random() * 6) + 1;
                ctx.addBonusDice(newVal);
                ctx.log('连击！造成 ' + dice.value + ' 点伤害，返还 1 枚[' + newVal + ']骰子');
            }
        },
        {
            id: 6, name: '淬毒诀', icon: '🧪',
            reqDesc: '奇数(1,3,5)',
            check: function (dice) { return dice.value % 2 === 1; },
            effect: function (dice, ctx) {
                ctx.applyEnemyDebuff('poison', 2);
                ctx.log('淬毒诀！赋予敌人 2 层中毒');
            }
        },
        {
            id: 7, name: '破绽击', icon: '💥',
            reqDesc: '偶数(2,4,6)',
            check: function (dice) { return dice.value % 2 === 0; },
            effect: function (dice, ctx) {
                ctx.applyEnemyDebuff('armor_break', 1);
                ctx.dealDamage(3);
                ctx.log('破绽击！赋予敌人 1 层破甲，造成 3 点伤害');
            }
        },
        {
            id: 8, name: '极意·崩山', icon: '🌋',
            reqDesc: '点数 = 6',
            check: function (dice) { return dice.value === 6; },
            effect: function (dice, ctx) {
                ctx.dealDamage(15);
                ctx.applyEnemyDebuff('weak', 2);
                ctx.log('极意·崩山！造成 15 点伤害并赋予敌人 2 层虚弱');
            }
        }
    ];

    /* ---- 遗物 ---- */
    var RELICS = [
        { id: 'abacus',   name: '破旧的算盘', icon: '🧮', desc: '战斗胜利金币 +5' },
        { id: 'amulet',   name: '生机护身符', icon: '💚', desc: '进入战斗恢复 5 HP' },
        { id: 'lucky',    name: '幸运铜钱',   icon: '💲', desc: '每场战斗允许 1 次重掷' },
        { id: 'thunder',  name: '雷火珠',     icon: '⚡', desc: '使用[6]骰子时额外 4 点雷伤' },
        { id: 'turtle',   name: '铁王八',     icon: '🐢', desc: '回合结束未用骰子每个+3护盾' }
    ];

    /* ---- 普通怪物池 ---- */
    var NORMAL_ENEMIES = [
        {
            id: 'ghost', name: '画中伥鬼', emoji: '👻', hp: 24,
            pattern: [
                { type: 'attack', value: 5, desc: '鬼爪 — 攻击 5' },
                { type: 'shield', value: 4, desc: '残影 — 加盾 4' },
                { type: 'attack', value: 6, desc: '厉嚎 — 攻击 6' }
            ]
        },
        {
            id: 'water_boy', name: '碧水童子', emoji: '🧒', hp: 20,
            pattern: [
                { type: 'attack', value: 4, desc: '水弹 — 攻击 4' },
                { type: 'attack_poison', value: 3, poison: 2, desc: '毒雾 — 攻击 3 + 毒 2' },
                { type: 'attack', value: 5, desc: '水枪 — 攻击 5' }
            ]
        }
    ];

    /* ---- 精英怪物池 ---- */
    var ELITE_ENEMIES = [
        {
            id: 'blood_spirit', name: '嗜血画灵', emoji: '👹', hp: 45,
            pattern: [
                { type: 'attack', value: 8, desc: '吸血斩 — 攻击 8' },
                { type: 'attack', value: 10, desc: '暴食 — 攻击 10' },
                { type: 'buff_attack', value: 4, buffAmount: 2, desc: '嗜血觉醒 — 攻击+2永久, 攻击 4' }
            ]
        },
        {
            id: 'rock_demon', name: '巨岩妖', emoji: '⛰️', hp: 55,
            pattern: [
                { type: 'shield', value: 10, desc: '岩甲 — 加盾 10' },
                { type: 'attack', value: 7, desc: '落石 — 攻击 7' },
                { type: 'armor_break_attack', value: 5, layers: 2, desc: '碎岩 — 破甲 2 + 攻击 5' }
            ]
        }
    ];

    /* ---- Boss ---- */
    var BOSS = {
        id: 'ink_lord', name: '墨染邪尊', emoji: '🖤', hp: 120,
        pattern: [
            { type: 'attack_poison', value: 8, poison: 1, desc: '墨染天降 — 攻击 8 + 毒 1' },
            { type: 'attack', value: 12, desc: '邪尊怒击 — 攻击 12' },
            { type: 'shield', value: 15, desc: '暗影壁障 — 加盾 15' }
        ],
        phase2Threshold: 60,
        phase2Move: { type: 'special_drain', value: 10, desc: '吞噬灵气 — 少1骰+10伤' }
    };

    /* ---- 奇遇事件 ---- */
    var EVENTS = [
        {
            id: 'spring', title: '干涸的泉眼',
            text: '你在幻阵中发现一口干涸的灵泉，里面闪烁着微光，但泉眼周围生满毒刺。',
            choices: [
                { label: '伸手捞取（-8 HP，随机遗物）', effect: function (ctx) { ctx.loseHP(8); ctx.gainRandomRelic(); } },
                { label: '离开（无事发生）', effect: function () {} }
            ]
        },
        {
            id: 'vendor', title: '神秘游商',
            text: '一个背着巨大行囊的无面人拦住去路，提出用鲜血交换他的秘物。',
            choices: [
                { label: '割破手指（最大HP -5，随机新技能）', effect: function (ctx) { ctx.loseMaxHP(5); ctx.gainRandomSkill(); } },
                { label: '拒绝（无事发生）', effect: function () {} }
            ]
        },
        {
            id: 'stele', title: '古老的石碑',
            text: '石碑上刻着玄妙的武学残篇，但盯着看久了会让人头晕目眩。',
            choices: [
                { label: '潜心参悟（50%概率升级技能/50%受伤5）', effect: function (ctx) { ctx.steleGamble(); } },
                { label: '离开（无事发生）', effect: function () {} }
            ]
        }
    ];

    /* ---- 节点序列 ---- */
    var NODE_SEQUENCE = [
        { type: 'BATTLE',  label: '① 普通战斗',  icon: '⚔️' },
        { type: 'EVENT',   label: '② 奇遇事件',  icon: '❓' },
        { type: 'ELITE',   label: '③ 精英战斗',  icon: '💀' },
        { type: 'REST',    label: '④ 休息营地',  icon: '🏕️' },
        { type: 'EVENT',   label: '⑤ 奇遇事件',  icon: '❓' },
        { type: 'SHOP',    label: '⑥ 商店',      icon: '🏪' },
        { type: 'BOSS',    label: '⑦ 关底首领',  icon: '👹' }
    ];

    /* ---- 种族初始技能（槽3） ---- */
    var RACE_SKILLS = {
        xian: {
            id: 101, name: '御剑术', icon: '🌟',
            reqDesc: '点数 ≥ 4',
            check: function (dice) { return dice.value >= 4; },
            effect: function (dice, ctx) {
                var dmg = dice.value + 2;
                ctx.dealDamage(dmg);
                ctx.log('御剑术！造成 ' + dmg + ' 点伤害');
            }
        },
        ren: {
            id: 102, name: '随机应变', icon: '🔄',
            reqDesc: '点数 ≤ 3',
            check: function (dice) { return dice.value <= 3; },
            effect: function (dice, ctx) {
                ctx.dealDamage(3);
                var newVal = Math.floor(Math.random() * 6) + 1;
                ctx.addBonusDice(newVal);
                ctx.log('随机应变！造成 3 点伤害，返还 1 枚[' + newVal + ']骰子');
            }
        },
        yao: {
            id: 103, name: '野性撕咬', icon: '🐾',
            reqDesc: '任意，骰值穿甲',
            check: function () { return true; },
            effect: function (dice, ctx) {
                ctx.dealDamage(dice.value, true);
                ctx.log('野性撕咬！造成 ' + dice.value + ' 点穿甲伤害');
            }
        },
        mo: {
            id: 104, name: '噬魂术', icon: '💀',
            reqDesc: '奇数(1,3,5)',
            check: function (dice) { return dice.value % 2 === 1; },
            effect: function (dice, ctx) {
                ctx.dealDamage(2);
                ctx.applyEnemyDebuff('poison', 1);
                ctx.applyEnemyDebuff('weak', 1);
                ctx.log('噬魂术！造成 2 点伤害 + 1 层中毒 + 1 层虚弱');
            }
        }
    };

    /* ---- 前缀被动加成 ---- */
    var PASSIVES = {
        player:   { id: 'player',   name: '灵感顿悟', icon: '💡', desc: '休息站可额外学习新技能' },
        fengshan: { id: 'fengshan', name: '聚宝生辉', icon: '💰', desc: '战斗胜利额外 +3 金币' },
        chuanfei: { id: 'chuanfei', name: '灵息加速', icon: '💨', desc: '每场战斗第1回合获得4枚骰子' },
        dingfen:  { id: 'dingfen',  name: '命数已定', icon: '🔮', desc: '每场战斗可免费重掷1次' },
        wanshu:   { id: 'wanshu',   name: '百宝囊中', icon: '🎒', desc: '奇遇事件额外获得安全选项' },
        guidao:   { id: 'guidao',   name: '阴毒入骨', icon: '☠️', desc: '施加debuff时额外+1层' }
    };

    /* ---- 预设NPC名单（模拟局外已有角色） ---- */
    var NPCS = [
        { id: 'npc_murong', name: '慕容逸风', emoji: '🧙', race: 'xian', skillPrefix: 'fengshan' },
        { id: 'npc_wang',   name: '王云起',   emoji: '👨', race: 'ren',  skillPrefix: 'chuanfei' },
        { id: 'npc_hu',     name: '狐九娘',   emoji: '🦊', race: 'yao',  skillPrefix: 'guidao' },
        { id: 'npc_ming',   name: '冥魂子',   emoji: '😈', race: 'mo',   skillPrefix: 'dingfen' },
        { id: 'npc_luo',    name: '洛青衣',   emoji: '👩', race: 'xian', skillPrefix: 'dingfen' },
        { id: 'npc_tie',    name: '铁牛',     emoji: '💪', race: 'ren',  skillPrefix: 'fengshan' }
    ];

    return {
        SKILLS: SKILLS,
        RELICS: RELICS,
        RACE_SKILLS: RACE_SKILLS,
        PASSIVES: PASSIVES,
        NPCS: NPCS,
        NORMAL_ENEMIES: NORMAL_ENEMIES,
        ELITE_ENEMIES: ELITE_ENEMIES,
        BOSS: BOSS,
        EVENTS: EVENTS,
        NODE_SEQUENCE: NODE_SEQUENCE
    };
})();
