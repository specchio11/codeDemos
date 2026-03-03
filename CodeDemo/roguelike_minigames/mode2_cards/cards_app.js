// ============================================================
// 模式二：舌战客栈 — 游戏主逻辑 (cards_app.js)
// ============================================================
(function () {
    'use strict';

    function $(sel, p) { return (p || document).querySelector(sel); }
    function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
    function pick(arr) { return arr[randInt(0, arr.length - 1)]; }
    function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = randInt(0, i); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
    function cloneObj(o) { return JSON.parse(JSON.stringify(o)); }

    var $app, $toast;

    var state = {
        hp: 60, hpMax: 60, shield: 0,
        ap: 3, apMax: 3,
        deck: [],        // card id strings (draw pile)
        discard: [],     // card id strings
        hand: [],        // card id strings
        exhaust: [],     // exhausted (removed) cards
        drawPerTurn: 5,
        nextDrawMod: 0,  // temp modifier
        powers: [],      // active power ids
        relics: [],
        currentNode: 0,
        phase: 'map',
        enemy: null,
        enemyShield: 0,
        enemyDebuffs: {},
        enemyPatternIdx: 0,
        enemyDiverted: false,
        firstDamageDealt: false,
        playedDefendThisTurn: false,
        turn: 0,
        logs: []
    };

    function init() {
        $app = $('#app');
        $toast = $('#toast');
        state.hp = 60; state.hpMax = 60; state.shield = 0;
        state.ap = 3; state.apMax = 3;
        state.deck = DB_CARDS.makeStarterDeck();
        state.discard = []; state.hand = []; state.exhaust = [];
        state.powers = []; state.relics = [];
        state.currentNode = 0; state.phase = 'map';
        state.drawPerTurn = 5; state.nextDrawMod = 0;
        state.logs = [];
        addLog('你推开客栈大门，准备迎接挑战……');
        render();
    }

    function addLog(text, cls) {
        state.logs.push({ text: text, cls: cls || '' });
        setTimeout(function () { var el = $('.log-list'); if (el) el.scrollTop = el.scrollHeight; }, 50);
    }
    function showToast(msg) {
        $toast.textContent = msg;
        $toast.classList.add('show');
        setTimeout(function () { $toast.classList.remove('show'); }, 1500);
    }

    function render() {
        if (state.phase === 'map') renderMap();
        else if (state.phase === 'battle') renderBattle();
        else if (state.phase === 'rest') renderRest();
        else if (state.phase === 'reward') renderReward();
        else if (state.phase === 'reward_relic') renderRelicReward();
        else if (state.phase === 'dead' || state.phase === 'victory') renderResult();
    }

    function routeHTML() {
        var h = '<div class="route-bar">';
        DB_CARDS.NODE_SEQUENCE.forEach(function (n, i) {
            var cls = i < state.currentNode ? 'done' : (i === state.currentNode ? 'current' : '');
            h += '<div class="route-node ' + cls + '"><span class="node-icon">' + n.icon + '</span>' + n.label + '</div>';
        });
        return h + '</div>';
    }
    function relicsHTML() {
        if (state.relics.length === 0) return '';
        var h = '<div class="relics-bar">';
        state.relics.forEach(function (rid) {
            var r = DB_CARDS.RELICS.find(function (x) { return x.id === rid; });
            if (r) h += '<span class="relic-icon" data-tip="' + r.name + ': ' + r.desc + '">' + r.icon + '</span>';
        });
        return h + '</div>';
    }
    function logPanelHTML() {
        var h = '<div class="game-right"><div class="log-header">📜 辩论记录</div><div class="log-list">';
        state.logs.forEach(function (l) { h += '<div class="log-entry ' + l.cls + '">' + l.text + '</div>'; });
        return h + '</div></div>';
    }
    function hasRelic(id) { return state.relics.indexOf(id) !== -1; }
    function hasPower(id) { return state.powers.indexOf(id) !== -1; }

    /* ========== MAP ========== */
    function renderMap() {
        var node = DB_CARDS.NODE_SEQUENCE[state.currentNode];
        var h = '<div class="game-shell">';
        h += '<div class="topbar"><span class="topbar-title">🃏 舌战客栈</span>';
        h += '<div class="topbar-stats"><span>❤️ ' + state.hp + '/' + state.hpMax + '</span><span>🛡️ ' + state.shield + '</span></div>';
        h += '<button class="topbar-btn back-btn" onclick="location.href=\'../index.html\'">返回</button></div>';
        h += routeHTML() + relicsHTML();
        h += '<div class="game-main"><div class="node-screen">';
        h += '<h2>' + node.icon + ' ' + node.label + '</h2>';
        h += '<p>前方等待着：' + node.label + '</p>';
        h += '<button class="topbar-btn" id="btn-enter">进入 ▶</button>';
        h += '</div>' + logPanelHTML() + '</div></div>';
        $app.innerHTML = h;
        $('#btn-enter').onclick = enterNode;
    }

    function enterNode() {
        var node = DB_CARDS.NODE_SEQUENCE[state.currentNode];
        if (node.type === 'BATTLE') startBattle('normal');
        else if (node.type === 'ELITE') startBattle('elite');
        else if (node.type === 'BOSS') startBattle('boss');
        else if (node.type === 'REST') { state.phase = 'rest'; render(); }
    }

    /* ========== BATTLE ========== */
    function startBattle(tier) {
        var tmpl;
        if (tier === 'normal') tmpl = pick(DB_CARDS.NORMAL_ENEMIES);
        else if (tier === 'elite') tmpl = pick(DB_CARDS.ELITE_ENEMIES);
        else tmpl = DB_CARDS.BOSS;
        state.enemy = cloneObj(tmpl);
        state.enemy.currentHp = state.enemy.hp;
        state.enemyShield = 0;
        state.enemyDebuffs = { vulnerable: 0 };
        state.enemyPatternIdx = 0;
        state.enemyDiverted = false;
        state.firstDamageDealt = false;
        state.turn = 0;
        state.phase = 'battle';
        // rebuild deck: current deck + discard + hand -> shuffle
        state.deck = state.deck.concat(state.discard).concat(state.hand);
        state.discard = []; state.hand = [];
        shuffle(state.deck);
        addLog('🗣️ 辩论开始！对手：' + state.enemy.name, 'highlight');
        startPlayerTurn();
    }

    function startPlayerTurn() {
        state.turn++;
        state.ap = state.apMax;
        // boss passive shield
        if (state.enemy.passiveShield && state.turn > 1) {
            state.enemyShield += state.enemy.passiveShield;
            addLog('⚖️ ' + state.enemy.name + ' 自动获得 ' + state.enemy.passiveShield + ' 护盾');
        }
        // clear shield unless power
        if (!hasPower('retainShield')) state.shield = 0;
        state.playedDefendThisTurn = false;
        // draw
        var drawCount = state.drawPerTurn + state.nextDrawMod;
        state.nextDrawMod = 0;
        // relic: mint
        if (hasRelic('mint') && state.turn === 1) drawCount += 2;
        // ap debuff from enemy
        // (handled in pattern)
        drawCards(drawCount);
        render();
    }

    function drawCards(n) {
        for (var i = 0; i < n; i++) {
            if (state.deck.length === 0) {
                if (state.discard.length === 0) break;
                state.deck = shuffle(state.discard.slice());
                state.discard = [];
                addLog('♻️ 洗牌！弃牌堆重新放入牌库');
            }
            state.hand.push(state.deck.pop());
        }
    }

    function playCard(handIdx) {
        var cardId = state.hand[handIdx];
        var cardDef = DB_CARDS.ALL_CARDS[cardId];
        if (!cardDef || cardDef.unplayable) { showToast('此牌无法打出！'); return; }
        if (cardDef.cost > state.ap) { showToast('AP不足！需要 ' + cardDef.cost); return; }
        state.ap -= cardDef.cost;
        state.hand.splice(handIdx, 1);
        if (cardDef.type === 'Defend') state.playedDefendThisTurn = true;
        var ctx = makeBattleCtx();
        cardDef.play(ctx);
        if (cardDef.exhaust) state.exhaust.push(cardId);
        else state.discard.push(cardId);
        if (state.enemy.currentHp <= 0) { enemyDied(); return; }
        if (state.hp <= 0) { playerDied(); return; }
        render();
    }

    function makeBattleCtx() {
        return {
            log: addLog,
            dealDamage: function (dmg) {
                // vulnerable
                if (state.enemyDebuffs.vulnerable > 0) {
                    dmg = Math.ceil(dmg * 1.5);
                    state.enemyDebuffs.vulnerable--;
                }
                // relic: gavel
                if (hasRelic('gavel') && !state.firstDamageDealt) {
                    state.firstDamageDealt = true;
                    dmg *= 2;
                    addLog('🔨 惊堂木！首次伤害翻倍！', 'good');
                }
                var actualDmg = dmg;
                if (state.enemyShield > 0) {
                    if (dmg <= state.enemyShield) { state.enemyShield -= dmg; actualDmg = 0; }
                    else { actualDmg = dmg - state.enemyShield; state.enemyShield = 0; }
                }
                state.enemy.currentHp -= actualDmg;
                // power: eloquent
                if (hasPower('eloquent')) {
                    state.enemy.currentHp -= 2;
                    addLog('🗣️ 口若悬河溅射 2 点穿甲伤害', 'good');
                }
            },
            addShield: function (v) { state.shield += v; },
            drawCards: function (n) { drawCards(n); },
            gainAP: function (v) { state.ap += v; },
            selfDamage: function (v) { state.hp -= v; addLog('💔 自损 ' + v + ' 耐心值', 'bad'); },
            applyEnemyDebuff: function (type, layers) { state.enemyDebuffs[type] = (state.enemyDebuffs[type] || 0) + layers; },
            divertEnemy: function () { state.enemyDiverted = true; },
            addPower: function (id) { if (state.powers.indexOf(id) === -1) state.powers.push(id); },
            get nextDrawMod() { return state.nextDrawMod; },
            set nextDrawMod(v) { state.nextDrawMod = v; }
        };
    }

    function endPlayerTurn() {
        // curse: stutter penalty
        state.hand.forEach(function (cid) {
            var cd = DB_CARDS.ALL_CARDS[cid];
            if (cd && cd.endTurnPenalty) {
                state.hp -= cd.endTurnPenalty;
                addLog('🤐 语塞！扣除 ' + cd.endTurnPenalty + ' 耐心值', 'bad');
            }
        });
        if (state.hp <= 0) { playerDied(); return; }
        // relic: thick_skin
        if (hasRelic('thick_skin') && !state.playedDefendThisTurn) {
            state.shield += 3;
            addLog('😤 厚脸皮！获得 3 护盾', 'good');
        }
        // discard hand
        state.discard = state.discard.concat(state.hand);
        state.hand = [];
        // enemy turn
        enemyTurn();
    }

    function enemyTurn() {
        var e = state.enemy;
        var move = e.pattern[state.enemyPatternIdx % e.pattern.length];
        state.enemyPatternIdx++;
        addLog('👹 ' + e.name + '：' + move.desc, 'bad');

        if (state.enemyDiverted && (move.type === 'attack' || move.type === 'attack_strip' || move.type === 'attack_curse')) {
            addLog('🔄 话题被转移！对手本回合不造成伤害');
            state.enemyDiverted = false;
            // still do non-damage effects
            if (move.type === 'attack_curse') {
                state.discard.push(move.curseId);
                addLog('📢 对手塞入了一张 ' + DB_CARDS.ALL_CARDS[move.curseId].name, 'bad');
            }
        } else {
            state.enemyDiverted = false;
            switch (move.type) {
                case 'attack':
                    applyDmgToPlayer(move.value);
                    break;
                case 'attack_strip':
                    state.shield = 0;
                    addLog('🛡️ 护盾被清零！', 'bad');
                    applyDmgToPlayer(move.value);
                    break;
                case 'attack_curse':
                    applyDmgToPlayer(move.value);
                    state.discard.push(move.curseId);
                    addLog('📢 对手塞入了一张 ' + DB_CARDS.ALL_CARDS[move.curseId].name, 'bad');
                    break;
                case 'shield':
                    state.enemyShield += move.value;
                    addLog('敌人获得 ' + move.value + ' 护盾');
                    break;
                case 'add_curse':
                    state.discard.push(move.curseId);
                    addLog('📢 对手塞入了一张 ' + DB_CARDS.ALL_CARDS[move.curseId].name, 'bad');
                    break;
                case 'debuff_ap':
                    state.apMax = Math.max(1, state.apMax - move.value);
                    addLog('💀 下回合 AP 上限 -' + move.value, 'bad');
                    break;
            }
        }
        if (state.hp <= 0) { playerDied(); return; }
        // restore AP max if debuffed (one-turn debuff)
        state.apMax = 3;
        startPlayerTurn();
    }

    function applyDmgToPlayer(dmg) {
        if (state.shield > 0) {
            if (dmg <= state.shield) { state.shield -= dmg; addLog('🛡️ 护盾吸收 ' + dmg); return; }
            else { dmg -= state.shield; addLog('🛡️ 护盾吸收 ' + state.shield + '，穿透 ' + dmg); state.shield = 0; }
        }
        state.hp -= dmg;
        addLog('❤️ 受到 ' + dmg + ' 伤害 (HP: ' + Math.max(0, state.hp) + '/' + state.hpMax + ')', 'bad');
    }

    function enemyDied() {
        state.enemy.currentHp = 0;
        var node = DB_CARDS.NODE_SEQUENCE[state.currentNode];
        addLog('🎉 击败了 ' + state.enemy.name + '！', 'good');
        if (node.type === 'BOSS') { state.phase = 'victory'; render(); return; }
        if (node.type === 'ELITE') { state.phase = 'reward_relic'; render(); return; }
        state.phase = 'reward'; render();
    }
    function playerDied() {
        state.hp = 0; state.phase = 'dead';
        addLog('💀 耐心归零……你被赶出了客栈', 'bad');
        render();
    }

    /* ---- RENDER BATTLE ---- */
    function renderBattle() {
        var e = state.enemy;
        var nextMove = e.pattern[state.enemyPatternIdx % e.pattern.length];
        var h = '<div class="game-shell">';
        h += '<div class="topbar"><span class="topbar-title">🃏 舌战客栈 — 回合 ' + state.turn + '</span>';
        h += '<div class="topbar-stats"><span>❤️ ' + state.hp + '/' + state.hpMax + '</span><span>🛡️ ' + state.shield + '</span></div>';
        h += '<button class="topbar-btn back-btn" onclick="location.href=\'../index.html\'">逃跑</button></div>';
        h += routeHTML() + relicsHTML();
        h += '<div class="game-main"><div class="battle-field">';
        // enemy
        h += '<div class="opponent-area">';
        if (e.portrait) h += '<img class="portrait-img" src="' + e.portrait + '" alt="">';
        else h += '<div class="portrait-emoji">' + e.emoji + '</div>';
        h += '<div class="info"><div class="name-row"><span class="cname">' + e.name + '</span>';
        h += '<span class="intent">下一手：' + nextMove.desc + '</span></div>';
        h += '<div class="bar-wrap"><span>HP</span><div class="bar-outer"><div class="bar-inner enemy-hp" style="width:' + Math.max(0, e.currentHp / e.hp * 100) + '%"></div>';
        h += '<span class="bar-label">' + Math.max(0, e.currentHp) + '/' + e.hp + '</span></div></div>';
        if (state.enemyShield > 0) h += '<div style="color:#58a6ff;font-size:.9rem">🛡️ ' + state.enemyShield + '</div>';
        h += '<div class="buffs">';
        if (state.enemyDebuffs.vulnerable > 0) h += '<span class="buff-tag debuff">💥 破防 ' + state.enemyDebuffs.vulnerable + '</span>';
        h += '</div></div></div>';
        // player powers
        if (state.powers.length > 0) {
            h += '<div class="powers-display">';
            state.powers.forEach(function (p) {
                var label = p === 'retainShield' ? '🧘 沉着应对' : '🗣️ 口若悬河';
                h += '<span class="power-tag">' + label + '</span>';
            });
            h += '</div>';
        }
        h += '</div>' + logPanelHTML() + '</div>';

        // status bar
        h += '<div class="status-bar"><div class="ap-display">';
        for (var i = 0; i < state.apMax; i++) {
            h += '<div class="ap-pip ' + (i < state.ap ? 'filled' : 'empty') + '">' + (i < state.ap ? '◆' : '◇') + '</div>';
        }
        h += '</div><div class="deck-info"><span>📚 牌库: ' + state.deck.length + '</span><span>♻️ 弃牌: ' + state.discard.length + '</span>';
        h += '<span>🚫 消耗: ' + state.exhaust.length + '</span></div></div>';

        // hand
        h += '<div class="hand-area"><h4>手牌（点击打出）</h4><div class="hand-row">';
        state.hand.forEach(function (cid, idx) {
            var cd = DB_CARDS.ALL_CARDS[cid];
            var costCls = cd.type === 'Attack' ? 'attack' : (cd.type === 'Defend' ? '' : (cd.type === 'Power' ? 'power' : (cd.type === 'Curse' ? 'curse' : 'skill')));
            var unplayable = cd.unplayable || cd.cost > state.ap;
            h += '<div class="card' + (unplayable ? ' unplayable' : '') + '" data-idx="' + idx + '">';
            h += '<div class="card-top"><span class="card-icon">' + cd.icon + '</span>';
            h += '<span class="card-cost ' + costCls + '">' + (cd.cost >= 0 ? cd.cost : '✕') + '</span></div>';
            h += '<div class="card-name">' + cd.name + '</div>';
            h += '<div class="card-type">' + cd.type + '</div>';
            h += '<div class="card-desc">' + cd.desc + '</div></div>';
        });
        h += '</div></div>';

        // action
        h += '<div class="action-row"><button class="topbar-btn" id="btn-end-turn">结束回合 ▶</button></div>';
        h += '</div>';
        $app.innerHTML = h;

        // bind
        $app.querySelectorAll('.card:not(.unplayable)').forEach(function (el) {
            el.onclick = function () { playCard(parseInt(el.dataset.idx)); };
        });
        $('#btn-end-turn').onclick = endPlayerTurn;
    }

    /* ========== REST ========== */
    function renderRest() {
        var healAmt = Math.floor(state.hpMax * 0.3);
        var h = '<div class="game-shell">';
        h += '<div class="topbar"><span class="topbar-title">🃏 舌战客栈</span>';
        h += '<div class="topbar-stats"><span>❤️ ' + state.hp + '/' + state.hpMax + '</span></div></div>';
        h += routeHTML() + relicsHTML();
        h += '<div class="game-main"><div class="node-screen">';
        h += '<h2>🍵 客栈喝茶</h2>';
        h += '<p>你在客栈角落坐下，点了壶好茶，静思片刻。</p>';
        h += '<div class="modal-choices">';
        h += '<button class="modal-choice-btn" id="btn-heal">☕ 品茶歇息（恢复 ' + healAmt + ' 耐心值）</button>';
        h += '<button class="modal-choice-btn" id="btn-purge">🗑️ 精简话术（删除牌库中 1 张牌）</button>';
        h += '</div></div>' + logPanelHTML() + '</div></div>';
        $app.innerHTML = h;
        $('#btn-heal').onclick = function () {
            state.hp = Math.min(state.hp + healAmt, state.hpMax);
            addLog('☕ 喝茶恢复了 ' + healAmt + ' 耐心值', 'good');
            advanceNode();
        };
        $('#btn-purge').onclick = function () { showPurgeDialog(); };
    }

    function showPurgeDialog() {
        var allCards = state.deck.concat(state.discard);
        var uniqueIds = [];
        allCards.forEach(function (c) { if (uniqueIds.indexOf(c) === -1) uniqueIds.push(c); });
        var h = '<div class="modal-overlay" id="purge-modal"><div class="modal-box">';
        h += '<h3>选择要永久删除的卡牌</h3>';
        h += '<div class="modal-choices">';
        uniqueIds.forEach(function (cid) {
            var cd = DB_CARDS.ALL_CARDS[cid];
            h += '<button class="modal-choice-btn" data-cid="' + cid + '">' + cd.icon + ' ' + cd.name + ' — ' + cd.desc + '</button>';
        });
        h += '<button class="modal-choice-btn" id="btn-cancel-purge">取消</button>';
        h += '</div></div></div>';
        $app.insertAdjacentHTML('beforeend', h);
        document.querySelectorAll('#purge-modal [data-cid]').forEach(function (b) {
            b.onclick = function () {
                var cid = b.dataset.cid;
                // remove one from deck or discard
                var idx = state.deck.indexOf(cid);
                if (idx !== -1) state.deck.splice(idx, 1);
                else { idx = state.discard.indexOf(cid); if (idx !== -1) state.discard.splice(idx, 1); }
                addLog('🗑️ 删除了 ' + DB_CARDS.ALL_CARDS[cid].name, 'highlight');
                var m = $('#purge-modal'); if (m) m.remove();
                advanceNode();
            };
        });
        var cancelBtn = document.querySelector('#btn-cancel-purge');
        if (cancelBtn) cancelBtn.onclick = function () { var m = $('#purge-modal'); if (m) m.remove(); };
    }

    /* ========== REWARD ========== */
    function renderReward() {
        var pool = shuffle(DB_CARDS.REWARD_POOL.slice());
        var offers = pool.slice(0, 3);
        var h = '<div class="game-shell">';
        h += '<div class="topbar"><span class="topbar-title">🃏 战斗奖励</span>';
        h += '<div class="topbar-stats"><span>❤️ ' + state.hp + '/' + state.hpMax + '</span></div></div>';
        h += routeHTML();
        h += '<div class="game-main"><div class="node-screen">';
        h += '<h2>🎁 选择一张新卡牌加入牌库</h2>';
        h += '<div class="hand-row" style="justify-content:center">';
        offers.forEach(function (cid) {
            var cd = DB_CARDS.ALL_CARDS[cid];
            var costCls = cd.type === 'Attack' ? 'attack' : (cd.type === 'Power' ? 'power' : 'skill');
            h += '<div class="card" data-cid="' + cid + '" style="cursor:pointer">';
            h += '<div class="card-top"><span class="card-icon">' + cd.icon + '</span>';
            h += '<span class="card-cost ' + costCls + '">' + cd.cost + '</span></div>';
            h += '<div class="card-name">' + cd.name + '</div>';
            h += '<div class="card-type">' + cd.type + '</div>';
            h += '<div class="card-desc">' + cd.desc + '</div></div>';
        });
        h += '</div>';
        h += '<button class="topbar-btn" id="btn-skip" style="margin-top:16px">跳过 ▶</button>';
        h += '</div>' + logPanelHTML() + '</div></div>';
        $app.innerHTML = h;
        $app.querySelectorAll('[data-cid]').forEach(function (el) {
            el.onclick = function () {
                var cid = el.dataset.cid;
                state.discard.push(cid);
                addLog('🎴 获得新卡：' + DB_CARDS.ALL_CARDS[cid].name, 'good');
                advanceNode();
            };
        });
        $('#btn-skip').onclick = function () { advanceNode(); };
    }

    /* ========== RELIC REWARD ========== */
    function renderRelicReward() {
        var available = DB_CARDS.RELICS.filter(function (r) { return state.relics.indexOf(r.id) === -1; });
        shuffle(available);
        var offers = available.slice(0, 2);
        var h = '<div class="game-shell">';
        h += '<div class="topbar"><span class="topbar-title">🃏 精英奖励</span>';
        h += '<div class="topbar-stats"><span>❤️ ' + state.hp + '/' + state.hpMax + '</span></div></div>';
        h += routeHTML();
        h += '<div class="game-main"><div class="node-screen">';
        h += '<h2>🏆 精英战利品</h2>';
        h += '<div class="modal-choices">';
        offers.forEach(function (r) {
            h += '<button class="modal-choice-btn" data-rid="' + r.id + '">' + r.icon + ' ' + r.name + ' — ' + r.desc + '</button>';
        });
        h += '<button class="modal-choice-btn" id="btn-skip-relic">跳过 ▶</button>';
        h += '</div>';
        h += '</div>' + logPanelHTML() + '</div></div>';
        $app.innerHTML = h;
        $app.querySelectorAll('[data-rid]').forEach(function (b) {
            b.onclick = function () {
                state.relics.push(b.dataset.rid);
                var r = DB_CARDS.RELICS.find(function (x) { return x.id === b.dataset.rid; });
                addLog('🎁 获得遗物: ' + r.icon + ' ' + r.name, 'good');
                // also offer card reward
                state.phase = 'reward';
                render();
            };
        });
        var skipBtn = $('#btn-skip-relic');
        if (skipBtn) skipBtn.onclick = function () { state.phase = 'reward'; render(); };
    }

    /* ========== RESULT ========== */
    function renderResult() {
        var won = state.phase === 'victory';
        var h = '<div class="result-overlay"><div class="result-box">';
        if (won) {
            h += '<h2>🎊 通关！名震京城！</h2>';
            h += '<p>你击败了京城第一讼棍，名声大噪。</p>';
            h += '<div class="stars">⭐⭐⭐</div>';
        } else {
            h += '<h2>💀 破防了……</h2>';
            h += '<p>你在第 ' + (state.currentNode + 1) + ' 关败下阵来。</p>';
            var stars = state.currentNode >= 5 ? '⭐⭐' : (state.currentNode >= 3 ? '⭐' : '');
            h += '<div class="stars">' + (stars || '无星') + '</div>';
        }
        h += '<button class="topbar-btn" onclick="location.reload()">再来一局</button>';
        h += '<button class="topbar-btn back-btn" style="margin-left:10px" onclick="location.href=\'../index.html\'">返回</button>';
        h += '</div></div>';
        $app.innerHTML = h;
    }

    function advanceNode() {
        state.currentNode++;
        state.shield = 0;
        state.powers = [];
        if (state.currentNode >= DB_CARDS.NODE_SEQUENCE.length) { state.phase = 'victory'; }
        else { state.phase = 'map'; }
        render();
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
