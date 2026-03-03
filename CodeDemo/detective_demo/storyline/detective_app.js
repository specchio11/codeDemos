// ============================================================
// detective_app.js — 庭院探案 主逻辑 (剧情文件夹)
// 负责页面交互、游戏主循环、渲染
// ============================================================

var DT_APP = (function () {

    // --- 游戏状态（剧情文件局部变量，不放在函数文件夹）---
    var _state = null;   // 当前案件实例
    var _ap = 0;
    var _pressure = 0;
    var _collectedClues = [];
    var _usedSkills = {};
    var _selectedSkill = null;
    var _gamePhase = 'title'; // title | opening | playing | accuse | verdict
    var _log = [];
    var _visitedLocations = {};
    var _dialoguesSeen = {};

    // ═══════════════════════════════════════════
    //  初始化
    // ═══════════════════════════════════════════
    function init() {
        _showTitleScreen();
    }

    // ─── 标题画面 ───
    function _showTitleScreen() {
        _gamePhase = 'title';
        var main = document.getElementById('game-main');
        main.innerHTML = '';

        var titleDiv = document.createElement('div');
        titleDiv.className = 'dt-title-screen';
        titleDiv.innerHTML =
            '<div class="dt-title-logo">🔍</div>' +
            '<h1 class="dt-title-name">庭院探案</h1>' +
            '<p class="dt-title-sub">万宝阁 · 悬案卷宗</p>' +
            '<div class="dt-title-cases" id="case-select"></div>';
        main.appendChild(titleDiv);

        var caseSelect = document.getElementById('case-select');
        for (var i = 0; i < DT_CASE_TEMPLATES.length; i++) {
            var t = DT_CASE_TEMPLATES[i];
            (function(tmpl) {
                var btn = document.createElement('button');
                btn.className = 'btn btn-case';
                btn.innerHTML = '<span class="case-icon">' + tmpl.icon + '</span>' +
                    '<span class="case-info"><strong>' + tmpl.name + '</strong><br>' +
                    '<small>' + tmpl.type + ' · 嫌疑人' + tmpl.involvedSuspects.length + '名</small></span>';
                btn.onclick = function() { _startCase(tmpl.id); };
                caseSelect.appendChild(btn);
            })(t);
        }

        // 随机开局按钮
        var randBtn = document.createElement('button');
        randBtn.className = 'btn btn-primary btn-random';
        randBtn.textContent = '🎲 随机悬案';
        randBtn.onclick = function() { _startCase(null); };
        caseSelect.appendChild(randBtn);

        // 技能选择
        var skillDiv = document.createElement('div');
        skillDiv.className = 'dt-skill-select';
        skillDiv.innerHTML = '<h3>选择同伴技能（择一）</h3><div class="dt-skill-list" id="skill-list"></div>';
        main.appendChild(skillDiv);

        var skillList = document.getElementById('skill-list');
        for (var i = 0; i < DT_NPC_SKILLS.length; i++) {
            (function(sk) {
                var btn = document.createElement('button');
                btn.className = 'btn btn-skill' + (_selectedSkill === sk.id ? ' selected' : '');
                btn.innerHTML = '<span class="skill-icon">' + sk.icon + '</span> ' +
                    '<strong>' + sk.name + '</strong><br><small>' + sk.desc + '</small>';
                btn.onclick = function() {
                    _selectedSkill = sk.id;
                    // 刷新选中态
                    var all = document.querySelectorAll('.btn-skill');
                    for (var j = 0; j < all.length; j++) all[j].classList.remove('selected');
                    btn.classList.add('selected');
                };
                skillList.appendChild(btn);
            })(DT_NPC_SKILLS[i]);
        }
        // 默认选第一个
        if (!_selectedSkill) _selectedSkill = DT_NPC_SKILLS[0].id;
        var firstBtn = skillList.querySelector('.btn-skill');
        if (firstBtn) firstBtn.classList.add('selected');
    }

    // ─── 开始案件 ───
    function _startCase(templateId) {
        _state = DT_generateCase(templateId);
        _ap = _state.maxAP;
        _pressure = 0;
        _collectedClues = [];
        _usedSkills = {};
        _visitedLocations = {};
        _dialoguesSeen = {};
        _log = [];
        _gamePhase = 'opening';

        _addLog('📋 悬案：' + _state.template.name, 'title');

        // 显示干扰事件
        for (var i = 0; i < _state.disturbances.length; i++) {
            _addLog(_state.disturbances[i].text, 'dist');
        }

        _showOpening();
    }

    // ─── 开场叙事 ───
    function _showOpening() {
        var main = document.getElementById('game-main');
        main.innerHTML = '';

        var openDiv = document.createElement('div');
        openDiv.className = 'dt-opening';

        var lines = [
            { speaker: '旁白', text: _state.template.openingNarrator, cls: 'narrator' },
            { speaker: '管事', text: _state.template.openingSteward, cls: 'steward' },
            { speaker: '你',   text: _state.template.openingPlayer, cls: 'player' }
        ];

        var html = '<div class="dt-opening-title">' + _state.template.icon + ' ' + _state.template.name + '</div>';
        for (var i = 0; i < lines.length; i++) {
            html += '<div class="dt-dialogue-line ' + lines[i].cls + '">' +
                '<span class="dt-speaker">' + lines[i].speaker + '</span>' +
                '<span class="dt-speech">' + lines[i].text + '</span></div>';
        }
        html += '<button class="btn btn-primary btn-start-investigate" onclick="DT_APP.enterInvestigation()">开始调查</button>';

        openDiv.innerHTML = html;
        main.appendChild(openDiv);
    }

    // ─── 进入调查主界面 ───
    function enterInvestigation() {
        _gamePhase = 'playing';
        _renderGameUI();
    }

    // ─── 渲染主游戏界面 ───
    function _renderGameUI() {
        var main = document.getElementById('game-main');
        main.innerHTML = '';

        // 顶部状态栏
        var statusBar = document.createElement('div');
        statusBar.className = 'dt-status-bar';
        statusBar.innerHTML =
            '<div class="dt-stat"><span class="dt-stat-label">行动力</span><span class="dt-stat-value" id="ap-display">' + _ap + ' / ' + _state.maxAP + '</span></div>' +
            '<div class="dt-stat"><span class="dt-stat-label">压力</span><span class="dt-stat-value dt-pressure-' + Math.min(_pressure, 3) + '" id="pressure-display">' + _pressure + ' / 3</span></div>' +
            '<div class="dt-stat"><span class="dt-stat-label">线索</span><span class="dt-stat-value">' + _collectedClues.length + '</span></div>' +
            '<div class="dt-stat-actions">' +
                '<button class="btn btn-sm btn-evidence" onclick="DT_APP.showEvidence()">📋 证据板</button>' +
                '<button class="btn btn-sm btn-accuse" onclick="DT_APP.showAccuse()" ' + (_collectedClues.length < 3 ? 'disabled' : '') + '>⚖️ 结案指认</button>' +
                (_selectedSkill ? '<button class="btn btn-sm btn-use-skill" id="btn-skill" onclick="DT_APP.useSkill()">' + _getSkillById(_selectedSkill).icon + ' ' + _getSkillById(_selectedSkill).name + '</button>' : '') +
            '</div>';
        main.appendChild(statusBar);

        // 地图+日志包裹容器（flex填满剩余高度）
        var contentArea = document.createElement('div');
        contentArea.className = 'dt-content-area';

        // 地图+地点按钮区域
        var mapArea = document.createElement('div');
        mapArea.className = 'dt-map-area';
        mapArea.innerHTML = '<img src="assets/mapA.png" class="dt-map-bg" alt="庭院地图" draggable="false">';

        // 生成地点热区
        for (var i = 0; i < DT_LOCATIONS.length; i++) {
            (function(loc) {
                var pin = document.createElement('div');
                pin.className = 'dt-map-pin' + (_visitedLocations[loc.id] ? ' visited' : '');
                pin.style.left = (loc.x * 100) + '%';
                pin.style.top = (loc.y * 100) + '%';

                // 检查该地点是否还有未发现的线索
                var hasClue = _locationHasUndiscovered(loc.id);
                if (hasClue) pin.classList.add('has-clue');

                pin.innerHTML = '<span class="pin-icon">' + loc.icon + '</span><span class="pin-name">' + loc.name + '</span>';
                pin.onclick = function() { _investigateLocation(loc); };
                pin.title = loc.desc;
                mapArea.appendChild(pin);
            })(DT_LOCATIONS[i]);
        }
        contentArea.appendChild(mapArea);

        // 底部日志（从上到下，最新在最下面）
        var logArea = document.createElement('div');
        logArea.className = 'dt-log-area';
        logArea.id = 'dt-log';
        var logHtml = '';
        for (var i = 0; i < _log.length; i++) {
            logHtml += '<div class="dt-log-entry dt-log-' + _log[i].cls + '">' + _log[i].text + '</div>';
        }
        logArea.innerHTML = logHtml;
        contentArea.appendChild(logArea);
        main.appendChild(contentArea);

        // 给 game-main 加上布局 class
        main.classList.add('dt-game-layout');

        // 自动滚动到日志底部
        setTimeout(function() {
            var el = document.getElementById('dt-log');
            if (el) el.scrollTop = el.scrollHeight;
        }, 50);
    }

    // ─── 调查某个地点 ───
    function _investigateLocation(loc) {
        if (_ap <= 0) {
            _showModal('行动力耗尽', '天已破晓，你无法继续调查了。请根据现有线索结案。', [
                { text: '结案指认', onClick: function() { showAccuse(); } }
            ]);
            return;
        }

        _visitedLocations[loc.id] = true;

        // 收集可发现线索和可对话NPC
        var availableClues = [];
        var availableDialogues = [];
        var foundIds = {};
        for (var i = 0; i < _collectedClues.length; i++) foundIds[_collectedClues[i].id] = true;

        var allClues = _state.keyClues.concat(_state.noiseClues);
        for (var i = 0; i < allClues.length; i++) {
            if (allClues[i].locationId === loc.id && !foundIds[allClues[i].id]) {
                availableClues.push(allClues[i]);
            }
        }

        // 找该地点归属的NPC对话（从案件实例的对话包中查找）
        var dkeys = Object.keys(_state.dialogues);
        for (var i = 0; i < dkeys.length; i++) {
            if (!_dialoguesSeen[dkeys[i]]) {
                // 键格式：npcId_action（不含caseId前缀）
                var parts = dkeys[i].split('_');
                var npcId = parts[0];
                var action = parts[1]; // ask / press / confront
                // 检查该NPC的线索是否关联到此地点
                for (var j = 0; j < allClues.length; j++) {
                    if (allClues[j].locationId === loc.id && allClues[j].npcId === npcId) {
                        availableDialogues.push({ key: dkeys[i], npcId: npcId, action: action, dialogue: _state.dialogues[dkeys[i]] });
                        break;
                    }
                }
            }
        }

        // 构建行动面板
        _showLocationPanel(loc, availableClues, availableDialogues);
    }

    // ─── 地点调查面板 ───
    function _showLocationPanel(loc, clues, dialogues) {
        var overlay = document.createElement('div');
        overlay.className = 'dt-overlay';
        overlay.id = 'dt-overlay';

        var panel = document.createElement('div');
        panel.className = 'dt-location-panel';

        var html = '<div class="dt-loc-header">' +
            '<span class="dt-loc-icon">' + loc.icon + '</span>' +
            '<div><h2>' + loc.name + '</h2><p>' + loc.desc + '</p></div>' +
            '<button class="btn btn-close" onclick="DT_APP.closePanel()">✕</button></div>';

        html += '<div class="dt-loc-actions">';

        if (clues.length === 0 && dialogues.length === 0) {
            html += '<div class="dt-no-action">此处已无新线索可查。</div>';
        }

        // 搜证按钮
        for (var i = 0; i < clues.length; i++) {
            var clue = clues[i];
            var actionText = clue.type === 'noise' ? '🔎 搜查可疑物品' : (clue.type === 'evidence' ? '🔎 勘验现场' : '🔎 搜集证据');
            html += '<button class="btn btn-action btn-investigate" data-clue-id="' + clue.id + '" onclick="DT_APP.doInvestigate(\'' + clue.id + '\')">' +
                actionText + ' <small>(消耗1AP)</small></button>';
        }

        // 对话按钮
        var seenNpcs = {};
        for (var i = 0; i < dialogues.length; i++) {
            var d = dialogues[i];
            if (seenNpcs[d.npcId + '_' + d.action]) continue;
            seenNpcs[d.npcId + '_' + d.action] = true;
            var actionLabel = d.action === 'ask' ? '询问' : (d.action === 'press' ? '追问' : '质证');
            html += '<button class="btn btn-action btn-dialogue" onclick="DT_APP.doDialogue(\'' + d.key + '\')">' +
                '💬 ' + actionLabel + d.dialogue.speaker + ' <small>(消耗1AP)</small></button>';
        }

        html += '</div>';
        panel.innerHTML = html;
        overlay.appendChild(panel);
        document.body.appendChild(overlay);

        // 点击遮罩关闭
        overlay.addEventListener('click', function(e) {
            if (e.target === overlay) closePanel();
        });
    }

    // ─── 执行搜证 ───
    function doInvestigate(clueId) {
        if (_ap <= 0) return;
        _ap--;

        var clue = null;
        var allClues = _state.keyClues.concat(_state.noiseClues);
        for (var i = 0; i < allClues.length; i++) {
            if (allClues[i].id === clueId) { clue = allClues[i]; break; }
        }
        if (!clue) return;

        // 检定
        var baseRate = 55 + Math.floor(clue.reliability * 20);
        var skillBonus = 0;
        if (_selectedSkill === 'SK_OBSERVE') skillBonus = 20;

        // 干扰影响
        var distDebuff = 0;
        for (var i = 0; i < _state.disturbances.length; i++) {
            var dist = _state.disturbances[i];
            if (dist.effect === 'location_debuff' && dist.locationId === clue.locationId) {
                distDebuff += dist.value * 100;
            }
            if (dist.effect === 'outdoor_reliability_down' && (clue.locationId === 'bridge' || clue.locationId === 'garden' || clue.locationId === 'side')) {
                distDebuff += dist.value * 100;
            }
        }

        var result = DT_performCheck(baseRate, skillBonus, _pressure, distDebuff);

        if (result.success) {
            _collectedClues.push(clue);
            var typeLabel = { evidence: '物证', testimony: '证词', motive: '动机', contradiction: '矛盾', noise: '杂物' };
            var label = typeLabel[clue.type] || '线索';

            if (clue.type === 'noise') {
                _addLog('🔎 [' + label + '] ' + clue.text + ' （似乎与案件无关）', 'noise');
            } else {
                _addLog('✅ [' + label + '] ' + clue.text, clue.type);
            }
        } else {
            _pressure++;
            _addLog('❌ 检定失败 (掷' + result.roll + ' / 需≤' + result.threshold + ')，压力+1', 'fail');

            // 重试技能
            if (_selectedSkill === 'SK_RETRY' && !_usedSkills['SK_RETRY']) {
                _usedSkills['SK_RETRY'] = true;
                var retry = DT_performCheck(baseRate, skillBonus + 10, _pressure, distDebuff);
                if (retry.success) {
                    _pressure--; // 取消刚才的压力
                    _collectedClues.push(clue);
                    var typeLabel2 = { evidence: '物证', testimony: '证词', motive: '动机', contradiction: '矛盾', noise: '杂物' };
                    _addLog('🔄 [旧案经验] 重新检定成功！获得 [' + (typeLabel2[clue.type] || '线索') + ']', clue.type);
                } else {
                    _addLog('🔄 [旧案经验] 重新检定也失败了…', 'fail');
                }
            }
        }

        closePanel();
        _renderGameUI();
        _checkGameEnd();
    }

    // ─── 执行对话 ───
    function doDialogue(dialogueKey) {
        if (_ap <= 0) return;
        _ap--;
        _dialoguesSeen[dialogueKey] = true;

        var d = _state.dialogues[dialogueKey];
        if (!d) return;

        _addLog('💬 ' + d.speaker + '：' + d.text, 'dialogue');

        // 检查该对话是否明确关联一条线索（由数据层 yieldsClueId 指定）
        if (d.yieldsClueId) {
            var allClues = _state.keyClues.concat(_state.noiseClues);
            var c = null;
            for (var i = 0; i < allClues.length; i++) {
                if (allClues[i].id === d.yieldsClueId) { c = allClues[i]; break; }
            }
            if (c) {
                var alreadyHas = false;
                for (var j = 0; j < _collectedClues.length; j++) {
                    if (_collectedClues[j].id === c.id) { alreadyHas = true; break; }
                }
                if (!alreadyHas) {
                    // 对话检定获得线索
                    var baseRate = 60 + Math.floor(c.reliability * 20);
                    var skillBonus = (_selectedSkill === 'SK_OBSERVE') ? 20 : 0;
                    if (_selectedSkill === 'SK_SOCIAL') skillBonus += 10;
                    var res = DT_performCheck(baseRate, skillBonus, _pressure, 0);
                    if (res.success) {
                        _collectedClues.push(c);
                        var tl = { testimony: '证词', motive: '动机', evidence: '物证', contradiction: '矛盾' };
                        _addLog('✅ 获得 [' + (tl[c.type] || '线索') + '] ' + c.text, c.type);
                    } else {
                        _addLog('💭 对方有所保留，未能获取更多信息。(掷' + res.roll + '/需≤' + res.threshold + ')', 'fail');
                        _pressure++;
                    }
                }
            }
        }

        closePanel();
        _renderGameUI();
        _checkGameEnd();
    }

    // ─── 使用技能 ───
    function useSkill() {
        if (!_selectedSkill) return;
        var sk = _getSkillById(_selectedSkill);
        if (!sk) return;

        if (_usedSkills[_selectedSkill] && _selectedSkill !== 'SK_OBSERVE' && _selectedSkill !== 'SK_SOCIAL') {
            _addLog('⚠️ 该技能已使用过。', 'warn');
            return;
        }

        switch (_selectedSkill) {
            case 'SK_INSIGHT':
                if (_ap <= 0) { _addLog('⚠️ 行动力不足。', 'warn'); return; }
                _ap--;
                _usedSkills['SK_INSIGHT'] = true;
                // 直接给一条矛盾提示
                for (var i = 0; i < _state.keyClues.length; i++) {
                    if (_state.keyClues[i].type === 'contradiction') {
                        var alreadyHas = false;
                        for (var j = 0; j < _collectedClues.length; j++) {
                            if (_collectedClues[j].id === _state.keyClues[i].id) { alreadyHas = true; break; }
                        }
                        if (!alreadyHas) {
                            _addLog('🔍 [现场复盘] 灵光一闪——' + _state.keyClues[i].text, 'contradiction');
                            _collectedClues.push(_state.keyClues[i]);
                            break;
                        }
                    }
                }
                _renderGameUI();
                break;

            case 'SK_COERCE':
                if (_ap <= 0) { _addLog('⚠️ 行动力不足。', 'warn'); return; }
                _usedSkills['SK_COERCE'] = true;
                _pressure++;
                // 强制获得一条未获取的证词
                for (var i = 0; i < _state.keyClues.length; i++) {
                    if (_state.keyClues[i].type === 'testimony') {
                        var has = false;
                        for (var j = 0; j < _collectedClues.length; j++) {
                            if (_collectedClues[j].id === _state.keyClues[i].id) { has = true; break; }
                        }
                        if (!has) {
                            _collectedClues.push(_state.keyClues[i]);
                            _addLog('💢 [威慑盘问] 强制获得证词，但压力+1。', 'testimony');
                            break;
                        }
                    }
                }
                _renderGameUI();
                break;

            default:
                _addLog('ℹ️ ' + sk.name + ' — 被动技能，自动生效中。', 'info');
                break;
        }
    }

    // ─── 证据面板 ───
    function showEvidence() {
        var html = '<div class="dt-evidence-board">';
        var types = [
            { key: 'evidence', label: '📦 物证', color: '#c9a96e' },
            { key: 'testimony', label: '💬 证词', color: '#5fa8d3' },
            { key: 'motive', label: '💡 动机', color: '#e94560' },
            { key: 'contradiction', label: '⚡ 矛盾', color: '#8ac926' },
            { key: 'noise', label: '❓ 杂物', color: '#666' }
        ];

        for (var t = 0; t < types.length; t++) {
            var items = [];
            for (var i = 0; i < _collectedClues.length; i++) {
                if (_collectedClues[i].type === types[t].key) items.push(_collectedClues[i]);
            }
            if (items.length === 0) continue;

            html += '<div class="dt-ev-group"><h3 style="color:' + types[t].color + '">' + types[t].label + ' (' + items.length + ')</h3>';
            for (var i = 0; i < items.length; i++) {
                html += '<div class="dt-ev-item" style="border-left:3px solid ' + types[t].color + '">' + items[i].text + '</div>';
            }
            html += '</div>';
        }

        // 需求提示
        var req = _state.requiredProof;
        html += '<div class="dt-ev-req"><strong>结案需求：</strong>' +
            '物证×' + req.evidence + ' 证词×' + req.testimony + ' 动机×' + req.motive + ' + 矛盾×1（真相结局）</div>';
        html += '</div>';

        _showModal('📋 证据板', html, [{ text: '关闭' }]);
    }

    // ─── 结案指认 ───
    function showAccuse() {
        if (_collectedClues.length < 2) {
            _showModal('证据不足', '你至少需要收集更多线索才能结案。', [{ text: '继续调查' }]);
            return;
        }

        var html = '<p>根据已收集的 <strong>' + _collectedClues.length + '</strong> 条线索，你要指认谁是真凶？</p>' +
            '<div class="dt-accuse-list">';

        for (var i = 0; i < _state.suspects.length; i++) {
            var s = _state.suspects[i];
            html += '<button class="btn btn-accuse-target" onclick="DT_APP.doAccuse(\'' + s.id + '\')">' +
                '<span class="suspect-portrait">' + s.portrait + '</span>' +
                '<span class="suspect-name">' + s.name + '</span>' +
                '<span class="suspect-title">' + s.title + '</span></button>';
        }
        html += '</div>';

        _showModal('⚖️ 结案指认', html, [{ text: '返回调查' }]);
    }

    // ─── 执行指认 ───
    function doAccuse(suspectId) {
        _gamePhase = 'verdict';
        _closeModal();

        var reduceActive = (_selectedSkill === 'SK_DEDUCE');
        var verdict = DT_evaluateVerdict(_collectedClues, _state, suspectId, reduceActive);
        var verdictData = _state.verdicts[verdict];

        var accusedName = '';
        for (var i = 0; i < _state.suspects.length; i++) {
            if (_state.suspects[i].id === suspectId) { accusedName = _state.suspects[i].name; break; }
        }

        var ratingMap = { truth: 'S', normal: 'B', wrong: 'D' };
        var ratingColor = { truth: '#8ac926', normal: '#c9a96e', wrong: '#e94560' };

        var main = document.getElementById('game-main');
        main.innerHTML = '';

        var vDiv = document.createElement('div');
        vDiv.className = 'dt-verdict-screen dt-verdict-' + verdict;
        vDiv.innerHTML =
            '<div class="dt-verdict-rating" style="color:' + ratingColor[verdict] + '">' + ratingMap[verdict] + '</div>' +
            '<h1>' + verdictData.title + '</h1>' +
            '<p class="dt-verdict-accused">指认对象：<strong>' + accusedName + '</strong></p>' +
            '<div class="dt-verdict-text">' + verdictData.text.replace(/\n/g, '<br>') + '</div>' +
            '<div class="dt-verdict-stats">' +
                '<div class="vstat">行动力剩余 <strong>' + _ap + '/' + _state.maxAP + '</strong></div>' +
                '<div class="vstat">压力值 <strong>' + _pressure + '</strong></div>' +
                '<div class="vstat">线索数 <strong>' + _collectedClues.length + '</strong></div>' +
            '</div>' +
            '<div class="dt-verdict-actions">' +
                '<button class="btn btn-primary" onclick="DT_APP.restart()">🔍 再来一局</button>' +
                '<button class="btn btn-secondary" onclick="DT_APP.backToTitle()">📖 选择其他案件</button>' +
            '</div>';
        main.appendChild(vDiv);
    }

    // ─── 检查游戏结束 ───
    function _checkGameEnd() {
        if (_ap <= 0 && _gamePhase === 'playing') {
            setTimeout(function() {
                _showModal('⏰ 时间到', '天已破晓，必须立刻结案！请根据现有线索指认真凶。', [
                    { text: '结案指认', onClick: function() { showAccuse(); } }
                ]);
            }, 500);
        }
    }

    // ─── 重新开始 ───
    function restart() {
        _startCase(_state.template.id);
    }
    function backToTitle() {
        _selectedSkill = null;
        _showTitleScreen();
    }

    // ═══ 工具函数 ═══
    function _getSkillById(id) {
        for (var i = 0; i < DT_NPC_SKILLS.length; i++) {
            if (DT_NPC_SKILLS[i].id === id) return DT_NPC_SKILLS[i];
        }
        return null;
    }

    function _locationHasUndiscovered(locId) {
        var foundIds = {};
        for (var i = 0; i < _collectedClues.length; i++) foundIds[_collectedClues[i].id] = true;
        var allClues = _state.keyClues.concat(_state.noiseClues);
        for (var i = 0; i < allClues.length; i++) {
            if (allClues[i].locationId === locId && !foundIds[allClues[i].id]) return true;
        }
        return false;
    }

    function _addLog(text, cls) {
        _log.push({ text: text, cls: cls || 'info' });
    }

    function closePanel() {
        var el = document.getElementById('dt-overlay');
        if (el) el.remove();
    }

    // ─── 通用弹窗 ───
    function _showModal(title, content, buttons) {
        var overlay = document.createElement('div');
        overlay.className = 'dt-overlay dt-modal-overlay';
        overlay.id = 'dt-modal';

        var modal = document.createElement('div');
        modal.className = 'dt-modal';

        var html = '<h2>' + title + '</h2><div class="dt-modal-body">' + content + '</div><div class="dt-modal-actions">';
        for (var i = 0; i < buttons.length; i++) {
            html += '<button class="btn ' + (buttons[i].className || 'btn-secondary') + '" data-idx="' + i + '">' + buttons[i].text + '</button>';
        }
        html += '</div>';
        modal.innerHTML = html;
        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        var btnEls = modal.querySelectorAll('.dt-modal-actions .btn');
        for (var i = 0; i < btnEls.length; i++) {
            (function(idx) {
                btnEls[idx].onclick = function() {
                    if (buttons[idx].onClick) buttons[idx].onClick();
                    _closeModal();
                };
            })(i);
        }
    }

    function _closeModal() {
        var el = document.getElementById('dt-modal');
        if (el) el.remove();
    }

    // ═══ 公开API ═══
    return {
        init: init,
        enterInvestigation: enterInvestigation,
        doInvestigate: doInvestigate,
        doDialogue: doDialogue,
        useSkill: useSkill,
        showEvidence: showEvidence,
        showAccuse: showAccuse,
        doAccuse: doAccuse,
        closePanel: closePanel,
        restart: restart,
        backToTitle: backToTitle
    };

})();

// 页面加载完成后自动初始化
window.addEventListener('DOMContentLoaded', function() { DT_APP.init(); });
