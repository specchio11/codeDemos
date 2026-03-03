// ============================================================
// 云津小馆 - 游戏数据定义
// ============================================================

const CONFIG = {
  INITIAL_CASH: 1600,
  INITIAL_REPUTATION: 25,
  INITIAL_HYGIENE: 70,
  WIN_CASH: 2200,
  WIN_REPUTATION: 60,
  WIN_HYGIENE: 50,
  TOTAL_DAYS: 7,
  TICKS_PER_DAY: 16,
  MAX_QUEUE: 6,
  MENU_SIZE: 4,
  PROF_SPEED: 10,     // 做满10份→耗时-1
  PROF_QUALITY: 5,     // 做满5份→基础口碑+1
  MAINT_HYGIENE: 6,    // 清洁备场
  SOOTHE_AMT: 2,       // 安抚耐心+2
  CLEAN_AMT: 4,        // 清洁卫生+4
  LIGHT_SOOTHE: 1,     // 轻安抚+1
  LIGHT_CLEAN: 1,      // 轻清洁+1
  PLATE_REP: 1,        // 端盘口碑+1
  LEAVE_REP: -2,       // 普通客离店
  LEAVE_REP_PICKY: -3, // 挑剔/VIP客离店
  WAIT_PENALTY: -1,    // 耐心<=1时出餐
  SUB_PENALTY: -1,     // 替代料口碑
  SUB_COST_EXTRA: 1,   // 替代料额外成本
  REFUSE_REP: -2,      // 拒单
  TAG_MATCH_REP: 1,    // 标签匹配奖励
  W_MATCH: 3.0,
  W_NORMAL: 1.0,
  W_WEAK: 0.5,
  PICKY_MISMATCH_REP: -1,  // 挑剔客标签不匹配扣口碑
  FOODIE_HIGH_REP: 1,      // 美食家高质量菜+口碑
  FOODIE_LOW_REP: -1,      // 美食家低质量菜-口碑
  PERSONALITY_CHANCE: 0.30, // 性格标签概率
  SITUATION_CHANCE: 0.15,   // 情境标签概率
};

// ===== 12 道菜品 =====
const DISHES = [
  {
    id:'D01', name:'青菜拌面', price:20, cost:5, time:1,
    tags:['快','素','家常'], baseRep:0,
    ingredients:{'面':1,'青菜':1,'香料':1},
    semi:[{type:'高汤', speedUp:false, bonus:null}],
    isSpirit:false, special:null,
    note:'早期稳菜，适合救耐心'
  },
  {
    id:'D02', name:'清汤面', price:22, cost:6, time:1,
    tags:['快','清淡','鲜','暖'], baseRep:0,
    ingredients:{'面':1,'香料':1},
    semi:[{type:'高汤', speedUp:false, bonus:{rep:1}}],
    isSpirit:false, special:null,
    note:'用高汤时额外+1口碑'
  },
  {
    id:'D03', name:'什锦炒饭', price:24, cost:7, time:1,
    tags:['快','重口','家常'], baseRep:0,
    ingredients:{'米':1,'青菜':1,'香料':1},
    semi:[{type:'米饭', speedUp:false, bonus:{rep:1}}],
    isSpirit:false, special:null,
    note:'用米饭时额外+1口碑'
  },
  {
    id:'D04', name:'麻婆豆腐', price:28, cost:9, time:1,
    tags:['辣','重口','家常','下饭'], baseRep:1,
    ingredients:{'豆腐':1,'香料':2},
    semi:[],
    isSpirit:false, special:null,
    note:'怕辣客不会点；高口碑快菜'
  },
  {
    id:'D05', name:'宫保鸡丁', price:32, cost:11, time:2,
    tags:['辣','荤','下饭'], baseRep:1,
    ingredients:{'鸡':1,'香料':2},
    semi:[{type:'辣酱', speedUp:true, bonus:null}],
    isSpirit:false, special:null,
    note:'耗时2，辣酱可加速'
  },
  {
    id:'D06', name:'红烧肉饭', price:34, cost:12, time:2,
    tags:['荤','重口','暖','补'], baseRep:1,
    ingredients:{'猪':1,'香料':2,'米':1},
    semi:[
      {type:'红烧酱', speedUp:true, bonus:{cash:2}},
      {type:'米饭', speedUp:true, bonus:null}
    ],
    isSpirit:false, special:null,
    note:'红烧酱加速+额外现金+2'
  },
  {
    id:'D07', name:'海鲜烩', price:38, cost:16, time:2,
    tags:['鲜','荤','豪气'], baseRep:2,
    ingredients:{'鱼':1,'虾':1},
    semi:[{type:'高汤', speedUp:true, bonus:null}],
    isSpirit:false, special:null,
    note:'鲜双拼，仅B包可做；A/C包零覆盖'
  },
  {
    id:'D08', name:'椒盐虾', price:34, cost:14, time:1,
    tags:['重口','荤','鲜','豪气'], baseRep:1,
    ingredients:{'虾':1,'香料':2},
    semi:[],
    isSpirit:false, special:null,
    note:'高利润快菜（需要虾）'
  },
  {
    id:'D09', name:'菌菇炖汤', price:30, cost:10, time:2,
    tags:['清淡','素','暖','补'], baseRep:2,
    ingredients:{'灵菇':1,'香料':1},
    semi:[{type:'高汤', speedUp:true, bonus:null}],
    isSpirit:true, special:'vipBonus',
    note:'VIP额外+1口碑；仅C包有灵菇'
  },
  {
    id:'D10', name:'双灵小炒', price:34, cost:11, time:1,
    tags:['素','清淡','鲜'], baseRep:1,
    ingredients:{'灵菇':1,'灵葱':1},
    semi:[],
    isSpirit:true, special:null,
    note:'双灵材菜，仅C包可做；A/B包零覆盖'
  },
  {
    id:'D11', name:'桂花甜汤', price:23, cost:6, time:1,
    tags:['甜','清淡','暖'], baseRep:1,
    ingredients:{'香料':1},
    semi:[],
    isSpirit:false, special:null,
    note:'甜口快菜，补清淡/甜覆盖'
  },
  {
    id:'D12', name:'一壶灵茶', price:18, cost:3, time:1,
    tags:['快','清淡'], baseRep:0,
    ingredients:{'香料':1},
    semi:[],
    isSpirit:false, special:'teaSoothe',
    note:'出茶安抚：最焦躁客人+1耐心'
  },
  {
    id:'D13', name:'家常豆腐煲', price:26, cost:8, time:1,
    tags:['家常','暖','补','素'], baseRep:1,
    ingredients:{'豆腐':2,'青菜':1,'香料':1},
    semi:[{type:'高汤', speedUp:false, bonus:{rep:1}}],
    isSpirit:false, special:null,
    note:'A包快菜；标签覆盖广，豆腐消耗大，高汤可+1口碑'
  }
];

