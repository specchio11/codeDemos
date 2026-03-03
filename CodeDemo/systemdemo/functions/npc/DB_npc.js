// ============================================================
// DB_npc.js — NPC 数据池定义 (函数文件夹/npc)
// 种族、性格、技能、姓名、AI权重等全部随机池常量
// 本文件只有 const 定义，零运行时状态
// ============================================================

// --- NPC 库容量上限 ---
var NPC_MAX_RANDOM = 30;

// ===================== 性别 =====================
var NPC_GENDER_POOL = Object.freeze([
  { id: 'male', name: '男', weight: 1 },
  { id: 'female', name: '女', weight: 1 },
]);

// ===================== 种族 =====================
var NPC_RACE_POOL = Object.freeze([
  { id: 'xian', name: '仙', weight: 1 },
  { id: 'ren', name: '人', weight: 1 },
  { id: 'yao', name: '妖', weight: 1 },
  { id: 'mo', name: '魔', weight: 1 },
]);

// --- 种族 AI 基础权重 (覆盖默认值3的维度) ---
var NPC_RACE_AI_BASE = Object.freeze({
  xian: { cash_reserve: 3, risk_control: 4, monopoly: 5 },
  ren: { cash_reserve: 3, risk_control: 3, trade_pawn: 5 },
  yao: { cash_reserve: 3, risk_control: 2, item_use: 5 },
  mo: { cash_reserve: 2, risk_control: 2, item_use: 5 },
});

// --- 种族 → 技能前缀亲和度权重 ---
var NPC_RACE_SKILL_AFFINITY = Object.freeze({
  xian: { fengshan: 50, dingfen: 20, chuanfei: 15, wanshu: 10, guidao: 5 },
  ren: { dingfen: 40, fengshan: 30, wanshu: 15, chuanfei: 10, guidao: 5 },
  yao: { wanshu: 35, chuanfei: 30, guidao: 15, dingfen: 15, fengshan: 5 },
  mo: { chuanfei: 40, guidao: 20, wanshu: 20, dingfen: 10, fengshan: 10 },
});

// ===================== 性格 (10种独立性格) =====================
var NPC_PERSONALITY_POOL = Object.freeze([
  // ── 克己持重 / 清冷孤高 ──
  { id: 'keji', name: '克己持重', weight: 1 },
  { id: 'qingleng', name: '清冷孤高', weight: 1 },
  // ── 城府深阻 / 循规蹈矩 ──
  { id: 'chengfu', name: '城府深阻', weight: 1 },
  { id: 'xungui', name: '循规蹈矩', weight: 1 },
  // ── 磊落豪朗 / 风流倜傥 ──
  { id: 'leiluo', name: '磊落豪朗', weight: 1 },
  { id: 'fengliu', name: '风流倜傥', weight: 1 },
  // ── 幸灾乐祸 / 桀骜不驯 ──
  { id: 'xingzai', name: '幸灾乐祸', weight: 1 },
  { id: 'jieao', name: '桀骜不驯', weight: 1 },
  // ── 烂漫随性 / 逍遥任游 ──
  { id: 'lanman', name: '烂漫随性', weight: 1 },
  { id: 'xiaoyao', name: '逍遥任游', weight: 1 },
]);

// --- 性格 AI 权重修正 (覆盖种族+默认, 优先级最高) ---
var NPC_PERSONALITY_AI_MOD = Object.freeze({
  keji: { risk_control: 5, trade_greed: 1, attack: 1, build: 5 },
  qingleng: {
    risk_control: 5,
    trade_greed: 1,
    attack: 1,
    build: 4,
    trade_pawn: 1,
  },
  chengfu: { risk_control: 4, trade_greed: 3, attack: 3 },
  xungui: { risk_control: 3, trade_greed: 3, attack: 2, build: 4 },
  leiluo: { trade_greed: 1, attack: 3, cash_reserve: 2 },
  fengliu: { trade_greed: 2, attack: 4, risk_control: 2, special: 3 },
  xingzai: { item_use: 5, attack: 5, special: 3 },
  jieao: { attack: 5, item_use: 4, risk_control: 1, special: 4 },
  lanman: { special: 5 }, // 除种族确定的倾向外，其他倾向每局全随机
  xiaoyao: { special: 5, risk_control: 2 }, // 类似烂漫但偏好冒险
});

