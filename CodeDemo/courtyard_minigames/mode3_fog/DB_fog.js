// ============================================================
// 模式三：寻人罗盘 — 数据库 (DB_fog.js)
// ============================================================

var DB_FOG = (function () {

    // ---- 12 个地图节点 ----
    // tags: indoor/outdoor, north/south/east/west, water/no_water, center/edge
    // pos: 在地图上的百分比坐标
    var NODES = [
        { id: 'ND_Gate',      name: '正门',     icon: '🚪', tags: ['outdoor','south','no_water','edge'],   neighbors: ['ND_Corridor','ND_Wood'],                         pos: { left: '14%', top: '72%' } },
        { id: 'ND_Corridor',  name: '游廊',     icon: '🏛️', tags: ['outdoor','south','no_water','center'], neighbors: ['ND_Gate','ND_Yard_S','ND_Kitchen'],               pos: { left: '30%', top: '68%' } },
        { id: 'ND_Rockery',   name: '假山',     icon: '⛰️', tags: ['outdoor','north','no_water','edge'],   neighbors: ['ND_Pond','ND_Garden'],                            pos: { left: '60%', top: '18%' } },
        { id: 'ND_Pavilion',  name: '凉亭',     icon: '🏮', tags: ['outdoor','east','no_water','edge'],    neighbors: ['ND_Waterside','ND_Account'],                      pos: { left: '82%', top: '45%' } },
        { id: 'ND_Waterside', name: '水榭',     icon: '🌊', tags: ['indoor','east','water','center'],      neighbors: ['ND_Pavilion','ND_Account','ND_Pond'],             pos: { left: '78%', top: '22%' } },
        { id: 'ND_Pond',      name: '后院池塘', icon: '🐟', tags: ['outdoor','north','water','edge'],      neighbors: ['ND_Rockery','ND_Waterside','ND_Bedroom'],         pos: { left: '50%', top: '12%' } },
        { id: 'ND_Account',   name: '账房',     icon: '📒', tags: ['indoor','east','no_water','center'],   neighbors: ['ND_Pavilion','ND_Waterside','ND_Master'],         pos: { left: '75%', top: '58%' } },
        { id: 'ND_Study',     name: '书房',     icon: '📚', tags: ['indoor','west','no_water','edge'],     neighbors: ['ND_Guest','ND_Bedroom'],                          pos: { left: '18%', top: '25%' } },
        { id: 'ND_Bedroom',   name: '卧室',     icon: '🛏️', tags: ['indoor','north','no_water','center'],  neighbors: ['ND_Study','ND_Pond','ND_Master'],                 pos: { left: '38%', top: '20%' } },
        { id: 'ND_Guest',     name: '客房',     icon: '🏠', tags: ['indoor','west','no_water','center'],   neighbors: ['ND_Study','ND_Kitchen','ND_Master'],              pos: { left: '18%', top: '45%' } },
        { id: 'ND_Kitchen',   name: '厨房',     icon: '🍳', tags: ['indoor','west','no_water','edge'],     neighbors: ['ND_Corridor','ND_Guest'],                         pos: { left: '12%', top: '58%' } },
        { id: 'ND_Wood',      name: '柴房',     icon: '🏚️', tags: ['indoor','south','no_water','edge'],    neighbors: ['ND_Gate','ND_Yard_S'],                            pos: { left: '45%', top: '75%' } }
    ];

    // 增加一个虚拟中间节点"前院" —— 让图连通
    // 实际上我们把 ND_Wood 与 ND_Corridor 之间挂一个隐式连接
    // 但是为了简洁，直接在 NODES 里补上几条 neighbor 关系让图连通
    // (已在上面的 neighbors 中处理)

    // 增补一个伪 yard 节点用于连通（如果需要）
    // 不，我们直接添加更多邻居来让图连通
    NODES.push({
        id: 'ND_Master', name: '正厅', icon: '🏯',
        tags: ['indoor','north','no_water','center'],
        neighbors: ['ND_Bedroom','ND_Account','ND_Guest','ND_Garden'],
        pos: { left: '48%', top: '38%' }
    });

    // 还缺一个 ND_Garden
    // 在视觉上就是后花园
    // 不加也行，但为了让假山连上  
    // 直接修正：用 ND_Yard_S 作为过渡
    NODES.push({
        id: 'ND_Garden', name: '后花园', icon: '🌸',
        tags: ['outdoor','north','no_water','center'],
        neighbors: ['ND_Rockery','ND_Master','ND_Pond'],
        pos: { left: '55%', top: '28%' }
    });

    // 补上 ND_Yard_S 让正门/柴房方向连到正厅
    NODES.push({
        id: 'ND_Yard_S', name: '前院', icon: '⚔️',
        tags: ['outdoor','south','no_water','center'],
        neighbors: ['ND_Corridor','ND_Wood','ND_Master','ND_Account'],
        pos: { left: '52%', top: '60%' }
    });

    // 现在共 15 个节点。这比设计蓝本的 12 多了 3 个（正厅、后花园、前院）用于连通。
    // 15 个节点搜寻起来更有挑战。

    // ---- Tag 中文映射 (用于线索文本) ----
    var TAG_LABELS = {
        'indoor': '室内房间', 'outdoor': '室外场所',
        'north': '北侧', 'south': '南侧', 'east': '东侧', 'west': '西侧',
        'water': '有水的地方', 'no_water': '没有水的地方',
        'center': '庭院中心地带', 'edge': '庭院边缘角落'
    };

    // ---- 线索文本模板 ----
    // type: 'has_tag' | 'not_tag' | 'distance'
    var CLUE_TEMPLATES = {
        has_tag: [
            '小家伙的爪印指向了{tag}……',
            '毛茸茸的痕迹通往{tag}。',
            '感应到微弱的灵力波动，它应该在{tag}。'
        ],
        not_tag: [
            '这里没有灵宠的气息，它肯定不在{tag}。',
            '排除了{tag}的可能性，没有爪印。',
            '线索表明，小家伙绝不会蹲在{tag}。'
        ],
        distance: [
            '空气中残留的灵力波动显示，它距离此地恰好 {dist} 步远。',
            '隐约听到了窃窃的轻哼，小家伙大约在 {dist} 个区域之外。',
            '追踪术显示，它距此处 {dist} 步。'
        ]
    };

    // ---- 角色数据(demo 默认) ----
    var HERO = {
        name: '你',
        insight: 80,
        portrait: '../assets/female1.png'
    };

    return {
        NODES: NODES,
        TAG_LABELS: TAG_LABELS,
        CLUE_TEMPLATES: CLUE_TEMPLATES,
        HERO: HERO
    };
})();