// 快速查找
const DISH_MAP = {};
DISHES.forEach(d => DISH_MAP[d.id] = d);

// ===== 3 种进货包 =====
const SUPPLY_PACKS = [
  {
    id:'A', name:'A包·家常稳定', cost:75,
    items:{'米':21,'面':18,'鸡':10,'猪':10,'豆腐':14,'青菜':18,'香料':21},
    spiritBonus:false, rhythmBonus:true,
    get desc(){ return Object.entries(this.items).map(([k,v])=>(ING_EMOJI[k]||'')+k+v).join(' '); }
  },
  {
    id:'B', name:'B包·鲜货海味', cost:120,
    items:{'米':18,'面':16,'鸡':8,'猪':8,'鱼':6,'虾':9,'青菜':16,'香料':21},
    spiritBonus:false, rhythmBonus:false,
    get desc(){ return Object.entries(this.items).map(([k,v])=>(ING_EMOJI[k]||'')+k+v).join(' '); }
  },
  {
    id:'C', name:'C包·灵材精品', cost:130,
    items:{'米':18,'面':16,'鸡':8,'猪':8,'灵菇':9,'灵葱':6,'青菜':16,'香料':21},
    spiritBonus:true, rhythmBonus:false,
    get desc(){ return Object.entries(this.items).map(([k,v])=>(ING_EMOJI[k]||'')+k+v).join(' '); }
  }
];

// ===== 4 种半成品 =====
const SEMI_PRODUCTS = [
  {id:'高汤', name:'高汤', yield:2, cost:{'香料':2}, desc:'香料×2 → 高汤×2'},
  {id:'红烧酱', name:'红烧酱', yield:2, cost:{'香料':3}, desc:'香料×3 → 红烧酱×2'},
  {id:'辣酱', name:'辣酱', yield:2, cost:{'香料':3}, desc:'香料×3 → 辣酱×2'},
  {id:'米饭', name:'米饭', yield:4, cost:{'米':2}, desc:'米×2 → 米饭×4'}
];

// ===== 标签池 =====
const TAG_POOL = [
  // 口味标签 (taste) — 每位客人 1-2 个
  {tag:'快',   weight:20, type:'taste'},
  {tag:'清淡', weight:18, type:'taste'},
  {tag:'重口', weight:18, type:'taste'},
  {tag:'辣',   weight:15, type:'taste'},
  {tag:'荤',   weight:15, type:'taste'},
  {tag:'甜',   weight:10, type:'taste'},
  {tag:'素',   weight:8,  type:'taste'},
  {tag:'怕辣', weight:6,  type:'taste'},
  {tag:'鲜',   weight:12, type:'taste'},
  {tag:'暖',   weight:10, type:'taste'},
  {tag:'家常', weight:14, type:'taste'},
  {tag:'补',   weight:8,  type:'taste'},
  {tag:'下饭', weight:10, type:'taste'},
  {tag:'豪气', weight:5,  type:'taste'},
  {tag:'节俭', weight:8,  type:'taste'},
  // 性格标签 (personality) — 最多 1 个, 30% 概率
  {tag:'VIP',    weight:5,  type:'personality'},
  {tag:'挑剔',   weight:8,  type:'personality'},
  {tag:'慢性子', weight:8,  type:'personality'},
  {tag:'美食家', weight:6,  type:'personality'},
  // 情境标签 (situation) — 最多 1 个, 15% 概率
  {tag:'赶时间', weight:10, type:'situation'},
];

