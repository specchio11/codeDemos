// ============================================================
// home.js — 首页渲染逻辑 (剧情文件夹/home)
// 动态生成系统Demo导航卡片
// ============================================================

(function () {
    // Demo入口配置列表（后续新增demo只需在此追加）
    var DEMO_ENTRIES = [
        {
            id: 'npc_generator',
            title: 'NPC 生成系统',
            icon: '🎭',
            desc: '随机NPC的程序化生成 — 种族/性格/技能随机池与加权抽取',
            tags: ['种族差分', '性格差分', 'AI权重', '技能前缀'],
            link: 'storyline/npc_demo/index.html',
            status: 'ready',
        },
        // 后续demo示例（占位）:
        // {
        //     id: 'lure_system',
        //     title: '迎客诱捕系统',
        //     icon: '🍵',
        //     desc: '万宝阁迎客槽位管理与诱饵结算流程',
        //     tags: ['槽位', '计时器', '结算'],
        //     link: 'storyline/lure_demo/index.html',
        //     status: 'wip',
        // },
    ];

    function renderDemoGrid() {
        var grid = document.getElementById('demo-grid');
        if (!grid) return;

        var html = '';
        for (var i = 0; i < DEMO_ENTRIES.length; i++) {
            var entry = DEMO_ENTRIES[i];
            var statusText = entry.status === 'ready' ? '✅ 可用' : '🚧 开发中';
            var statusClass = entry.status === 'ready' ? 'ready' : 'wip';

            html += '<a class="demo-card demo-card--' + statusClass + '" href="' + entry.link + '">' +
                '<div class="demo-card__icon">' + entry.icon + '</div>' +
                '<div class="demo-card__body">' +
                    '<h3 class="demo-card__title">' + entry.title + '</h3>' +
                    '<p class="demo-card__desc">' + entry.desc + '</p>' +
                    '<div class="demo-card__tags">' +
                        entry.tags.map(function (t) { return '<span class="demo-tag">' + t + '</span>'; }).join('') +
                    '</div>' +
                '</div>' +
                '<div class="demo-card__status">' + statusText + '</div>' +
            '</a>';
        }

        grid.innerHTML = html;
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', renderDemoGrid);
    } else {
        renderDemoGrid();
    }
})();
