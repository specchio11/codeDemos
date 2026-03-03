// ============================================================
// 模式二：庭院大管家 — 数据库 (DB_crisis.js)
// ============================================================

var DB_CRISIS = (function () {

    // ---- NPC 角色池 (demo 默认提供 6 名) ----
    var NPC_POOL = [
        {
            id: 'npc_001', name: '李护院', rarity: 'SR', portrait: '../assets/male1.png',
            stats: { STR: 80, INT: 20, AGI: 50, CHA: 30 },
            stamina: 100, maxStamina: 100, assigned_zone: null
        },
        {
            id: 'npc_002', name: '张账房', rarity: 'R', portrait: '../assets/male2.png',
            stats: { STR: 15, INT: 90, AGI: 25, CHA: 40 },
            stamina: 100, maxStamina: 100, assigned_zone: null
        },
        {
            id: 'npc_003', name: '赵大厨', rarity: 'R', portrait: '../assets/male3.png',
            stats: { STR: 60, INT: 30, AGI: 70, CHA: 20 },
            stamina: 100, maxStamina: 100, assigned_zone: null
        },
        {
            id: 'npc_004', name: '柳如烟', rarity: 'SSR', portrait: '../assets/female1.png',
            stats: { STR: 10, INT: 60, AGI: 40, CHA: 95 },
            stamina: 100, maxStamina: 100, assigned_zone: null
        },
        {
            id: 'npc_005', name: '苏婉儿', rarity: 'SR', portrait: '../assets/female2.png',
            stats: { STR: 30, INT: 75, AGI: 55, CHA: 60 },
            stamina: 100, maxStamina: 100, assigned_zone: null
        },
        {
            id: 'npc_006', name: '铁影', rarity: 'SSR', portrait: '../assets/female3.png',
            stats: { STR: 95, INT: 15, AGI: 85, CHA: 10 },
            stamina: 100, maxStamina: 100, assigned_zone: null
        }
    ];

    // ---- 地图区域 ----
    var ZONES = [
        { id: 'zone_gate',    name: '大门',   desc: '府邸正门，外界出入之要冲。',     pos: { left: '8%',  top: '55%', width: '18%', height: '30%' } },
        { id: 'zone_yard',    name: '前院',   desc: '练武场与石板院落，体力活聚集地。', pos: { left: '28%', top: '55%', width: '20%', height: '30%' } },
        { id: 'zone_account', name: '账房',   desc: '掌管账目与库银之所。',           pos: { left: '70%', top: '10%', width: '20%', height: '25%' } },
        { id: 'zone_garden',  name: '后花园', desc: '幽静花园，暗藏玄机。',           pos: { left: '50%', top: '10%', width: '18%', height: '25%' } },
        { id: 'zone_master',  name: '正厅',   desc: '府邸核心，老爷起居之地，失守代价极大。', pos: { left: '28%', top: '10%', width: '20%', height: '30%' } }
    ];

    // ---- 属性中文名 ----
    var STAT_NAMES = { STR: '力量', INT: '智力', AGI: '敏捷', CHA: '魅力' };

    // ---- 危机事件池 (20 种) ----
    var CRISIS_POOL = [
        { id: 'evt_001', name: '醉汉闹事',   zone_tags: ['zone_gate', 'zone_yard'], desc_text: '一群泼皮在门口砸门，需要人手驱逐或安抚。', req_stat: 'STR', req_value: 80,  timer_turns: 2, reward_score: 50,  penalty_health: -15 },
        { id: 'evt_002', name: '账本失窃',   zone_tags: ['zone_account'],           desc_text: '存放密卷的柜子锁被破坏，必须马上审查账目找回失物。', req_stat: 'INT', req_value: 90,  timer_turns: 1, reward_score: 100, penalty_health: -30 },
        { id: 'evt_003', name: '后院走水',   zone_tags: ['zone_garden', 'zone_yard'], desc_text: '柴堆起火，火势蔓延，需要敏捷的人手扑灭！', req_stat: 'AGI', req_value: 70,  timer_turns: 2, reward_score: 60,  penalty_health: -20 },
        { id: 'evt_004', name: '贵客来访',   zone_tags: ['zone_gate', 'zone_master'], desc_text: '知府大人微服来访，需妥善接待以维护声望。', req_stat: 'CHA', req_value: 85,  timer_turns: 2, reward_score: 80,  penalty_health: -25 },
        { id: 'evt_005', name: '夜盗潜入',   zone_tags: ['zone_garden', 'zone_account'], desc_text: '有黑影翻墙而入，必须有人追捕！', req_stat: 'AGI', req_value: 85,  timer_turns: 1, reward_score: 90,  penalty_health: -25 },
        { id: 'evt_006', name: '仆役争执',   zone_tags: ['zone_yard', 'zone_master'], desc_text: '两名仆役起了冲突，需要有人调解或镇压。', req_stat: 'CHA', req_value: 60,  timer_turns: 2, reward_score: 40,  penalty_health: -10 },
        { id: 'evt_007', name: '税吏查账',   zone_tags: ['zone_account', 'zone_master'], desc_text: '官府税吏突然上门查账，需要精通账目之人应对。', req_stat: 'INT', req_value: 100, timer_turns: 2, reward_score: 120, penalty_health: -35 },
        { id: 'evt_008', name: '暴雨塌墙',   zone_tags: ['zone_gate', 'zone_garden'], desc_text: '大雨导致围墙部分坍塌，急需体力修补！', req_stat: 'STR', req_value: 90,  timer_turns: 2, reward_score: 70,  penalty_health: -20 },
        { id: 'evt_009', name: '食材霉变',   zone_tags: ['zone_yard'],              desc_text: '厨房发现大批食材变质，需要聪明人重新调配采购。', req_stat: 'INT', req_value: 60,  timer_turns: 1, reward_score: 40,  penalty_health: -15 },
        { id: 'evt_010', name: '刺客潜伏',   zone_tags: ['zone_master'],            desc_text: '有人意图行刺老爷！必须派遣武力高强之人护卫！', req_stat: 'STR', req_value: 100, timer_turns: 1, reward_score: 150, penalty_health: -40 },
        { id: 'evt_011', name: '邻里纠纷',   zone_tags: ['zone_gate'],              desc_text: '隔壁邻居因排水沟问题前来理论。', req_stat: 'CHA', req_value: 50,  timer_turns: 2, reward_score: 30,  penalty_health: -10 },
        { id: 'evt_012', name: '花木枯萎',   zone_tags: ['zone_garden'],            desc_text: '名贵花木突然枯萎，需要人细心查因。', req_stat: 'INT', req_value: 55,  timer_turns: 2, reward_score: 35,  penalty_health: -10 },
        { id: 'evt_013', name: '野狗入侵',   zone_tags: ['zone_yard', 'zone_garden'], desc_text: '一群野狗闯入前院，四处乱窜！', req_stat: 'AGI', req_value: 65,  timer_turns: 1, reward_score: 45,  penalty_health: -15 },
        { id: 'evt_014', name: '密信送达',   zone_tags: ['zone_master', 'zone_account'], desc_text: '一封神秘信件需要智者解读密码。', req_stat: 'INT', req_value: 80,  timer_turns: 2, reward_score: 70,  penalty_health: -20 },
        { id: 'evt_015', name: '商贾谈判',   zone_tags: ['zone_account', 'zone_gate'], desc_text: '一个精明的商人前来洽谈合作，需要口才了得之人周旋。', req_stat: 'CHA', req_value: 75, timer_turns: 2, reward_score: 80, penalty_health: -20 },
        { id: 'evt_016', name: '屋顶漏雨',   zone_tags: ['zone_master', 'zone_account'], desc_text: '正厅屋顶漏了，急需人力抢修！', req_stat: 'STR', req_value: 70, timer_turns: 1, reward_score: 55, penalty_health: -20 },
        { id: 'evt_017', name: '江湖卖艺',   zone_tags: ['zone_gate', 'zone_yard'], desc_text: '一群杂耍艺人在门口表演招揽围观，堵住了出路。', req_stat: 'CHA', req_value: 45, timer_turns: 2, reward_score: 25, penalty_health: -5 },
        { id: 'evt_018', name: '猫鼠追逐',   zone_tags: ['zone_garden', 'zone_yard'], desc_text: '老鼠跑进了院子，灵宠追得鸡飞狗跳。', req_stat: 'AGI', req_value: 50, timer_turns: 1, reward_score: 20, penalty_health: -5 },
        { id: 'evt_019', name: '古籍修复',   zone_tags: ['zone_account'],           desc_text: '一册珍贵古籍受潮，急需细心修补。', req_stat: 'INT', req_value: 70, timer_turns: 2, reward_score: 55, penalty_health: -15 },
        { id: 'evt_020', name: '护院比武',   zone_tags: ['zone_yard'],              desc_text: '护院们要求比武选拔，必须有强者坐镇裁判。', req_stat: 'STR', req_value: 85, timer_turns: 2, reward_score: 65, penalty_health: -15 }
    ];

    return {
        NPC_POOL: NPC_POOL,
        ZONES: ZONES,
        STAT_NAMES: STAT_NAMES,
        CRISIS_POOL: CRISIS_POOL
    };
})();