// 同一客人不能同时拥有的标签
const TAG_CONFLICTS = [
  ['怕辣','辣'], ['素','荤'], ['清淡','重口'], ['节俭','豪气'],
  ['挑剔','美食家'], ['赶时间','慢性子']
];

// 强排斥: 客人标签 vs 菜品标签 → 权重=0
const HARD_REJECTS = [
  {guest:'怕辣', dish:'辣'},
  {guest:'素',   dish:'荤'}
];

// 弱冲突: 权重×0.5
const WEAK_CONFLICTS = [
  {guest:'清淡', dish:'重口'},
  {guest:'节俭', dish:'豪气'}
];

// ===== 客人名字池 =====
const CUSTOMER_NAMES = [
  '张婶','李伯','王生','赵姑娘','钱老爷','孙大嫂','周先生',
  '吴大娘','郑掌柜','冯小姐','陈老师','褚公子','卫夫人',
  '蒋大叔','沈小弟','韩管事','杨老太','朱员外','秦姑娘',
  '许先生','何大哥','吕婶子','施大爷','马姑娘','曹夫人',
  '魏掌柜','唐小哥','虞娘子','姜先生','戚夫人'
];

// ===== 菜品表情符号 =====
const DISH_EMOJI = {
  'D01':'🍜','D02':'🍜','D03':'🍚','D04':'🌶️',
  'D05':'🍗','D06':'🍖','D07':'🥘','D08':'🦐',
  'D09':'🍲','D10':'✨','D11':'🍮','D12':'🍵',
  'D13':'🍛'
};

// ===== 食材表情符号 =====
const ING_EMOJI = {
  '米':'🌾','面':'🍝','鸡':'🐔','猪':'🐷',
  '豆腐':'🧈','青菜':'🥬','香料':'🧂',
  '鱼':'🐟','虾':'🦐','灵菇':'🍄','灵葱':'🧅'
};

// ===== 半成品表情符号 =====
const SEMI_EMOJI = {
  '高汤':'🥣','红烧酱':'🥫','辣酱':'🌶️','米饭':'🍚'
};

// ===== 标签颜色 =====
const TAG_COLORS = {
  '快':'#2196F3','清淡':'#4CAF50','重口':'#FF5722',
  '辣':'#F44336','荤':'#795548','素':'#8BC34A',
  '怕辣':'#E91E63','甜':'#FF9800',
  '鲜':'#00BCD4','暖':'#FF7043','家常':'#8D6E63',
  '补':'#AB47BC','下饭':'#FFA726','豪气':'#FFD700','节俭':'#78909C',
  'VIP':'#FFD700','挑剔':'#9C27B0',
  '慢性子':'#607D8B','美食家':'#E91E63','赶时间':'#F57C00'
};

// ===== 事件定义（随机触发，每种一局仅一次） =====
// TEST_MODE: true 时事件集中在 Day1-2 触发
const EVENT_TEST_MODE = true;
const EVENT_TYPES = [
  { type:'FIRE',       name:'灶台失火',     timing:'tick' },
  { type:'INSPECTION', name:'食安抽检',     timing:'tick' },
  { type:'SHORTAGE',   name:'紧急断/缺货', timing:'rush_start' },
  { type:'CRITIC',     name:'美食博主探店', timing:'tick' },
];

// ===== 助手定义 =====
const ASSISTANTS = [
  {
    id:'kitchen', name:'👨‍🍳 厨务助手',
    passive:'出餐卫生损耗 -1（从-2变-1）',
    actions:['轻安抚','轻清洁'],
    desc:'减少厨房脏乱，让你不必频繁清洁'
  },
  {
    id:'scout', name:'🔮 探子助手',
    passive:'开门时预告今日客人标签 Top3',
    actions:['轻安抚','轻清洁'],
    desc:'信息优势，选菜更精准'
  },
  {
    id:'buyer', name:'📦 采购助手',
    passive:'（无被动）',
    actions:['轻安抚','紧急补货'],
    desc:'临时补货救急'
  },
  {
    id:'lobby', name:'⭐ 大堂助手',
    passive:'轻安抚效果翻倍（+1→+2）',
    actions:['轻安抚','轻清洁'],
    desc:'安抚加强，稳定客人耐心'
  }
];

const BUYER_RESTOCK_COST = 30;  // 紧急补货每次花费
const BUYER_RESTOCK_AMT = 2;   // 紧急补货每次获得食材数
const BUYER_RESTOCK_MAX = 2;   // 每天最多紧急补货次数