// ===================== AI 权重系统 =====================
var NPC_AI_DIM = Object.freeze({
  cash_reserve: { name: '流动资金储备', icon: '💰' },
  risk_control: { name: '风险控制系数', icon: '🛡️' },
  monopoly: { name: '地块垄断意愿', icon: '🏘️' },
  trade_greed: { name: '交易贪婪指数', icon: '🤝' },
  attack: { name: '主动攻击意愿', icon: '⚔️' },
  build: { name: '建设优先意愿', icon: '🏗️' },
  item_use: { name: '道具使用意愿', icon: '📜' },
  trade_pawn: { name: '交易典当意愿', icon: '💎' },
  special: { name: '特殊行动意愿', icon: '🎭' },
});

var NPC_AI_DIM_KEYS = Object.freeze(Object.keys(NPC_AI_DIM));

var NPC_AI_LEVEL_TEXT = Object.freeze({
  1: '极低',
  2: '低',
  3: '中',
  4: '高',
  5: '极高',
});

// ===================== 技能系统 =====================
// NPC只存 skill_id (即前缀key，如 "wanshu")
// 所有技能效果运行时从 NPC_GAME_SKILLS 按游戏类型查表获取
// 结构: NPC_GAME_SKILLS[skill_id][gameType] = { name, desc, effect }

// --- 技能前缀定义（跨游戏通用元数据）---
var NPC_SKILL_PREFIX = Object.freeze({
  fengshan: { name: '丰赡', desc: '数值类（经济、建筑）', color: '#c9a96e' },
  chuanfei: { name: '遄飞', desc: '行动类（行动、攻击）', color: '#e94560' },
  dingfen: { name: '定分', desc: '概率类', color: '#5fa8d3' },
  wanshu: { name: '万殊', desc: '道具类（卡片）', color: '#8ac926' },
  guidao: { name: '诡道', desc: '特种类', color: '#9b59b6' },
});

// --- 技能总表 (skill_id → 各游戏技能) ---
// key1 = skill_id (随机NPC = 前缀key; 固定NPC = 专属key)
// key2 = gameType ('monopoly', 'quiz', ...)
// 每条: { name: '前缀·后缀', desc: '描述', effect: { ... } }
var NPC_GAME_SKILLS = Object.freeze({
  // ═══ 丰赡 · 数值/经济/建筑 ═══
  fengshan: {
    monopoly: {
      name: '丰赡·聚宝生辉',
      desc: '经过起点时额外获得15%灵石',
      effect: { type: 'income_pct', value: 0.15 },
    },
    quiz: {
      name: '丰赡·博闻强识',
      desc: '答对题目时奖励灵石翻倍',
      effect: { type: 'reward_double' },
    },
  },
  // ═══ 遄飞 · 行动/攻击 ═══
  chuanfei: {
    monopoly: {
      name: '遄飞·神行百变',
      desc: '每回合可选择额外前进或后退1步',
      effect: { type: 'move_choice', value: 1 },
    },
    quiz: {
      name: '遄飞·先声夺人',
      desc: '抢答阶段获得0.5秒提前作答时间',
      effect: { type: 'time_bonus', value: 0.5 },
    },
  },
  // ═══ 定分 · 概率 ═══
  dingfen: {
    monopoly: {
      name: '定分·否极泰来',
      desc: '连续2回合不获利时，下回合收益翻倍',
      effect: { type: 'comeback', rounds: 2, multiplier: 2 },
    },
    quiz: {
      name: '定分·天命所归',
      desc: '答错时30%概率获得再答一次机会',
      effect: { type: 'retry_chance', value: 0.3 },
    },
  },
  // ═══ 万殊 · 道具/卡片 ═══
  wanshu: {
    monopoly: {
      name: '万殊·百宝囊中',
      desc: '每5回合自动获得1张随机T1符箓',
      effect: { type: 'auto_item', interval: 5, tier: 1 },
    },
    quiz: {
      name: '万殊·锦囊妙计',
      desc: '每局可使用1次提示道具（排除1个错误选项）',
      effect: { type: 'hint', uses: 1 },
    },
  },
  // ═══ 诡道 · 特种 ═══
  guidao: {
    monopoly: {
      name: '诡道·暗渡陈仓',
      desc: '回合结束时15%概率与随机对手交换位置',
      effect: { type: 'swap_pos', chance: 0.15 },
    },
    quiz: {
      name: '诡道·移花接木',
      desc: '可将1道已答对的题目替换对手的正确答案',
      effect: { type: 'steal_answer', uses: 1 },
    },
  },
  // ═══ 固定NPC专属技能示例（未来扩展）═══
  // guigu_zongheng: {
  //   monopoly: { name: '鬼谷·纵横', desc: '...', effect: {...} },
  //   quiz:     { name: '鬼谷·辩论', desc: '...', effect: {...} },
  // },
});

