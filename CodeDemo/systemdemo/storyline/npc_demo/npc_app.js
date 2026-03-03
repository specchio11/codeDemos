// ============================================================
// npc_app.js — NPC Demo 页面主逻辑 (剧情文件夹/npc_demo)
// 模拟万宝阁迎客系统的NPC随机生成
// 本文件是"剧情入口"，负责页面交互和状态管理
// ============================================================

var NPC_APP = (function () {

    // --- 页面内部状态（模拟剧情文件的局部上下文） ---
    var _npcList = [];
    var _selectedId = null;
    var _panelState = { debug: true, log: true };

    // ═══════════════════════════════════════════
    //  初始化（入口 load）
    // ═══════════════════════════════════════════
    function init() {
        // 从 ac.cVar 加载已持有的NPC
        var saved = ac.cVar.mg_npc_random;
        if (saved) {
            try { _npcList = JSON.parse(saved); } catch (e) { _npcList = []; }
        }

        // 绑定诱饵选择器的说明文字更新
        var lureSelect = document.getElementById('lure-type');
        if (lureSelect) {
            lureSelect.addEventListener('change', function () {
                var desc = NPC_LURE_TYPES[this.value];
                var descEl = document.getElementById('lure-desc');
                if (descEl && desc) descEl.textContent = desc.desc;
            });
        }

        _renderList();
        _updateCounter();
        _log('系统初始化完成，当前持有 ' + _npcList.length + ' 位散修', 'info');
    }

    // ═══════════════════════════════════════════
    //  生成NPC
    // ═══════════════════════════════════════════
    function generate(count) {
        var lureType = document.getElementById('lure-type').value;

        for (var i = 0; i < count; i++) {
            // 检查上限
            if (_npcList.length >= NPC_MAX_RANDOM) {
                _log('⚠ 散修名录已满 (' + NPC_MAX_RANDOM + '/' + NPC_MAX_RANDOM + ')，需先遣散现有散修', 'warn');
                UI_showModal({
                    title: '散修客房已满',
                    content: '当前名录已满（' + NPC_MAX_RANDOM + '人），无法招募新的散修。<br><br>请先从名录中选择角色进行 <strong>【遣散】</strong> 以腾出位置（腾笼换鸟）。',
                    buttons: [{ text: '知道了' }]
                });
                return;
            }

            _logSeparator();
            _log('▶ 开始第 ' + (i + 1) + '/' + count + ' 次招募…', 'info');

            // 调用函数文件夹中的生成器
            var result = MG_generateRandomNpc({ lureType: lureType }, _npcList);
            var npc = result.npc;
            var genLog = result.log;

            // 输出生成日志
            for (var j = 0; j < genLog.length; j++) {
                var line = genLog[j];
                var cls = 'info';
                if (line.indexOf('[种族]') === 0) cls = 'race';
                else if (line.indexOf('[性格]') === 0) cls = 'personality';
                else if (line.indexOf('[技能') === 0) cls = 'skill';
                else if (line.indexOf('[完成]') === 0) cls = 'success';
                _log(line, cls);
            }

            _npcList.push(npc);
        }

        // 保存到 ac.cVar（出口 save）
        _save();
        _renderList();
        _updateCounter();

        // 自动选中最后生成的NPC
        if (_npcList.length > 0) {
            selectNpc(_npcList[_npcList.length - 1].id);
        }
    }

    // ═══════════════════════════════════════════
    //  选中NPC
    // ═══════════════════════════════════════════
    function selectNpc(id) {
        _selectedId = id;
        _renderList();
        _renderDetail();
        _renderDebug();
    }

    // ═══════════════════════════════════════════
    //  遣散NPC（腾笼换鸟）
    // ═══════════════════════════════════════════
    function dismissNpc(id) {
        var idx = -1;
        for (var i = 0; i < _npcList.length; i++) {
            if (_npcList[i].id === id) { idx = i; break; }
        }
        if (idx === -1) return;

        var npc = _npcList[idx];
        UI_showModal({
            title: '遣散确认',
            content: '确定要遣散 <strong>' + npc.name + '</strong> 吗？<br>遣散后将获得 <span style="color:var(--accent-purple)">【尘缘玉】</span> 作为补偿。',
            buttons: [
                {
                    text: '确认遣散', className: 'btn-danger',
                    onClick: function () {
                        _npcList.splice(idx, 1);
                        _log('✖ 已遣散: ' + npc.name + '（获得尘缘玉 ×1）', 'warn');
                        _selectedId = null;
                        _save();
                        _renderList();
                        _renderDetail();
                        _renderDebug();
                        _updateCounter();
                    }
                },
                { text: '取消' }
            ]
        });
    }

    // ═══════════════════════════════════════════
    //  清空全部
    // ═══════════════════════════════════════════
    function clearAll() {
        if (_npcList.length === 0) return;
        UI_showModal({
            title: '全部遣散',
            content: '确定要遣散全部 <strong>' + _npcList.length + '</strong> 位散修吗？<br>此操作不可撤销。',
            buttons: [
                {
                    text: '全部遣散', className: 'btn-danger',
                    onClick: function () {
                        _log('✖ 已清空全部 ' + _npcList.length + ' 位散修', 'warn');
                        _npcList = [];
                        _selectedId = null;
                        _save();
                        _renderList();
                        _renderDetail();
                        _renderDebug();
                        _updateCounter();
                    }
                },
                { text: '取消' }
            ]
        });
    }

    // ═══════════════════════════════════════════
    //  模拟生成（不实际添加，统计分布）
    // ═══════════════════════════════════════════
    function simulate(count) {
        var lureType = document.getElementById('lure-type').value;
        var stats = {
            gender: {},
            race: {},
            personality: {},
            portrait: {},
            skill_prefix: {}
        };
        var fakeList = [];

        for (var i = 0; i < count; i++) {
            var result = MG_generateRandomNpc({ lureType: lureType }, fakeList);
            var npc = result.npc;
            fakeList.push(npc);

            stats.gender[npc.gender] = (stats.gender[npc.gender] || 0) + 1;
            stats.race[npc.race] = (stats.race[npc.race] || 0) + 1;
            stats.personality[npc.personality] = (stats.personality[npc.personality] || 0) + 1;
            stats.portrait[npc.portrait_id] = (stats.portrait[npc.portrait_id] || 0) + 1;

            // skill_id 就是前缀key
            stats.skill_prefix[npc.skill_id] = (stats.skill_prefix[npc.skill_id] || 0) + 1;
        }

        // 构建弹窗内容
        var html = '<div style="font-size:0.9rem;line-height:1.7;max-height:60vh;overflow-y:auto">';
        html += '<p style="color:var(--text-muted);margin-bottom:12px">诱饵类型: <strong>' +
            NPC_LURE_TYPES[lureType].name + '</strong> × ' + count + ' 次</p>';

        // 性别
        html += _simSection('👤 性别分布', stats.gender, count, {
            male: '男', female: '女'
        });

        // 种族
        var raceLabels = {};
        for (var ri = 0; ri < NPC_RACE_POOL.length; ri++) {
            raceLabels[NPC_RACE_POOL[ri].id] = NPC_RACE_POOL[ri].name;
        }
        html += _simSection('🌍 种族分布', stats.race, count, raceLabels);

        // 性格
        var persLabels = {};
        for (var pi = 0; pi < NPC_PERSONALITY_POOL.length; pi++) {
            persLabels[NPC_PERSONALITY_POOL[pi].id] = NPC_PERSONALITY_POOL[pi].name;
        }
        html += _simSection('🎭 性格分布', stats.personality, count, persLabels);

        // 立绘
        var portraitLabels = {};
        var pKeys = Object.keys(stats.portrait);
        for (var pk = 0; pk < pKeys.length; pk++) {
            portraitLabels[pKeys[pk]] = pKeys[pk].replace('$img_', '');
        }
        html += _simSection('🖼️ 立绘分布', stats.portrait, count, portraitLabels);

        // 技能前缀
        var prefixLabels = {};
        var pfxKeys = Object.keys(NPC_SKILL_PREFIX);
        for (var sk = 0; sk < pfxKeys.length; sk++) {
            prefixLabels[pfxKeys[sk]] = NPC_SKILL_PREFIX[pfxKeys[sk]].name;
        }
        html += _simSection('⚔️ 技能前缀分布', stats.skill_prefix, count, prefixLabels);

        html += '</div>';

        UI_showModal({
            title: '📊 模拟生成报告（' + count + ' 次）',
            content: html,
            buttons: [{ text: '关闭' }]
        });

        _log('📊 完成 ' + count + ' 次模拟生成（诱饵: ' + NPC_LURE_TYPES[lureType].name + '）', 'info');
    }

    function _simSection(title, dataMap, total, labelMap) {
        var html = '<div style="margin-bottom:14px">';
        html += '<div style="color:var(--accent-gold);font-weight:bold;margin-bottom:4px">' + title + '</div>';

        var keys = Object.keys(dataMap);
        keys.sort(function (a, b) { return dataMap[b] - dataMap[a]; });

        for (var i = 0; i < keys.length; i++) {
            var k = keys[i];
            var cnt = dataMap[k];
            var pct = (cnt / total * 100).toFixed(1);
            var label = (labelMap && labelMap[k]) || k;
            var barW = (cnt / total * 100);

            html += '<div style="display:flex;align-items:center;gap:8px;margin-bottom:2px;font-size:0.85rem">' +
                '<span style="width:80px;flex-shrink:0;text-align:right;color:var(--text-secondary)">' + label + '</span>' +
                '<div style="flex:1;height:14px;background:rgba(255,255,255,0.06);border-radius:3px;overflow:hidden">' +
                    '<div style="height:100%;width:' + barW + '%;background:var(--accent-gold);border-radius:3px"></div>' +
                '</div>' +
                '<span style="width:70px;flex-shrink:0;font-family:var(--font-mono);font-size:0.8rem;color:var(--text-primary)">' +
                    cnt + ' (' + pct + '%)</span>' +
            '</div>';
        }
        html += '</div>';
        return html;
    }

    // ═══════════════════════════════════════════
    //  面板折叠切换
    // ═══════════════════════════════════════════
    function togglePanel(panel) {
        _panelState[panel] = !_panelState[panel];
        var contentId = panel === 'debug' ? 'npc-debug' : 'npc-log';
        var toggleId = panel === 'debug' ? 'debug-toggle' : 'log-toggle';
        var el = document.getElementById(contentId);
        var toggle = document.getElementById(toggleId);
        if (el) el.style.display = _panelState[panel] ? 'block' : 'none';
        if (toggle) toggle.textContent = _panelState[panel] ? '▼' : '▶';
    }

    // ═══════════════════════════════════════════
    //  内部渲染 — NPC列表
    // ═══════════════════════════════════════════
    function _renderList() {
        var container = document.getElementById('npc-list');
        if (!container) return;

        if (_npcList.length === 0) {
            container.innerHTML = '<div class="npc-list-empty">尚无散修来访，请使用诱饵招募</div>';
            return;
        }

        var html = '';
        for (var i = 0; i < _npcList.length; i++) {
            var npc = _npcList[i];
            var selected = npc.id === _selectedId ? ' selected' : '';
            var portraitPath = MG_getPortraitPath(npc.portrait_id);
            var raceName = _lookupRace(npc.race);

            html += '<div class="npc-mini-card' + selected + '" ' +
                    'onclick="NPC_APP.selectNpc(\'' + npc.id + '\')" ' +
                    'title="' + npc.name + ' · ' + raceName + '">' +
                '<img class="npc-mini-card__portrait" src="' + portraitPath + '" ' +
                     'alt="' + npc.name + '" onerror="this.style.opacity=\'0.3\'">' +
                '<div class="npc-mini-card__name">' + npc.name + '</div>' +
                '<span class="npc-mini-card__race race-badge-' + npc.race + '">' + raceName + '</span>' +
            '</div>';
        }
        container.innerHTML = html;
    }

    // ═══════════════════════════════════════════
    //  内部渲染 — NPC详情
    // ═══════════════════════════════════════════
    function _renderDetail() {
        var container = document.getElementById('npc-detail');
        if (!container) return;

        if (!_selectedId) {
            container.innerHTML = '<div class="npc-detail-empty">' +
                '<span class="empty-icon">🎭</span><p>选择一位散修查看详情</p></div>';
            return;
        }

        var npc = _findNpc(_selectedId);
        if (!npc) {
            container.innerHTML = '<div class="npc-detail-empty">' +
                '<span class="empty-icon">❓</span><p>未找到该散修</p></div>';
            return;
        }

        var portraitPath = MG_getPortraitPath(npc.portrait_id);
        var raceData = _lookupRaceData(npc.race);
        var persData = _lookupPersonality(npc.personality);
        var prefixData = NPC_SKILL_PREFIX[npc.skill_id] || null;
        var skillEntry = NPC_GAME_SKILLS[npc.skill_id] || {};

        var html = '';

        // ── 头部: 立绘 + 基本信息 ──
        html += '<div class="npc-detail-header">' +
            '<img class="npc-detail__portrait" src="' + portraitPath + '" alt="' + npc.name + '">' +
            '<div class="npc-detail__info">' +
                '<div class="npc-detail__name">' + npc.name + '</div>' +
                '<div class="npc-detail__id">ID: ' + npc.id + '</div>' +
                _statRow('性别', npc.gender === 'male' ? '男' : '女') +
                _statRow('种族', '<span class="npc-stat-value race-' + npc.race + '">' +
                    (raceData ? raceData.name : npc.race) + '</span>', true) +
                _statRow('性格', '<span style="color:var(--accent-purple)">' +
                    (persData ? persData.name : npc.personality) + '</span>', true) +
                _statRow('立绘', '<span style="font-family:var(--font-mono);color:var(--text-muted);font-size:0.8rem">' +
                    npc.portrait_id + '</span>', true) +
            '</div>' +
        '</div>';

        // ── 技能块（遍历所有游戏类型）──
        if (prefixData) {
            var pColor = prefixData.color || '#888';
            html += '<div class="npc-skill-block" style="border-left-color:' + pColor + '">' +
                '<div class="npc-skill-name">' + prefixData.name +
                    '<span class="npc-skill-prefix-tag" style="background:' + pColor + '">' +
                        prefixData.desc +
                    '</span>' +
                '</div>';

            var gameKeys = Object.keys(NPC_GAME_TYPES);
            for (var si = 0; si < gameKeys.length; si++) {
                var gt = gameKeys[si];
                var gInfo = NPC_GAME_TYPES[gt];
                var sk = skillEntry[gt];
                if (sk) {
                    html += '<div class="npc-skill-game-row">' +
                        '<span class="npc-skill-game-tag">' + gInfo.icon + ' ' + gInfo.name + '</span>' +
                        '<span class="npc-skill-game-name">' + sk.name + '</span>' +
                    '</div>' +
                    '<div class="npc-skill-desc">' + sk.desc + '</div>';
                }
            }
            html += '</div>';
        }

        // ── AI 行为权重（实时计算，不存储在NPC数据中）──
        var aiWeights = MG_mergeAIWeights(npc.race, npc.personality);
        html += '<div class="npc-ai-section">' +
            '<div class="npc-ai-title">⚖ AI 行为权重 ' +
                '<small>（实时计算 · 性格 > 种族 > 默认）</small></div>';

        for (var i = 0; i < NPC_AI_DIM_KEYS.length; i++) {
            var key = NPC_AI_DIM_KEYS[i];
            var dim = NPC_AI_DIM[key];
            var val = (aiWeights[key] !== undefined) ? aiWeights[key] : 3;
            var pct = (val / 5) * 100;
            var barColor = val <= 2 ? 'var(--accent-blue)' : (val >= 4 ? 'var(--accent-red)' : 'var(--accent-gold)');
            var lvText = NPC_AI_LEVEL_TEXT[val] || '中';

            html += '<div class="npc-ai-row">' +
                '<span class="npc-ai-icon">' + dim.icon + '</span>' +
                '<span class="npc-ai-label">' + dim.name + '</span>' +
                '<div class="npc-ai-bar-bg">' +
                    '<div class="npc-ai-bar" style="width:' + pct + '%;background:' + barColor + '"></div>' +
                '</div>' +
                '<span class="npc-ai-value">' + lvText + '</span>' +
            '</div>';
        }
        html += '</div>';

        // ── 操作按钮 ──
        html += '<div class="npc-detail-actions">' +
            '<button class="btn btn-danger" onclick="NPC_APP.dismissNpc(\'' + npc.id + '\')">遣散此人</button>' +
        '</div>';

        container.innerHTML = html;
    }

    // ═══════════════════════════════════════════
    //  内部渲染 — Debug JSON
    // ═══════════════════════════════════════════
    function _renderDebug() {
        var el = document.getElementById('npc-debug');
        if (!el) return;

        if (!_selectedId) {
            el.textContent = '// 选择NPC后显示完整数据结构';
            return;
        }

        var npc = _findNpc(_selectedId);
        if (!npc) {
            el.textContent = '// 未找到该NPC';
            return;
        }

        // ── 1. 存储数据（NPC持久化的全部字段）──
        var storedLines = [
            '// ═══ 存储数据 (NPC持久化字段，这就是实际保存的全部内容) ═══',
            '{',
            '  "id": "' + npc.id + '",',
            '  "type": "' + npc.type + '",',
            '  "name": "' + npc.name + '",',
            '  "gender": "' + npc.gender + '",',
            '  "portrait_id": "' + npc.portrait_id + '",',
            '  "race": "' + npc.race + '",',
            '  "personality": "' + npc.personality + '",',
            '  "skill_id": "' + npc.skill_id + '"',
            '}',
        ].join('\n');

        // ── 2. 运行时数据（查表/计算，不存储）──
        var runtimeData = {
            race_info: _lookupRaceData(npc.race),
            personality_info: _lookupPersonality(npc.personality),
            skill_prefix: NPC_SKILL_PREFIX[npc.skill_id] || null,
            skill_by_game: NPC_GAME_SKILLS[npc.skill_id] || null,
            ai_weights: MG_mergeAIWeights(npc.race, npc.personality),
        };

        el.textContent = storedLines +
            '\n\n// ═══ 运行时数据 (实时查表/计算，不存储在NPC数据中) ═══\n' +
            JSON.stringify(runtimeData, null, 2);
    }

    // ═══════════════════════════════════════════
    //  辅助函数
    // ═══════════════════════════════════════════
    function _updateCounter() {
        var el = document.getElementById('npc-counter');
        if (el) el.textContent = _npcList.length + ' / ' + NPC_MAX_RANDOM;
    }

    function _save() {
        ac.cVar.mg_npc_random = JSON.stringify(_npcList);
    }

    function _log(msg, cls) {
        var container = document.getElementById('npc-log');
        if (!container) return;
        var time = new Date().toLocaleTimeString('zh-CN', { hour12: false });
        var entry = document.createElement('div');
        entry.className = 'log-entry log-' + (cls || 'info');
        entry.innerHTML = '<span class="log-time">[' + time + ']</span>' + _escapeHtml(msg);
        container.appendChild(entry);

        // 限制日志条数
        while (container.children.length > 300) {
            container.removeChild(container.firstChild);
        }

        // 自动滚到底部
        container.scrollTop = container.scrollHeight;
    }

    function _logSeparator() {
        var container = document.getElementById('npc-log');
        if (!container) return;
        var sep = document.createElement('div');
        sep.className = 'log-separator';
        container.appendChild(sep);
        container.scrollTop = container.scrollHeight;
    }

    function _escapeHtml(str) {
        return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    function _statRow(label, value, isHtml) {
        return '<div class="npc-stat-row">' +
            '<span class="npc-stat-label">' + label + '</span>' +
            (isHtml ? value : '<span class="npc-stat-value">' + value + '</span>') +
        '</div>';
    }

    function _findNpc(id) {
        for (var i = 0; i < _npcList.length; i++) {
            if (_npcList[i].id === id) return _npcList[i];
        }
        return null;
    }

    // --- 查表辅助 ---
    function _lookupRace(raceId) {
        for (var i = 0; i < NPC_RACE_POOL.length; i++) {
            if (NPC_RACE_POOL[i].id === raceId) return NPC_RACE_POOL[i].name;
        }
        return raceId;
    }

    function _lookupRaceData(raceId) {
        for (var i = 0; i < NPC_RACE_POOL.length; i++) {
            if (NPC_RACE_POOL[i].id === raceId) return NPC_RACE_POOL[i];
        }
        return null;
    }

    function _lookupPersonality(persId) {
        for (var i = 0; i < NPC_PERSONALITY_POOL.length; i++) {
            if (NPC_PERSONALITY_POOL[i].id === persId) return NPC_PERSONALITY_POOL[i];
        }
        return null;
    }

    function _lookupSkill(skillId) {
        // 新架构: skill_id 就是前缀key，查NPC_GAME_SKILLS
        return NPC_GAME_SKILLS[skillId] || null;
    }

    // ═══════════════════════════════════════════
    //  公开 API（供 HTML onclick 调用）
    // ═══════════════════════════════════════════
    return {
        init: init,
        generate: generate,
        simulate: simulate,
        selectNpc: selectNpc,
        dismissNpc: dismissNpc,
        clearAll: clearAll,
        togglePanel: togglePanel,
    };

})();

// ── 页面加载完成后执行初始化（模拟剧情文件的顶层 await 入口）──
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { NPC_APP.init(); });
} else {
    NPC_APP.init();
}
