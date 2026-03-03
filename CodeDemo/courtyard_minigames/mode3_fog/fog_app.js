// ============================================================
// 模式三：寻人罗盘 — 游戏主逻辑 (fog_app.js)
// ============================================================

(function () {
    'use strict';

    var state = {
        ap: 20,
        apMax: 20,
        searchCost: 3,
        arrestCost: 0,        // 指认不消耗AP，但猜错罚5AP
        arrestPenalty: 5,     // 猜错惩罚
        insight: 80,
        targetNodeId: null,
        clues: [],           // { step, nodeSearched, text }
        nodeStates: {},      // nodeId -> { revealed, markedX }
        phase: 'play',       // play | gameover
        step: 0,
        wrongGuesses: 0
    };

    var $root, $clueList, $toast, $popup;
    var nodeIndex = {};      // id -> node data
    var allNodes = [];

    // ======== BFS 距离计算 ========
    function bfsDistance(fromId, toId) {
        if (fromId === toId) return 0;
        var visited = {}; visited[fromId] = true;
        var queue = [{ id: fromId, dist: 0 }];
        while (queue.length > 0) {
            var cur = queue.shift();
            var node = nodeIndex[cur.id];
            if (!node) continue;
            for (var i = 0; i < node.neighbors.length; i++) {
                var nb = node.neighbors[i];
                if (visited[nb]) continue;
                if (nb === toId) return cur.dist + 1;
                visited[nb] = true;
                queue.push({ id: nb, dist: cur.dist + 1 });
            }
        }
        return -1; // 不连通
    }

    // ======== 初始化 ========
    function init() {
        allNodes = DB_FOG.NODES;
        nodeIndex = {};
        allNodes.forEach(function (n) { nodeIndex[n.id] = n; });

        state.ap = state.apMax;
        state.clues = [];
        state.nodeStates = {};
        state.phase = 'play';
        state.step = 0;
        state.wrongGuesses = 0;
        state.insight = DB_FOG.HERO.insight;

        allNodes.forEach(function (n) {
            state.nodeStates[n.id] = { revealed: false, markedX: false };
        });

        // 随机选定目标
        var idx = Math.floor(Math.random() * allNodes.length);
        state.targetNodeId = allNodes[idx].id;
        console.log('[DEBUG] 灵宠藏在：' + state.targetNodeId + ' (' + allNodes[idx].name + ')');

        render();
    }

    // ======== 渲染 ========
    function render() {
        $root = document.getElementById('game-main');
        $root.className = 'fog-game';
        $root.innerHTML = '';

        // 顶栏
        var topbar = el('div', { className: 'topbar' });
        topbar.innerHTML =
            '<span class="topbar-title" id="fog-title">🐾 灵宠踪迷藏</span>' +
            '<div class="topbar-stats">' +
                '<span id="stat-ap">⚡ 行动力：' + state.ap + '/' + state.apMax + '</span>' +
                '<span>🔍 洞察：' + state.insight + '</span>' +
            '</div>' +
            '<div style="display:flex;gap:8px;">' +
                '<button class="topbar-btn back-btn" onclick="location.href=\'../index.html\'">↩ 返回</button>' +
                '<button class="topbar-btn" onclick="FogApp.restart()">🔄 重开</button>' +
            '</div>';
        $root.appendChild(topbar);

        // 主体
        var body = el('div', { className: 'fog-body' });

        // 地图
        var mapArea = el('div', { className: 'fog-map-area' });
        var mapWrap = el('div', { className: 'map-container', id: 'fog-map' });
        var img = el('img', { src: '../assets/mapA.png', alt: '庭院地图' });
        mapWrap.appendChild(img);
        mapArea.appendChild(mapWrap);
        body.appendChild(mapArea);

        // 侧边栏：操作提示(顶部固定) + 线索日志(底部scroll)
        var sidebar = el('div', { className: 'fog-sidebar' });
        sidebar.innerHTML =
            '<div class="action-hint">' +
                '💡 <strong>操作提示</strong><br>' +
                '· 你的灵宠蹲在庞院某处，快找到它！<br>' +
                '· 点击节点「探索」获取线索（-3AP）<br>' +
                '· 觉得找到了？「找到了！」免费指认，但猜错罚5AP<br>' +
                '· 右键可标记 ✕ 辅助排除<br>' +
                '· 行动力耗尽则游戏失败' +
            '</div>' +
            '<div class="clue-title">📋 线索进度板</div>' +
            '<div class="clue-list" id="clue-list"></div>';
        body.appendChild(sidebar);

        $root.appendChild(body);

        // toast
        var toast = el('div', { className: 'toast', id: 'fog-toast' });
        $root.appendChild(toast);
        $toast = document.getElementById('fog-toast');
        $clueList = document.getElementById('clue-list');

        // 等图片加载后计算实际渲染尺寸，让 map-container 匹配图片
        function fitMapContainer() {
            var areaW = mapArea.clientWidth - 20; // 减去 padding
            var areaH = mapArea.clientHeight - 20;
            if (areaW <= 0 || areaH <= 0) return;
            var ratio = img.naturalWidth / img.naturalHeight;
            var w, h;
            if (areaW / areaH > ratio) {
                h = areaH; w = Math.round(h * ratio);
            } else {
                w = areaW; h = Math.round(w / ratio);
            }
            mapWrap.style.width = w + 'px';
            mapWrap.style.height = h + 'px';
            renderNodes();
        }
        img.onload = fitMapContainer;
        if (img.complete && img.naturalWidth) fitMapContainer();
        window.addEventListener('resize', function () {
            if (img.complete && img.naturalWidth) fitMapContainer();
        });

        // 渲染已有线索
        renderClues();
    }

    // ======== 渲染地图节点 ========
    function renderNodes() {
        var map = document.getElementById('fog-map');
        // 清除旧节点和连线
        map.querySelectorAll('.fog-node').forEach(function (e) { e.remove(); });
        var oldSvg = map.querySelector('.edge-svg');
        if (oldSvg) oldSvg.remove();

        // 绘制连线 SVG
        var w = map.clientWidth;
        var h = map.clientHeight;
        var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('class', 'edge-svg');
        svg.setAttribute('width', w);
        svg.setAttribute('height', h);
        svg.style.position = 'absolute';
        svg.style.left = '0';
        svg.style.top = '0';
        svg.style.pointerEvents = 'none';
        svg.style.zIndex = '0';

        var drawn = {};  // 避免重复绘制 A-B 和 B-A
        allNodes.forEach(function (nd) {
            var x1 = parseFloat(nd.pos.left) / 100 * w;
            var y1 = parseFloat(nd.pos.top) / 100 * h;
            nd.neighbors.forEach(function (nbId) {
                var key = [nd.id, nbId].sort().join('-');
                if (drawn[key]) return;
                drawn[key] = true;
                var nb = nodeIndex[nbId];
                if (!nb) return;
                var x2 = parseFloat(nb.pos.left) / 100 * w;
                var y2 = parseFloat(nb.pos.top) / 100 * h;
                var line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                line.setAttribute('x1', x1);
                line.setAttribute('y1', y1);
                line.setAttribute('x2', x2);
                line.setAttribute('y2', y2);
                line.setAttribute('class', 'edge-line');
                svg.appendChild(line);
            });
        });
        map.appendChild(svg);

        allNodes.forEach(function (nd) {
            var ns = state.nodeStates[nd.id];
            var div = el('div', { className: 'fog-node', id: 'node-' + nd.id });
            if (!ns.revealed) div.classList.add('fogged');
            else div.classList.add('revealed');
            if (ns.markedX) div.classList.add('marked-x');

            div.style.left = nd.pos.left;
            div.style.top = nd.pos.top;
            div.style.transform = 'translate(-50%, -50%)';

            div.innerHTML = '<span class="node-icon">' + nd.icon + '</span><span class="node-name">' + nd.name + '</span>';

            // 左键：打开操作菜单
            div.addEventListener('click', function (e) {
                e.preventDefault(); e.stopPropagation();
                openNodePopup(nd.id, e);
            });

            // 右键：标记/取消 X
            div.addEventListener('contextmenu', function (e) {
                e.preventDefault();
                toggleMark(nd.id);
            });

            map.appendChild(div);
        });
    }

    // ======== 节点操作弹窗 ========
    function openNodePopup(nodeId, evt) {
        closePopup();
        if (state.phase !== 'play') return;

        var nd = nodeIndex[nodeId];
        var ns = state.nodeStates[nodeId];

        var popup = el('div', { className: 'node-popup', id: 'node-popup' });
        var x = Math.min(evt.clientX + 10, window.innerWidth - 400);
        var y = Math.min(evt.clientY + 10, window.innerHeight - 160);
        popup.style.left = x + 'px';
        popup.style.top = y + 'px';

        var h3 = el('h3'); h3.textContent = nd.icon + ' ' + nd.name;
        popup.appendChild(h3);

        if (ns.revealed) {
            var p = el('p'); p.textContent = '此处已探索过。'; p.style.fontSize = '.8rem'; p.style.color = '#8b949e';
            popup.appendChild(p);
        }

        var btns = el('div', { className: 'popup-btns' });

        if (!ns.revealed) {
            // 搜查按钮
            var searchBtn = el('button', { className: 'popup-btn' });
            searchBtn.textContent = '🔍 探索 (-' + state.searchCost + 'AP)';
            searchBtn.addEventListener('click', function () { closePopup(); doSearch(nodeId); });
            btns.appendChild(searchBtn);
        }

        // 指认按钮
        var arrestBtn = el('button', { className: 'popup-btn danger' });
        arrestBtn.textContent = '🎯 找到了！（免费，错罚' + state.arrestPenalty + 'AP）';
        arrestBtn.addEventListener('click', function () { closePopup(); doArrest(nodeId); });
        btns.appendChild(arrestBtn);

        // 标记按钮
        var markBtn = el('button', { className: 'popup-btn mark' });
        markBtn.textContent = ns.markedX ? '取消标记' : '✕ 标记排除';
        markBtn.addEventListener('click', function () { closePopup(); toggleMark(nodeId); });
        btns.appendChild(markBtn);

        // 关闭
        var closeBtn = el('button', { className: 'popup-btn' });
        closeBtn.textContent = '取消';
        closeBtn.addEventListener('click', closePopup);
        btns.appendChild(closeBtn);

        popup.appendChild(btns);
        document.body.appendChild(popup);
        $popup = popup;

        // 点别处关闭
        setTimeout(function () {
            document.addEventListener('click', _outsideClose);
        }, 50);
    }

    function _outsideClose(e) {
        if ($popup && !$popup.contains(e.target)) closePopup();
    }

    function closePopup() {
        if ($popup) { $popup.remove(); $popup = null; }
        document.removeEventListener('click', _outsideClose);
    }

    // ======== 搜查 ========
    function doSearch(nodeId) {
        if (state.ap < state.searchCost) { showToast('行动力不足！'); return; }

        var ns = state.nodeStates[nodeId];
        if (ns.revealed) { showToast('此处已探索过。'); return; }

        state.ap -= state.searchCost;

        // 检定
        var roll = Math.floor(Math.random() * 100) + 1;
        if (roll > state.insight) {
            // 失败：额外扣 1 AP
            state.ap = Math.max(0, state.ap - 1);
            showToast('探索不够仔细，多消耗了 1 点行动力。(掷骰 ' + roll + ' > 洞察 ' + state.insight + ')');
        }

        ns.revealed = true;
        if (ns.markedX) ns.markedX = false; // 揭开后取消标记

        // 检查是否踩中目标
        if (nodeId === state.targetNodeId) {
            // 踩中了！提示可以指认
            showToast('🔔 你在「' + nodeIndex[nodeId].name + '」发现了毛茸茸的痕迹！小家伙很可能就藏在这里！');
            addClue(nodeId, '⚠️ 此处发现大量灵宠足迹，它很可能就蹲在这里！');
        } else {
            // 生成线索
            var clueText = generateClue(nodeId);
            addClue(nodeId, clueText);
        }

        updateUI();
        refreshNodeUI(nodeId);
        checkAPDeath();
    }

    // ======== 指认 ========
    function doArrest(nodeId) {
        // 指认不消耗AP
        if (nodeId === state.targetNodeId) {
            // 胜利！
            state.phase = 'gameover';
            var nd = nodeIndex[nodeId];
            var ndEl = document.getElementById('node-' + nodeId);
            if (ndEl) ndEl.classList.add('target-found');
            state.nodeStates[nodeId].revealed = true;
            refreshNodeUI(nodeId);
            updateUI();
            showResult(true);
        } else {
            // 错误：罚 AP
            state.wrongGuesses += 1;
            state.ap = Math.max(0, state.ap - state.arrestPenalty);
            showToast('❌ 不对呢！「' + nodeIndex[nodeId].name + '」里没有小家伙的踪影，被它打发走啦！(-' + state.arrestPenalty + 'AP)');
            state.nodeStates[nodeId].revealed = true;
            // 生成一条线索作为补偿
            var clueText = generateClue(nodeId);
            addClue(nodeId, '（找错啦）' + clueText);
            refreshNodeUI(nodeId);
            updateUI();
            checkAPDeath();
        }
    }

    // ======== 标记 X ========
    function toggleMark(nodeId) {
        var ns = state.nodeStates[nodeId];
        if (ns.revealed) return;
        ns.markedX = !ns.markedX;
        refreshNodeUI(nodeId);
    }

    // ======== 线索生成 ========
    function generateClue(searchedNodeId) {
        var target = nodeIndex[state.targetNodeId];
        var ttags = target.tags;
        var templates = DB_FOG.CLUE_TEMPLATES;
        var labels = DB_FOG.TAG_LABELS;

        // 收集尚未使用过的线索类型
        var usedClueKeys = state.clues.map(function (c) { return c._key; });
        var candidates = [];

        // Type 1: has_tag (目标拥有的 tag)
        ttags.forEach(function (t) {
            var key = 'has_' + t;
            if (usedClueKeys.indexOf(key) === -1) {
                candidates.push({ type: 'has_tag', tag: t, key: key, weight: 2 });
            }
        });

        // Type 2: not_tag (目标没有的 tag)
        var allTags = Object.keys(labels);
        allTags.forEach(function (t) {
            if (ttags.indexOf(t) === -1) {
                var key = 'not_' + t;
                // 不重复，且不要给出矛盾线索（例如 "不在室内" 和 "在室外" 同时出现虽然不矛盾，但太简单）
                if (usedClueKeys.indexOf(key) === -1) {
                    candidates.push({ type: 'not_tag', tag: t, key: key, weight: 1 });
                }
            }
        });

        // Type 3: distance
        var dist = bfsDistance(searchedNodeId, state.targetNodeId);
        if (dist > 0) {
            var dkey = 'dist_from_' + searchedNodeId;
            if (usedClueKeys.indexOf(dkey) === -1) {
                candidates.push({ type: 'distance', dist: dist, from: searchedNodeId, key: dkey, weight: 3 });
            }
        }

        if (candidates.length === 0) {
            return '（此处没有发现更多有价值的线索。）';
        }

        // 加权随机选取
        var totalW = candidates.reduce(function (s, c) { return s + c.weight; }, 0);
        var r = Math.random() * totalW;
        var pick = candidates[0];
        var acc = 0;
        for (var i = 0; i < candidates.length; i++) {
            acc += candidates[i].weight;
            if (r < acc) { pick = candidates[i]; break; }
        }

        // 生成文本
        var text = '';
        if (pick.type === 'has_tag') {
            var tpls = templates.has_tag;
            text = tpls[Math.floor(Math.random() * tpls.length)].replace('{tag}', labels[pick.tag] || pick.tag);
        } else if (pick.type === 'not_tag') {
            var tpls2 = templates.not_tag;
            text = tpls2[Math.floor(Math.random() * tpls2.length)].replace('{tag}', labels[pick.tag] || pick.tag);
        } else if (pick.type === 'distance') {
            var tpls3 = templates.distance;
            text = tpls3[Math.floor(Math.random() * tpls3.length)].replace('{dist}', pick.dist);
        }

        // 记录
        state.clues.push({ step: state.step, nodeSearched: searchedNodeId, text: text, _key: pick.key });
        state.step += 1;
        return text;
    }

    function addClue(nodeId, text) {
        // 如果文本已经通过 generateClue push，不重复 push
        // generateClue 内部已经 push 了，这里只做 UI 渲染
        if (!state.clues.find(function (c) { return c.text === text; })) {
            state.clues.push({ step: state.step, nodeSearched: nodeId, text: text, _key: 'manual_' + state.step });
            state.step += 1;
        }
        renderClues();
    }

    // ======== 检查 AP 耗尽 ========
    function checkAPDeath() {
        if (state.ap <= 0 && state.phase === 'play') {
            state.phase = 'gameover';
            showResult(false);
        }
    }

    // ======== 结算 ========
    function showResult(isWin) {
        var starsCount = 0;
        if (isWin) {
            if (state.wrongGuesses === 0 && state.ap >= 10) starsCount = 3;
            else if (state.wrongGuesses <= 1 && state.ap >= 5) starsCount = 2;
            else starsCount = 1;
        }
        var starsStr = '';
        for (var i = 0; i < starsCount; i++) starsStr += '⭐';
        if (!starsStr) starsStr = '—';

        var overlay = el('div', { className: 'result-overlay' });
        var box = el('div', { className: 'result-box' });

        if (isWin) {
            var targetName = nodeIndex[state.targetNodeId].name;
            box.innerHTML =
                '<h2>🎉 找到了！</h2>' +
                '<p>你在「' + targetName + '」找到了蹲在角落里的小家伙，它不情不愿地被你抽了出来。</p>' +
                '<div class="stars">' + starsStr + '</div>' +
                '<p style="font-size:.85rem;color:#8b949e;">剩余行动力：' + state.ap + '/' + state.apMax + '<br>找错次数：' + state.wrongGuesses + ' 次</p>' +
                '<button class="topbar-btn" onclick="FogApp.restart()">再来一局</button>' +
                ' <button class="topbar-btn back-btn" onclick="location.href=\'../index.html\'">返回菜单</button>';
        } else {
            box.innerHTML =
                '<h2 style="color:#f85149;">� 没找到……</h2>' +
                '<p>天色已晚，行动力耗尽，小家伙却还藏得好好的……</p>' +
                '<p style="font-size:.85rem;color:#8b949e;">它藏在：' + nodeIndex[state.targetNodeId].name + '</p>' +
                '<button class="topbar-btn" onclick="FogApp.restart()">再来一局</button>' +
                ' <button class="topbar-btn back-btn" onclick="location.href=\'../index.html\'">返回菜单</button>';
        }

        overlay.appendChild(box);
        $root.appendChild(overlay);
    }

    // ======== UI 辅助 ========
    function updateUI() {
        var apEl = document.getElementById('stat-ap');
        if (apEl) apEl.textContent = '⚡ 行动力：' + state.ap + '/' + state.apMax;
    }

    function refreshNodeUI(nodeId) {
        var ndEl = document.getElementById('node-' + nodeId);
        if (!ndEl) return;
        var ns = state.nodeStates[nodeId];
        ndEl.classList.toggle('fogged', !ns.revealed);
        ndEl.classList.toggle('revealed', ns.revealed);
        ndEl.classList.toggle('marked-x', ns.markedX);
    }

    function renderClues() {
        if (!$clueList) $clueList = document.getElementById('clue-list');
        if (!$clueList) return;
        $clueList.innerHTML = '';
        if (state.clues.length === 0) {
            $clueList.innerHTML = '<div style="padding:16px;color:#555;font-size:.8rem;">小家伙藏好了，开始探索吧！</div>';
            return;
        }
        // 正序显示（最新在下）
        for (var i = 0; i < state.clues.length; i++) {
            var c = state.clues[i];
            var div = el('div', { className: 'clue-entry' });
            var nodeName = nodeIndex[c.nodeSearched] ? nodeIndex[c.nodeSearched].name : '未知';
            div.innerHTML = '<span class="clue-step">[第' + (c.step + 1) + '步：' + nodeName + ']</span> <span class="clue-text">' + c.text + '</span>';
            $clueList.appendChild(div);
        }
        // 自动滚动到最新线索
        $clueList.scrollTop = $clueList.scrollHeight;
    }

    function showToast(msg) {
        if (!$toast) $toast = document.getElementById('fog-toast');
        if (!$toast) return;
        $toast.textContent = msg;
        $toast.classList.add('show');
        clearTimeout($toast._timer);
        $toast._timer = setTimeout(function () { $toast.classList.remove('show'); }, 3000);
    }

    function el(tag, attrs) {
        var e = document.createElement(tag);
        if (attrs) Object.keys(attrs).forEach(function (k) { e[k] = attrs[k]; });
        return e;
    }

    // ======== 暴露全局 API ========
    window.FogApp = {
        init: init,
        restart: function () {
            var ov = $root ? $root.querySelector('.result-overlay') : null;
            if (ov) ov.remove();
            init();
        }
    };

    document.addEventListener('DOMContentLoaded', init);
})();