// --- 已注册的游戏类型（用于UI遍历）---
var NPC_GAME_TYPES = Object.freeze({
  monopoly: { name: '大富翁', icon: '🎲' },
  quiz: { name: '答题', icon: '📝' },
});

/**
 * 查询NPC在指定游戏中的技能
 * @param {Object} npc - NPC对象（需有 skill_id 字段）
 * @param {string} gameType - 游戏类型key
 * @returns {Object|null} { name, desc, effect }
 */
function getSkillForGame(npc, gameType) {
  var entry = NPC_GAME_SKILLS[npc.skill_id];
  if (!entry) return null;
  return entry[gameType] || null;
}

// ===================== 诱饵系统 =====================
// 每种诱饵可对四个池子施加权重加成:
//   genderBonus       → 性别池
//   raceBonus         → 种族池
//   personalityBonus  → 性格池
//   skillBonus        → 技能前缀池
// 空对象 {} 表示无加成。
var NPC_LURE_TYPES = Object.freeze({
  general: {
    name: '泛用·灵茶',
    desc: '不偏不倚，来者皆可',
    genderBonus: {},
    raceBonus: {},
    personalityBonus: {},
    skillBonus: {},
  },
  sword: {
    name: '垂类·剑谱',
    desc: '偏向仙/妖种族，侧重行动类技能',
    genderBonus: {},
    raceBonus: { xian: 3, yao: 2 },
    personalityBonus: {},
    skillBonus: { chuanfei: 4 },
  },
  alchemy: {
    name: '垂类·丹方',
    desc: '偏向人/仙种族，侧重概率/经济类技能',
    genderBonus: {},
    raceBonus: { ren: 3, xian: 2 },
    personalityBonus: {},
    skillBonus: { dingfen: 4, fengshan: 3 },
  },
});

// ===================== 姓名池 =====================
var NPC_SURNAME_POOL = Object.freeze([
  '李',
  '王',
  '张',
  '陈',
  '赵',
  '周',
  '吴',
  '徐',
  '孙',
  '朱',
  '林',
  '何',
  '高',
  '梁',
  '宋',
  '唐',
  '韩',
  '曹',
  '萧',
  '冯',
  '程',
  '蔡',
  '袁',
  '苏',
  '叶',
  '吕',
  '魏',
  '蒋',
  '杜',
  '沈',
  '姜',
  '范',
  '金',
  '夏',
  '谭',
  '石',
  '龙',
  '段',
  '白',
  '秦',
  '温',
  '武',
  '楚',
  '慕容',
  '上官',
  '司马',
  '南宫',
  '公孙',
  '令狐',
  '独孤',
]);

var NPC_MALE_NAME_POOL = Object.freeze([
  '逸风',
  '云起',
  '无忌',
  '承影',
  '惊鸿',
  '玄清',
  '青阳',
  '明远',
  '天行',
  '凌霄',
  '寒川',
  '墨尘',
  '长安',
  '北辰',
  '归元',
  '少卿',
  '子虚',
  '九歌',
  '弘毅',
  '乘风',
  '御天',
  '灵均',
  '伯庸',
  '怀瑾',
  '握瑜',
  '景明',
  '凤歌',
  '问道',
  '破军',
  '听泉',
  '望舒',
  '扶摇',
  '霁月',
  '清源',
  '鹤鸣',
  '星河',
  '沧海',
  '横舟',
  '拂晓',
  '惊蛰',
]);

var NPC_FEMALE_NAME_POOL = Object.freeze([
  '若兰',
  '素衣',
  '清漪',
  '凝霜',
  '月瑶',
  '灵犀',
  '紫烟',
  '映雪',
  '飞鸾',
  '碧落',
  '如梦',
  '轻鸿',
  '听雨',
  '惜朝',
  '幽兰',
  '晚晴',
  '含章',
  '采薇',
  '玲珑',
  '锦瑟',
  '云裳',
  '倾城',
  '梦蝶',
  '落霞',
  '问心',
  '吟霜',
  '秋水',
  '琼华',
  '醉月',
  '归雁',
  '语嫣',
  '清婉',
  '素心',
  '芷若',
  '瑶光',
  '冰蝉',
  '霓裳',
  '朝露',
  '栖凤',
  '沐晴',
]);
