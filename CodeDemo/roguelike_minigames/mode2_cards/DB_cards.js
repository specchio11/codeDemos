/* ============================================================
   舌战客栈 — 数据库 (DB_cards.js)
   ============================================================ */
var DB_CARDS = (function () {
    'use strict';

    /* ---- 全部卡牌定义 ---- */
    var ALL_CARDS = {
        strike: {
            id: 'strike', name: '反驳', type: 'Attack', cost: 1, icon: '⚔️',
            desc: '造成 6 点伤害',
            play: function (ctx) { ctx.dealDamage(6); ctx.log('反驳！造成 6 点伤害'); }
        },
        defend: {
            id: 'defend', name: '深呼吸', type: 'Defend', cost: 1, icon: '🛡️',
            desc: '获得 5 点护盾',
            play: function (ctx) { ctx.addShield(5); ctx.log('深呼吸！获得 5 点护盾'); }
        },
        heavy_hit: {
            id: 'heavy_hit', name: '痛处切入', type: 'Attack', cost: 2, icon: '🗡️',
            desc: '造成 12 点伤害',
            play: function (ctx) { ctx.dealDamage(12); ctx.log('痛处切入！造成 12 点伤害'); }
        },
        pressure: {
            id: 'pressure', name: '步步紧逼', type: 'Attack', cost: 1, icon: '👣',
            desc: '造成 4 点伤害，抽 1 张牌',
            play: function (ctx) { ctx.dealDamage(4); ctx.drawCards(1); ctx.log('步步紧逼！造成 4 点伤害，抽 1 张牌'); }
        },
        quote: {
            id: 'quote', name: '引经据典', type: 'Skill', cost: 0, icon: '📖',
            desc: '消耗此牌（本局消失），获得 2 AP', exhaust: true,
            play: function (ctx) { ctx.gainAP(2); ctx.log('引经据典！获得 2 AP（此牌消耗）'); }
        },
        ignore: {
            id: 'ignore', name: '无视', type: 'Skill', cost: 1, icon: '😑',
            desc: '获得 8 点护盾，下回合抽牌 -1',
            play: function (ctx) { ctx.addShield(8); ctx.nextDrawMod = -1; ctx.log('无视！获得 8 点护盾，下回合少抽 1 张'); }
        },
        mock: {
            id: 'mock', name: '讽刺', type: 'Skill', cost: 1, icon: '😏',
            desc: '赋予敌人 1 层破防（受伤+50%）',
            play: function (ctx) { ctx.applyEnemyDebuff('vulnerable', 1); ctx.log('讽刺！敌人获得 1 层破防'); }
        },
        logic_storm: {
            id: 'logic_storm', name: '逻辑风暴', type: 'Attack', cost: 2, icon: '🌪️',
            desc: '造成 5 点伤害，重复 3 次',
            play: function (ctx) {
                for (var i = 0; i < 3; i++) ctx.dealDamage(5);
                ctx.log('逻辑风暴！造成 5x3 = 15 点伤害');
            }
        },
        divert: {
            id: 'divert', name: '转移话题', type: 'Skill', cost: 1, icon: '🔄',
            desc: '敌人下回合伤害意图变为 0',
            play: function (ctx) { ctx.divertEnemy(); ctx.log('转移话题！敌人下回合不会造成伤害'); }
        },
        desperate: {
            id: 'desperate', name: '破釜沉舟', type: 'Attack', cost: 0, icon: '💀',
            desc: '失去 5 耐心值，造成 15 点伤害',
            play: function (ctx) { ctx.selfDamage(5); ctx.dealDamage(15); ctx.log('破釜沉舟！自损 5 HP，造成 15 点伤害'); }
        },
        calm: {
            id: 'calm', name: '沉着应对', type: 'Power', cost: 2, icon: '🧘',
            desc: '（能力）回合结束护盾保留到下回合', isPower: true,
            play: function (ctx) { ctx.addPower('retainShield'); ctx.log('沉着应对！护盾将在回合结束时保留'); }
        },
        eloquent: {
            id: 'eloquent', name: '口若悬河', type: 'Power', cost: 3, icon: '🗣️',
            desc: '（能力）每打出 Attack 牌额外 2 穿甲伤', isPower: true,
            play: function (ctx) { ctx.addPower('eloquent'); ctx.log('口若悬河！每张 Attack 牌额外 2 点穿甲溅射伤害'); }
        },
        noise: {
            id: 'noise', name: '噪音', type: 'Curse', cost: -1, icon: '📢',
            desc: '无法打出，占据手牌位', unplayable: true
        },
        stutter: {
            id: 'stutter', name: '语塞', type: 'Curse', cost: -1, icon: '🤐',
            desc: '无法打出，回合结束时扣 3 耐心', unplayable: true, endTurnPenalty: 3
        }
    };

    /* ---- 初始牌库 ---- */
    function makeStarterDeck() {
        var deck = [];
        for (var i = 0; i < 5; i++) deck.push('strike');
        for (var j = 0; j < 5; j++) deck.push('defend');
        return deck;
    }

    /* ---- 战斗三选一池 ---- */
    var REWARD_POOL = ['heavy_hit', 'pressure', 'quote', 'ignore', 'mock', 'logic_storm', 'divert', 'desperate', 'calm', 'eloquent'];

    /* ---- 敌人 ---- */
    var NORMAL_ENEMIES = [
        {
            id: 'accountant', name: '挑刺的账房', emoji: '🧮', hp: 25,
            portrait: '../assets/male1.png',
            pattern: [
                { type: 'attack', value: 5, desc: '挑错 — 攻击 5' },
                { type: 'shield', value: 5, desc: '做假账 — 加盾 5' }
            ]
        },
        {
            id: 'shrew', name: '撒泼的村妇', emoji: '🗣️', hp: 30,
            portrait: '../assets/female1.png',
            pattern: [
                { type: 'attack', value: 6, desc: '高声尖叫 — 攻击 6' },
                { type: 'add_curse', curseId: 'noise', desc: '胡搅蛮缠 — 塞噪音牌' }
            ]
        }
    ];

    var ELITE_ENEMIES = [
        {
            id: 'merchant', name: '黑心商贾', emoji: '💰', hp: 60,
            portrait: '../assets/male2.png',
            pattern: [
                { type: 'attack', value: 10, desc: '金钱压人 — 攻击 10' },
                { type: 'debuff_ap', value: 1, desc: '暗箱操作 — 降低 AP 1' },
                { type: 'attack', value: 8, desc: '嘲讽 — 攻击 8' }
            ]
        }
    ];

    var BOSS = {
        id: 'lawyer', name: '京城第一讼棍', emoji: '⚖️', hp: 150,
        portrait: '../assets/male3.png',
        passiveShield: 5,
        pattern: [
            { type: 'attack_strip', value: 8, desc: '引经据典 — 攻击 8 并清零玩家护盾' },
            { type: 'attack_curse', value: 12, curseId: 'stutter', desc: '偷换概念 — 攻击 12 + 塞语塞牌' },
            { type: 'attack', value: 15, desc: '雷霆反击 — 攻击 15' }
        ]
    };

    /* ---- 节点序列 ---- */
    var NODE_SEQUENCE = [
        { type: 'BATTLE', label: '① 普通辩论', icon: '⚔️' },
        { type: 'BATTLE', label: '② 普通辩论', icon: '⚔️' },
        { type: 'REST',   label: '③ 客栈喝茶', icon: '🍵' },
        { type: 'BATTLE', label: '④ 普通辩论', icon: '⚔️' },
        { type: 'BATTLE', label: '⑤ 普通辩论', icon: '⚔️' },
        { type: 'ELITE',  label: '⑥ 精英辩论', icon: '💀' },
        { type: 'REST',   label: '⑦ 客栈喝茶', icon: '🍵' },
        { type: 'BOSS',   label: '⑧ 最终Boss', icon: '👹' }
    ];

    /* ---- 遗物 ---- */
    var RELICS = [
        { id: 'mint', name: '醒神薄荷', icon: '🌿', desc: '每场战斗第一回合抽牌 +2' },
        { id: 'gavel', name: '惊堂木', icon: '🔨', desc: '每场战斗第一次伤害翻倍' },
        { id: 'thick_skin', name: '厚脸皮', icon: '😤', desc: '未打防御牌的回合结束获得 3 护盾' }
    ];

    return {
        ALL_CARDS: ALL_CARDS,
        makeStarterDeck: makeStarterDeck,
        REWARD_POOL: REWARD_POOL,
        NORMAL_ENEMIES: NORMAL_ENEMIES,
        ELITE_ENEMIES: ELITE_ENEMIES,
        BOSS: BOSS,
        NODE_SEQUENCE: NODE_SEQUENCE,
        RELICS: RELICS
    };
})();
