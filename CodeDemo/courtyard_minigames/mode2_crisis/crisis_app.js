// ============================================================
// 模式二：庭院大管家 — 游戏主逻辑 (重构版)
// 操作流程：先选地点 → 再选NPC派遣
// ============================================================

(function () {
    'use strict';

    // ---- 游戏状态 ----
    var state = {
        turn: 1,
        maxTurns: 5,
        health: 100,
        score: 0,
        npcs: [],
        activeCrises: [],
        selectedZoneId: null,   // 当前选中的区域（新：先选地点）
        phase: 'deploy',
        usedCrisisIds: []
    };

    var $root, $map, $dock, $log, $toast;

    // ======== 初始化 ========
    function init() {
        state.npcs = JSON.parse(JSON.stringify(DB_CRISIS.NPC_POOL));
        state.activeCrises = [];
        state.turn = 1;
        state.health = 100;
        state.score = 0;
        state.selectedZoneId = null;
        state.phase = 'deploy';
        state.usedCrisisIds = [];
        render();
        spawnCrises();
        updateUI();
        addLog('info', '夜幕降临，庭院的安危就交给你了。第 1 更天开始！');
    }

    // ======== 渲染整个 DOM ========
    function render() {
        $root = document.getElementById('game-main');
        $root.className = 'crisis-game';
        $root.innerHTML = '';

        // -- 顶栏 --
        var topbar = el('div', { className: 'topbar' });
        topbar.innerHTML =
            '<span class="topbar-title" id="turn-title">夜巡庭院：第 1/5 更天</span>' +
            '<div class="topbar-stats">' +
                '<span id="stat-health">❤️ 声望：100/100</span>' +
                '<span id="stat-score">⭐ 得分：0</span>' +
            '</div>' +
            '<div style="display:flex;gap:8px;">' +
                '<button class="topbar-btn back-btn" onclick="location.href=\'../index.html\'">↩ 返回</button>' +
                '<button class="topbar-btn" id="btn-execute" onclick="CrisisApp.execute()">执行回合 ▶</button>' +
            '</div>';
        $root.appendChild(topbar);

        // -- 主体：左右分栏 --
        var body = el('div', { className: 'crisis-body' });

        // 左侧操作区（地图 + NPC卡槽）
        var left = el('div', { className: 'crisis-left' });

        // 地图区
        var mapArea = el('div', { className: 'crisis-map-area' });
        var mapWrap = el('div', { className: 'map-container', id: 'map-container' });
        var img = el('img', { src: '../assets/mapA.png', alt: '庭院地图' });
        mapWrap.appendChild(img);
        mapArea.appendChild(mapWrap);
        left.appendChild(mapArea);

        // NPC 卡槽（在左侧底部）
        var dock = el('div', { className: 'npc-dock', id: 'npc-dock' });
        left.appendChild(dock);

        body.appendChild(left);

        // 右侧日志
        var sidebar = el('div', { className: 'crisis-sidebar' });
        sidebar.innerHTML = '<div class="sidebar-title">📜 事件日志</div><div class="crisis-log" id="crisis-log"></div>';
        body.appendChild(sidebar);

        $root.appendChild(body);

        // Toast
        var toast = el('div', { className: 'toast', id: 'toast' });
        $root.appendChild(toast);

        $map = document.getElementById('map-container');
        $dock = document.getElementById('npc-dock');
        $log = document.getElementById('crisis-log');
        $toast = document.getElementById('toast');

        // 等待图片加载后放置热区
        img.onload = function () { renderZones(); };
        if (img.complete) renderZones();

        renderNpcDock();
    }

    // ======== 区域热区（卡片式，含危机信息） ========
    function renderZones() {
        var old = $map.querySelectorAll('.zone-hotspot');
        old.forEach(function (e) { e.remove(); });

        DB_CRISIS.ZONES.forEach(function (z) {
            var spot = el('div', { className: 'zone-hotspot', id: 'zone-' + z.id });
            spot.style.left = z.pos.left;
            spot.style.top = z.pos.top;
            spot.style.width = z.pos.width;
            spot.style.height = z.pos.height;

            spot.addEventListener('click', function (e) {
                e.stopPropagation();
                onZoneClick(z.id);
            });
            $map.appendChild(spot);
        });

        // 点击地图空白 → 取消选中
        $map.addEventListener('click', function () {
            if (state.selectedZoneId) {
                state.selectedZoneId = null;
                refreshAllUI();
            }
        });

        refreshAllUI();
    }

    // ======== 刷新所有区域卡片内容 ========
    function refreshAllUI() {
        DB_CRISIS.ZONES.forEach(function (z) {
            var spot = document.getElementById('zone-' + z.id);
            if (!spot) return;

            var crisis = state.activeCrises.find(function (c) { return c.zone === z.id; });

            // 清空重建内容
            spot.innerHTML = '';

            // 区域名称
            var label = el('span', { className: 'zone-label' });
            label.textContent = z.name;
            spot.appendChild(label);

            // 危机信息
            if (crisis) {
                spot.classList.add('has-crisis');
                spot.classList.remove('zone-calm');

                var infoBox = el('div', { className: 'zone-crisis-info' });

                var cName = el('div', { className: 'crisis-name' });
                cName.textContent = '⚠ ' + crisis.name;
                infoBox.appendChild(cName);

                var statName = DB_CRISIS.STAT_NAMES[crisis.req_stat] || crisis.req_stat;
                var assigned = getZoneStat(z.id, crisis.req_stat);
                var pct = Math.min(100, Math.round(assigned / crisis.req_value * 100));

                var cReq = el('div', { className: 'crisis-req' });
                cReq.textContent = statName + '：' + assigned + '/' + crisis.req_value;
                infoBox.appendChild(cReq);

                var cTimer = el('div', { className: 'crisis-timer' });
                cTimer.textContent = '⏳ ' + crisis.timer_turns + ' 刻钟';
                infoBox.appendChild(cTimer);

                // 进度条
                var bar = el('div', { className: 'crisis-progress-bar' });
                var fill = el('div', { className: 'crisis-progress-fill ' + (pct >= 100 ? 'progress-met' : 'progress-unmet') });
                fill.style.width = pct + '%';
                bar.appendChild(fill);
                infoBox.appendChild(bar);

                spot.appendChild(infoBox);
            } else {
                spot.classList.remove('has-crisis');
                spot.classList.add('zone-calm');
            }

            // 已派遣NPC头像
            var avatars = el('div', { className: 'zone-npc-avatars' });
            state.npcs.forEach(function (npc) {
                if (npc.assigned_zone === z.id) {
                    var img = el('img', { src: npc.portrait, title: npc.name });
                    avatars.appendChild(img);
                }
            });
            spot.appendChild(avatars);

            // 选中状态
            spot.classList.toggle('zone-selected', state.selectedZoneId === z.id);
        });

        renderNpcDock();
    }

    // ======== NPC 卡槽 ========
    function renderNpcDock() {
        if (!$dock) return;
        $dock.innerHTML = '';

        // 提示文字
        var hint = el('div', { className: 'npc-dock-hint' });
        if (state.selectedZoneId) {
            var zoneName = getZoneName(state.selectedZoneId);
            hint.textContent = '→ ' + zoneName;
            hint.style.color = '#58a6ff';
        } else {
            hint.textContent = '先选地点';
            hint.style.color = '#8b949e';
        }
        $dock.appendChild(hint);

        state.npcs.forEach(function (npc) {
            var card = el('div', { className: 'npc-card', id: 'card-' + npc.id });
            if (npc.stamina < 30) card.classList.add('exhausted');
            if (npc.assigned_zone) card.classList.add('assigned');

            var rarityColor = npc.rarity === 'SSR' ? '#ffd700' : (npc.rarity === 'SR' ? '#c9a96e' : '#8b949e');

            card.innerHTML =
                '<span class="npc-rarity" style="color:' + rarityColor + '">' + npc.rarity + '</span>' +
                '<img src="' + npc.portrait + '" alt="' + npc.name + '">' +
                '<span class="npc-name">' + npc.name + '</span>' +
                '<span class="npc-stats">力' + npc.stats.STR + ' 智' + npc.stats.INT + '<br>敏' + npc.stats.AGI + ' 魅' + npc.stats.CHA + '</span>' +
                '<div class="npc-stamina-bar"><div class="npc-stamina-fill" style="width:' + npc.stamina + '%;background:' + (npc.stamina < 30 ? '#f85149' : '#3fb950') + '"></div></div>';

            if (npc.assigned_zone) {
                var tag = el('span', { className: 'npc-assigned-tag' });
                tag.textContent = '→ ' + getZoneName(npc.assigned_zone);
                card.appendChild(tag);
            }

            card.addEventListener('click', function () { onNpcClick(npc.id); });
            $dock.appendChild(card);
        });
    }

    // ======== 点击区域（先选地点） ========
    function onZoneClick(zoneId) {
        if (state.phase !== 'deploy') return;

        if (state.selectedZoneId === zoneId) {
            // 再次点击 → 取消选中
            state.selectedZoneId = null;
        } else {
            state.selectedZoneId = zoneId;
        }
        refreshAllUI();

        if (state.selectedZoneId) {
            var crisis = state.activeCrises.find(function (c) { return c.zone === zoneId; });
            if (crisis) {
                var statName = DB_CRISIS.STAT_NAMES[crisis.req_stat];
                showToast('已选中「' + getZoneName(zoneId) + '」— ' + crisis.name + '（需' + statName + '≥' + crisis.req_value + '）。请在下方点击NPC进行派遣。');
            } else {
                showToast('已选中「' + getZoneName(zoneId) + '」— 当前平安无事。');
            }
        }
    }

    // ======== 点击 NPC（派遣到已选区域） ========
    function onNpcClick(npcId) {
        if (state.phase !== 'deploy') return;
        var npc = getNpc(npcId);
        if (!npc) return;

        // 如果已分配 → 点击撤回
        if (npc.assigned_zone) {
            npc.assigned_zone = null;
            showToast(npc.name + ' 已撤回待命。');
            refreshAllUI();
            return;
        }

        if (npc.stamina < 30) {
            showToast(npc.name + ' 精力不足，无法派遣！');
            return;
        }

        // 必须先选了地点
        if (!state.selectedZoneId) {
            showToast('请先在地图上选择一个区域，再点击NPC进行派遣。');
            return;
        }

        npc.assigned_zone = state.selectedZoneId;
        showToast(npc.name + ' 已派遣至「' + getZoneName(state.selectedZoneId) + '」。');
        refreshAllUI();
    }

    // ======== 执行回合 ========
    function execute() {
        if (state.phase !== 'deploy') return;
        state.phase = 'resolve';
        state.selectedZoneId = null;
        document.getElementById('btn-execute').disabled = true;

        var resolved = [];

        state.activeCrises.forEach(function (crisis) {
            var total = getZoneStat(crisis.zone, crisis.req_stat);
            var statName = DB_CRISIS.STAT_NAMES[crisis.req_stat];

            if (total >= crisis.req_value) {
                resolved.push(crisis);
                state.score += crisis.reward_score;
                addLog('success', '✅ 「' + crisis.name + '」已被成功化解！（' + statName + ' ' + total + '/' + crisis.req_value + '）获得 ' + crisis.reward_score + ' 评价。');
                state.npcs.forEach(function (n) {
                    if (n.assigned_zone === crisis.zone) n.stamina = Math.max(0, n.stamina - 30);
                });
            } else if (total > 0) {
                addLog('fail', '❌ 「' + crisis.name + '」处理失败！（' + statName + ' ' + total + '/' + crisis.req_value + '）人手不足。');
                state.npcs.forEach(function (n) {
                    if (n.assigned_zone === crisis.zone) n.stamina = Math.max(0, n.stamina - 15);
                });
            }
        });

        resolved.forEach(function (c) {
            var idx = state.activeCrises.indexOf(c);
            if (idx > -1) state.activeCrises.splice(idx, 1);
        });

        // 倒计时衰减
        var toRemove = [];
        state.activeCrises.forEach(function (crisis) {
            crisis.timer_turns -= 1;
            if (crisis.timer_turns <= 0) {
                state.health = Math.max(0, state.health + crisis.penalty_health);
                addLog('fail', '💥 「' + crisis.name + '」未能及时处理，庭院受到损失！声望 ' + crisis.penalty_health);
                toRemove.push(crisis);
            }
        });
        toRemove.forEach(function (c) {
            var idx = state.activeCrises.indexOf(c);
            if (idx > -1) state.activeCrises.splice(idx, 1);
        });

        // 清除分配 + 恢复精力
        state.npcs.forEach(function (n) {
            n.assigned_zone = null;
            if (n.stamina < n.maxStamina) n.stamina = Math.min(n.maxStamina, n.stamina + 10);
        });

        state.turn += 1;
        updateUI();

        // 检查胜负
        if (state.health <= 0) {
            state.phase = 'gameover';
            refreshAllUI();
            showResult(false);
            return;
        }
        if (state.turn > state.maxTurns) {
            state.phase = 'gameover';
            refreshAllUI();
            showResult(true);
            return;
        }

        spawnCrises();
        state.phase = 'deploy';
        document.getElementById('btn-execute').disabled = false;
        addLog('info', '── 第 ' + state.turn + ' 更天开始 ──');
        refreshAllUI();
    }

    // ======== 生成危机 ========
    function spawnCrises() {
        var count = (state.turn <= 2) ? 1 : 2;
        var busyZones = state.activeCrises.map(function (c) { return c.zone; });

        for (var i = 0; i < count; i++) {
            var available = DB_CRISIS.CRISIS_POOL.filter(function (evt) {
                if (state.usedCrisisIds.indexOf(evt.id) > -1) return false;
                return evt.zone_tags.some(function (zt) { return busyZones.indexOf(zt) === -1; });
            });
            if (available.length === 0) break;

            var picked = available[Math.floor(Math.random() * available.length)];
            state.usedCrisisIds.push(picked.id);

            var freeZones = picked.zone_tags.filter(function (zt) { return busyZones.indexOf(zt) === -1; });
            var zone = freeZones[Math.floor(Math.random() * freeZones.length)];
            busyZones.push(zone);

            var crisis = {
                id: picked.id, name: picked.name, zone: zone,
                desc_text: picked.desc_text, req_stat: picked.req_stat,
                req_value: picked.req_value, timer_turns: picked.timer_turns,
                reward_score: picked.reward_score, penalty_health: picked.penalty_health
            };
            state.activeCrises.push(crisis);
            addLog('info', '⚠ 「' + getZoneName(zone) + '」发生了「' + crisis.name + '」！需 ' + DB_CRISIS.STAT_NAMES[crisis.req_stat] + '≥' + crisis.req_value + '，限 ' + crisis.timer_turns + ' 刻钟！');
        }
    }

    // ======== 结算 ========
    function showResult(isWin) {
        var stars = state.score >= 400 ? '⭐⭐⭐' : (state.score >= 200 ? '⭐⭐' : '⭐');
        var overlay = el('div', { className: 'result-overlay' });
        var box = el('div', { className: 'result-box' });
        if (isWin) {
            box.innerHTML =
                '<h2>🌅 天明破晓</h2>' +
                '<p>庭院安然无恙，你统筹有方。</p>' +
                '<p>总得分：<strong>' + state.score + '</strong></p>' +
                '<div class="stars">' + stars + '</div>' +
                '<p style="color:#8b949e;">声望剩余：' + state.health + '/100</p>' +
                '<button class="topbar-btn" onclick="CrisisApp.restart()">再来一局</button>' +
                ' <button class="topbar-btn back-btn" onclick="location.href=\'../index.html\'">返回菜单</button>';
        } else {
            box.innerHTML =
                '<h2 style="color:#f85149;">💀 局势失控</h2>' +
                '<p>声望跌破底线，满庭风雨不堪收拾……</p>' +
                '<p>总得分：<strong>' + state.score + '</strong></p>' +
                '<p style="color:#8b949e;">坚持到第 ' + (state.turn - 1) + ' 更天</p>' +
                '<button class="topbar-btn" onclick="CrisisApp.restart()">再来一局</button>' +
                ' <button class="topbar-btn back-btn" onclick="location.href=\'../index.html\'">返回菜单</button>';
        }
        overlay.appendChild(box);
        $root.appendChild(overlay);
    }

    // ======== 辅助函数 ========
    function updateUI() {
        var title = document.getElementById('turn-title');
        if (title) title.textContent = '夜巡庭院：第 ' + Math.min(state.turn, state.maxTurns) + '/' + state.maxTurns + ' 更天';
        var hp = document.getElementById('stat-health');
        if (hp) hp.innerHTML = '❤️ 声望：' + state.health + '/100';
        var sc = document.getElementById('stat-score');
        if (sc) sc.innerHTML = '⭐ 得分：' + state.score;
    }

    function getNpc(id) { return state.npcs.find(function (n) { return n.id === id; }); }
    function getZoneName(zoneId) { var z = DB_CRISIS.ZONES.find(function (z) { return z.id === zoneId; }); return z ? z.name : zoneId; }

    function getZoneStat(zoneId, stat) {
        var total = 0;
        state.npcs.forEach(function (n) {
            if (n.assigned_zone === zoneId) total += (n.stats[stat] || 0);
        });
        return total;
    }

    function addLog(type, text) {
        if (!$log) return;
        var entry = el('div', { className: 'log-entry log-' + type });
        entry.textContent = text;
        $log.appendChild(entry);
        $log.scrollTop = $log.scrollHeight;
    }

    function showToast(msg) {
        if (!$toast) return;
        $toast.textContent = msg;
        $toast.classList.add('show');
        clearTimeout($toast._timer);
        $toast._timer = setTimeout(function () { $toast.classList.remove('show'); }, 2500);
    }

    function el(tag, attrs) {
        var e = document.createElement(tag);
        if (attrs) Object.keys(attrs).forEach(function (k) { e[k] = attrs[k]; });
        return e;
    }

    // ======== 暴露全局 API ========
    window.CrisisApp = {
        init: init,
        execute: execute,
        restart: function () {
            var ov = $root.querySelector('.result-overlay');
            if (ov) ov.remove();
            init();
        }
    };

    document.addEventListener('DOMContentLoaded', init);
})();
