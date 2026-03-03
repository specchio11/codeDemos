/* ============================================================
   气运钱庄 — 数据库 (DB_fortune.js)
   ============================================================ */
var DB_FORTUNE = (function () {
    'use strict';

    /* ---- Stage 定义 ---- */
    var STAGES = [
        { id: 1, label: 'Stage 1', target: 100,  spins: 4, rewardTier: 'common' },
        { id: 2, label: 'Stage 2', target: 300,  spins: 5, rewardTier: 'uncommon' },
        { id: 3, label: 'Stage 3', target: 800,  spins: 5, rewardTier: 'rare' },
        { id: 4, label: 'Stage 4', target: 2000, spins: 6, rewardTier: 'epic' },
        { id: 5, label: 'Stage 5 (终局)', target: 5000, spins: 6, rewardTier: 'final' }
    ];

    /* ---- 物品字典 ---- */
    var ITEMS = {
        coin:      { id: 'coin',      name: '铜钱',     emoji: '🪙', baseScore: 1,  tier: 'base',   desc: '普通钱币' },
        grass:     { id: 'grass',     name: '野草',     emoji: '🌿', baseScore: 1,  tier: 'base',   desc: '微薄灵气' },
        wine_cup:  { id: 'wine_cup',  name: '空杯',     emoji: '🍵', baseScore: 2,  tier: 'base',   desc: '空酒盏' },
        mouse:     { id: 'mouse',     name: '老鼠',     emoji: '🐭', baseScore: 0,  tier: 'base',   desc: '不提供分数' },

        cat:       { id: 'cat',       name: '招财猫',   emoji: '🐱', baseScore: 1,  tier: 'common', desc: '吞噬老鼠/锦鲤 +25分', priority: 1 },
        cheese:    { id: 'cheese',    name: '奶酪',     emoji: '🧀', baseScore: 3,  tier: 'common', desc: '被老鼠吃掉后老鼠变胖+15分', priority: 1 },
        fish:      { id: 'fish',      name: '锦鲤',     emoji: '🐟', baseScore: 5,  tier: 'common', desc: '高分但容易被猫吃' },
        silver:    { id: 'silver',    name: '银锭',     emoji: '🥈', baseScore: 3,  tier: 'common', desc: '升级版铜钱' },

        thief:     { id: 'thief',     name: '盗贼',     emoji: '🥷', baseScore: -3, tier: 'uncommon', desc: '扣分！吞噬铜钱+20/宝石+100', priority: 1 },
        cop:       { id: 'cop',       name: '捕快',     emoji: '👮', baseScore: 2,  tier: 'uncommon', desc: '若有盗贼则逮捕+50分', priority: 2 },
        merchant:  { id: 'merchant',  name: '商贾',     emoji: '🤵', baseScore: 2,  tier: 'uncommon', desc: '场上每个钱币类+4分', priority: 3 },
        brewer:    { id: 'brewer',    name: '酿酒师',   emoji: '🍶', baseScore: 2,  tier: 'uncommon', desc: '场上每个空杯/野草+5分', priority: 3 },
        gold:      { id: 'gold',      name: '金锭',     emoji: '🥇', baseScore: 6,  tier: 'rare',    desc: '高级钱币' },

        gem:       { id: 'gem',       name: '灵气宝石', emoji: '💎', baseScore: 10, tier: 'rare',    desc: '纯给10分' },
        fat_mouse: { id: 'fat_mouse', name: '胖老鼠',   emoji: '🐹', baseScore: 3,  tier: 'special', desc: '吃了奶酪的老鼠' },

        magic_box: { id: 'magic_box', name: '聚宝盆',   emoji: '🏺', baseScore: 1,  tier: 'epic',    desc: '每次吞噬事件永久+1分', priority: 4 },
        emperor:   { id: 'emperor',   name: '皇帝',     emoji: '👑', baseScore: 5,  tier: 'epic',    desc: '本次总分x2', priority: 5 }
    };

    /* ---- 奖励池：按 tier 分组 ---- */
    var REWARD_POOLS = {
        common:   ['cat', 'cheese', 'fish', 'silver', 'coin'],
        uncommon: ['cat', 'fish', 'silver', 'cop', 'merchant', 'brewer', 'thief'],
        rare:     ['merchant', 'brewer', 'cop', 'gold', 'gem', 'silver'],
        epic:     ['gold', 'gem', 'magic_box', 'emperor', 'merchant'],
        final:    []  // no reward after final stage
    };

    /* ---- 初始袋子 ---- */
    function makeStarterBag() {
        var bag = [];
        for (var i = 0; i < 7; i++) bag.push({ id: 'coin', bonusScore: 0 });
        bag.push({ id: 'grass', bonusScore: 0 });
        bag.push({ id: 'mouse', bonusScore: 0 });
        bag.push({ id: 'wine_cup', bonusScore: 0 });
        return bag;
    }

    return {
        STAGES: STAGES,
        ITEMS: ITEMS,
        REWARD_POOLS: REWARD_POOLS,
        makeStarterBag: makeStarterBag,
        DISPLAY_SLOTS: 6
    };
})();
