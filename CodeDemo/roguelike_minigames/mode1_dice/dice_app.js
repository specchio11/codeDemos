// ============================================================
// 模式一：灵界幻阵 — 游戏主逻辑 (dice_app.js)
// ============================================================
(function () {
    'use strict';

    /* ---- 工具 ---- */
    function $(sel, p) { return (p || document).querySelector(sel); }
    function delay(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
    function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
    function pick(arr) { return arr[randInt(0, arr.length - 1)]; }
    function cloneObj(o) { return JSON.parse(JSON.stringify(o)); }
    function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = randInt(0, i); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }

    /* ---- 状态 ---- */
    var state = {
        hp: 50, hpMax: 50, shield: 0,
        gold: 0,
        character: null,  // selected character
        passive: null,    // passive bonus id
        skills: [],       // 3 skill objects
        relics: [],       // relic id list
        currentNode: 0,   // 0-6
        phase: 'map',     // map | battle | event | rest | shop | boss_dead | dead
        // battle state
        enemy: null,
        enemyShield: 0,
        enemyBuffs: {},   // poison, armor_break, weak
        enemyBonusDmg: 0, // permanent +dmg from buff_attack
        enemyPatternIdx: 0,
        dice: [],         // {value, used}
        diceCount: 3,
        selectedDice: -1,
        turn: 0,
        rerollUsed: false,
        // boss phase 2 tracker
        bossPhase2Fired: false,
        bossNextDiceLoss: false,
        // player buffs
        playerBuffs: {},
        // log
        logs: []
    };

    var $app, $toast;

    /* ---- 初始化 ---- */
    function init() {
        $app = $('#app');
        $toast = $('#toast');
        state.phase = 'select';
        state.logs = [];
        render();
    }

    function startGame(character) {
        state.character = character;
        state.passive = character.id === 'player' ? 'player' : character.skillPrefix;
        state.hp = 50; state.hpMax = 50; state.shield = 0; state.gold = 0;
        if (character.id === 'player') {
            var pool = DB_DICE.SKILLS.filter(function (s) { return s.id >= 3; });
            state.skills = [DB_DICE.SKILLS[0], DB_DICE.SKILLS[1], pick(pool)];
        } else {
            state.skills = [DB_DICE.SKILLS[0], DB_DICE.SKILLS[1], DB_DICE.RACE_SKILLS[character.race]];
        }
        state.relics = [];
        state.currentNode = 0;
        state.phase = 'map';
        state.logs = [];
        state.enemyBonusDmg = 0;
        state.bossPhase2Fired = false;
        state.bossNextDiceLoss = false;
        state.playerPoison = 0;
        state.playerArmorBreak = 0;
        state.diceCount = 3;
        var pInfo = DB_DICE.PASSIVES[state.passive];
        addLog('你踏入了灵界幻阵……');
        if (character.id !== 'player') {
            addLog('🤝 同行伙伴: ' + character.name, 'highlight');
        }
        addLog(pInfo.icon + ' 加成: ' + pInfo.name + ' — ' + pInfo.desc, 'good');
        render();
    }

    /* ---- Log ---- */
    function addLog(text, cls) {
        state.logs.push({ text: text, cls: cls || '' });
        setTimeout(scrollLog, 50);
    }
    function scrollLog() {
        var el = $('.log-list');
        if (el) el.scrollTop = el.scrollHeight;
    }

    /* ---- Toast ---- */
    function showToast(msg) {
        $toast.textContent = msg;
        $toast.classList.add('show');
        setTimeout(function () { $toast.classList.remove('show'); }, 1500);
    }

    /* ---- 渲染总调度 ---- */
    function render() {
        if (state.phase === 'select') renderCharSelect();
        else if (state.phase === 'map') renderMap();
        else if (state.phase === 'battle') renderBattle();
        else if (state.phase === 'event') renderEvent();
        else if (state.phase === 'rest') renderRest();
        else if (state.phase === 'shop') renderShop();
        else if (state.phase === 'reward_skill') renderSkillReward();
        else if (state.phase === 'reward_relic') renderRelicReward();
        else if (state.phase === 'dead' || state.phase === 'boss_dead') renderResult();
    }

    /* ---- 角色选择 ---- */
    function renderCharSelect() {
        var RN = { xian: '仙族', ren: '人族', yao: '妖族', mo: '魔族' };
        var h = '<div class="game-shell">';
        h += '<div class="topbar"><span class="topbar-title">🎲 灵界幻阵 — 出征准备</span>';
        h += '<button class="topbar-btn back-btn" onclick="location.href=\'../index.html\'">返回</button></div>';
        h += '<div class="game-main"><div class="char-select-screen">';
        h += '<h2>选择出战角色</h2>';
        // 主角
        var pp = DB_DICE.PASSIVES.player;
        h += '<div class="char-card" data-cid="player">';
        h += '<div class="char-portrait">🧑</div><div class="char-info">';
        h += '<div class="char-name">主角</div>';
        h += '<div class="char-race">自由之身</div>';
        h += '<div class="char-skills">⚔️ 普通攻击 / 🛡️ 灵力护盾 / 🎲 随机技能</div>';
        h += '<div class="char-passive">' + pp.icon + ' ' + pp.name + ' — ' + pp.desc + '</div>';
        h += '</div></div>';
        // NPC
        DB_DICE.NPCS.forEach(function (npc) {
            var rs = DB_DICE.RACE_SKILLS[npc.race];
            var pv = DB_DICE.PASSIVES[npc.skillPrefix];
            h += '<div class="char-card" data-cid="' + npc.id + '">';
            h += '<div class="char-portrait">' + npc.emoji + '</div><div class="char-info">';
            h += '<div class="char-name">' + npc.name + '</div>';
            h += '<div class="char-race">' + RN[npc.race] + '</div>';
            h += '<div class="char-skills">⚔️ 普通攻击 / 🛡️ 灵力护盾 / ' + rs.icon + ' ' + rs.name + ' [' + rs.reqDesc + ']</div>';
            h += '<div class="char-passive">' + pv.icon + ' ' + pv.name + ' — ' + pv.desc + '</div>';
            h += '</div></div>';
        });
        h += '</div></div></div>';
        $app.innerHTML = h;
        $app.querySelectorAll('.char-card').forEach(function (card) {
            card.onclick = function () {
                var cid = card.dataset.cid;
                if (cid === 'player') {
                    startGame({ id: 'player', name: '主角', emoji: '🧑', race: 'player', skillPrefix: 'player' });
                } else {
                    startGame(DB_DICE.NPCS.find(function (n) { return n.id === cid; }));
                }
            };
        });
    }

    /* ---- 路线条 HTML ---- */
    function routeHTML() {
        var h = '<div class="route-bar">';
        DB_DICE.NODE_SEQUENCE.forEach(function (n, i) {
            var cls = i < state.currentNode ? 'done' : (i === state.currentNode ? 'current' : '');
            h += '<div class="route-node ' + cls + '"><span class="node-icon">' + n.icon + '</span>' + n.label + '</div>';
        });
        h += '</div>';
        return h;
    }

    /* ---- 遗物条 HTML ---- */
    function relicsHTML() {
        if (state.relics.length === 0) return '';
        var h = '<div class="relics-bar">';
        state.relics.forEach(function (rid) {
            var r = DB_DICE.RELICS.find(function (x) { return x.id === rid; });
            if (r) h += '<span class="relic-icon" data-tip="' + r.name + ': ' + r.desc + '">' + r.icon + '</span>';
        });
        h += '</div>';
        return h;
    }

    /* ---- 日志面板 HTML ---- */
    function logPanelHTML() {
        var h = '<div class="game-right"><div class="log-header">📜 行动日志</div><div class="log-list">';
        state.logs.forEach(function (l) {
            h += '<div class="log-entry ' + l.cls + '">' + l.text + '</div>';
        });
        h += '</div></div>';
        return h;
    }

    /* ========== MAP VIEW ========== */
    function renderMap() {
        var node = DB_DICE.NODE_SEQUENCE[state.currentNode];
        var h = '<div class="game-shell">';
        h += '<div class="topbar"><span class="topbar-title">🎲 灵界幻阵</span>';
        h += '<div class="topbar-stats"><span>❤️ ' + state.hp + '/' + state.hpMax + '</span>';
        h += '<span>🛡️ ' + state.shield + '</span><span>💰 ' + state.gold + '</span></div>';
        h += '<button class="topbar-btn back-btn" onclick="location.href=\'../index.html\'">返回</button></div>';
        h += routeHTML();
        h += relicsHTML();
        h += '<div class="game-main"><div class="node-screen">';
        h += '<h2>' + node.icon + ' ' + node.label + '</h2>';
        h += '<p>前方是：' + node.label + '</p>';
        h += '<button class="topbar-btn" id="btn-enter">进入节点</button>';
        h += '</div>' + logPanelHTML() + '</div></div>';
        $app.innerHTML = h;
        $('#btn-enter').onclick = enterNode;
    }

    function enterNode() {
        var node = DB_DICE.NODE_SEQUENCE[state.currentNode];
        if (node.type === 'BATTLE') startBattle('normal');
        else if (node.type === 'ELITE') startBattle('elite');
        else if (node.type === 'BOSS') startBattle('boss');
        else if (node.type === 'EVENT') startEvent();
        else if (node.type === 'REST') { state.phase = 'rest'; render(); }
        else if (node.type === 'SHOP') { state.phase = 'shop'; render(); }
    }

    /* ========== BATTLE ========== */
    function startBattle(tier) {
        var enemyTemplate;
        if (tier === 'normal') enemyTemplate = pick(DB_DICE.NORMAL_ENEMIES);
        else if (tier === 'elite') enemyTemplate = pick(DB_DICE.ELITE_ENEMIES);
        else enemyTemplate = DB_DICE.BOSS;
        state.enemy = cloneObj(enemyTemplate);
        state.enemy.currentHp = state.enemy.hp;
        state.enemyShield = 0;
        state.enemyBuffs = { poison: 0, armor_break: 0, weak: 0 };
        state.enemyBonusDmg = 0;
        state.enemyPatternIdx = 0;
        state.turn = 0;
        state.rerollsLeft = 0;
        if (hasRelic('lucky')) state.rerollsLeft++;
        if (state.passive === 'dingfen') state.rerollsLeft++;
        state.isFirstTurnOfBattle = true;
        state.bossPhase2Fired = false;
        state.bossNextDiceLoss = false;
        state.selectedDice = -1;
        state.playerArmorBreak = 0;
        state.phase = 'battle';
        // relic: amulet
        if (hasRelic('amulet')) { state.hp = Math.min(state.hp + 5, state.hpMax); addLog('💚 生机护身符恢复了 5 HP', 'good'); }
        addLog('⚔️ 战斗开始！遭遇 ' + state.enemy.name, 'highlight');
        rollDice();
        render();
    }

    function rollDice() {
        state.dice = [];
        var count = state.diceCount;
        if (state.isFirstTurnOfBattle && state.passive === 'chuanfei') {
            count = 4;
            addLog('💨 灵息加速！首回合获得 4 枚骰子', 'good');
        }
        state.isFirstTurnOfBattle = false;
        if (state.bossNextDiceLoss) count = Math.max(count - 1, 1);
        state.bossNextDiceLoss = false;
        for (var i = 0; i < count; i++) {
            state.dice.push({ value: randInt(1, 6), used: false });
        }
        state.selectedDice = -1;
        state.turn++;
        // player poison tick (at start of player turn)
        if (state.playerPoison && state.playerPoison > 0) {
            var pp = state.playerPoison;
            state.hp -= pp;
            state.playerPoison--;
            addLog('🧪 毒发！你受到 ' + pp + ' 点毒伤（剩余 ' + state.playerPoison + ' 层）', 'bad');
            if (state.hp <= 0) { playerDied(); return; }
        }
        // enemy poison tick
        if (state.enemyBuffs.poison > 0) {
            var pd = state.enemyBuffs.poison;
            state.enemy.currentHp -= pd;
            state.enemyBuffs.poison--;
            addLog('🧪 中毒生效！敌人受到 ' + pd + ' 点毒伤（剩余 ' + state.enemyBuffs.poison + ' 层）', 'good');
            if (state.enemy.currentHp <= 0) { enemyDied(); return; }
        }
    }

    function hasRelic(id) { return state.relics.indexOf(id) !== -1; }

    function addBonusDice(val) { state.dice.push({ value: val, used: false }); }

    /* 战斗UI context */
    function makeBattleCtx() {
        return {
            log: addLog,
            dealDamage: function (dmg, piercing) {
                // apply armor_break (enemy debuff: +2 damage per layer, consume 1 layer)
                if (state.enemyBuffs.armor_break > 0) {
                    dmg += state.enemyBuffs.armor_break * 2;
                    state.enemyBuffs.armor_break--;
                    addLog('💥 破甲生效！伤害提升，剩余破甲 ' + state.enemyBuffs.armor_break + ' 层', 'good');
                }
                if (piercing) {
                    state.enemy.currentHp -= dmg;
                } else {
                    if (state.enemyShield > 0) {
                        if (dmg <= state.enemyShield) { state.enemyShield -= dmg; dmg = 0; }
                        else { dmg -= state.enemyShield; state.enemyShield = 0; state.enemy.currentHp -= dmg; }
                    } else {
                        state.enemy.currentHp -= dmg;
                    }
                }
            },
            addShield: function (v) { state.shield += v; },
            addBonusDice: function (v) { addBonusDice(v); },
            applyEnemyDebuff: function (type, layers) {
                if (state.passive === 'guidao') { layers += 1; addLog('☠️ 阴毒入骨！额外 +1 层', 'good'); }
                state.enemyBuffs[type] = (state.enemyBuffs[type] || 0) + layers;
            }
        };
    }

    function selectDice(idx) {
        if (state.dice[idx].used) return;
        state.selectedDice = idx;
        render();
    }

    function useSkill(skillIdx) {
        if (state.selectedDice < 0) { showToast('请先选一枚骰子'); return; }
        var dice = state.dice[state.selectedDice];
        var skill = state.skills[skillIdx];
        if (!skill.check(dice)) { showToast('点数不符！需要: ' + skill.reqDesc); return; }
        // relic: thunder
        if (hasRelic('thunder') && dice.value === 6) {
            state.enemy.currentHp -= 4;
            addLog('⚡ 雷火珠！额外造成 4 点雷伤', 'good');
        }
        dice.used = true;
        var ctx = makeBattleCtx();
        skill.effect(dice, ctx);
        state.selectedDice = -1;
        if (state.enemy.currentHp <= 0) { enemyDied(); return; }
        render();
    }

    function doReroll() {
        if (state.rerollsLeft <= 0) return;
        state.rerollsLeft--;
        state.dice.forEach(function (d) { if (!d.used) d.value = randInt(1, 6); });
        addLog('🔄 重掷所有未使用骰子！', 'highlight');
        render();
    }

    function endPlayerTurn() {
        // relic: turtle — unused dice give shield
        if (hasRelic('turtle')) {
            var unused = state.dice.filter(function (d) { return !d.used; }).length;
            if (unused > 0) { state.shield += unused * 3; addLog('🐢 铁王八：未使用骰 x' + unused + '，获得 ' + (unused * 3) + ' 护盾', 'good'); }
        }
        // enemy turn
        enemyTurn();
    }

    function enemyTurn() {
        var e = state.enemy;
        // Boss phase2 check
        if (e.id === 'ink_lord' && e.currentHp <= (e.phase2Threshold || 60) && !state.bossPhase2Fired) {
            state.bossPhase2Fired = true;
            var m = e.phase2Move;
            addLog('💀 ' + e.name + ' 进入狂暴！' + m.desc, 'bad');
            state.bossNextDiceLoss = true;
            applyEnemyAction(m);
            if (state.hp <= 0) { playerDied(); return; }
            // phase2 special replaces this turn's normal attack
            state.shield = 0;
            rollDice();
            if (state.phase !== 'battle') return;
            render();
            return;
        }

        var move = e.pattern[state.enemyPatternIdx % e.pattern.length];
        state.enemyPatternIdx++;
        addLog('👹 ' + e.name + '：' + move.desc, 'bad');
        applyEnemyAction(move);
        if (state.hp <= 0) { playerDied(); return; }

        // clear shield at round end, roll new dice
        state.shield = 0;
        rollDice();
        if (state.phase !== 'battle') return; // enemy might have died from poison
        render();
    }

    function applyEnemyAction(move) {
        var dmg;
        switch (move.type) {
            case 'attack':
                dmg = move.value + state.enemyBonusDmg;
                applyDamageToPlayer(dmg);
                break;
            case 'attack_poison':
                dmg = move.value + state.enemyBonusDmg;
                applyDamageToPlayer(dmg);
                state.playerBuffs = state.playerBuffs || {};
                // poison doesn't apply to player in this simple model; we just do immediate extra dmg next turns
                // Actually let's skip player poison for simplicity — just do extra dmg
                addLog('🧪 你中了 ' + move.poison + ' 层毒！', 'bad');
                // Player poison: deal at start of next player turn - store it
                state.playerPoison = (state.playerPoison || 0) + move.poison;
                break;
            case 'shield':
                state.enemyShield += move.value;
                addLog('敌人获得 ' + move.value + ' 点护盾', '');
                break;
            case 'buff_attack':
                state.enemyBonusDmg += move.buffAmount;
                dmg = move.value + state.enemyBonusDmg;
                applyDamageToPlayer(dmg);
                addLog('敌人永久攻击 +' + move.buffAmount, 'bad');
                break;
            case 'armor_break_attack':
                dmg = move.value + state.enemyBonusDmg;
                applyDamageToPlayer(dmg);
                // give player a vulnerability debuff: next N hits take +3 extra dmg
                state.playerArmorBreak = (state.playerArmorBreak || 0) + move.layers;
                addLog('💥 你被破甲 ' + move.layers + ' 层！后续受到攻击伤害 +3/层', 'bad');
                break;
            case 'special_drain':
                applyDamageToPlayer(move.value);
                break;
        }
    }

    function applyDamageToPlayer(dmg) {
        // apply weak: enemy deals less damage when weakened
        if (state.enemyBuffs.weak > 0) {
            dmg = Math.ceil(dmg / 2);
            state.enemyBuffs.weak--;
            addLog('😵 敌人虚弱！伤害减半为 ' + dmg, 'good');
        }
        // player armor break: take extra damage
        if (state.playerArmorBreak && state.playerArmorBreak > 0) {
            var extra = state.playerArmorBreak * 3;
            dmg += extra;
            state.playerArmorBreak--;
            addLog('💥 破甲效果！额外 +' + extra + ' 伤害（剩余 ' + state.playerArmorBreak + ' 层）', 'bad');
        }
        if (state.shield > 0) {
            if (dmg <= state.shield) { state.shield -= dmg; addLog('🛡️ 护盾吸收了 ' + dmg + ' 点伤害'); return; }
            else { dmg -= state.shield; addLog('🛡️ 护盾吸收了 ' + state.shield + ' 点，穿透 ' + dmg); state.shield = 0; }
        }
        state.hp -= dmg;
        addLog('❤️ 你受到 ' + dmg + ' 点伤害 (HP: ' + Math.max(state.hp, 0) + '/' + state.hpMax + ')', 'bad');
    }

    function enemyDied() {
        state.enemy.currentHp = 0;
        var node = DB_DICE.NODE_SEQUENCE[state.currentNode];
        var goldReward = node.type === 'BOSS' ? 30 : (node.type === 'ELITE' ? 20 : 10);
        if (hasRelic('abacus')) goldReward += 5;
        if (state.passive === 'fengshan') { goldReward += 3; addLog('💰 聚宝生辉！额外 +3 金币', 'good'); }
        state.gold += goldReward;
        addLog('🎉 击败了 ' + state.enemy.name + '！获得 ' + goldReward + ' 金币', 'good');

        if (node.type === 'BOSS') {
            state.phase = 'boss_dead';
            render();
            return;
        }
        // reward
        if (node.type === 'ELITE') {
            state.phase = 'reward_relic';
        } else {
            state.phase = 'reward_skill';
        }
        render();
    }

    function playerDied() {
        state.hp = 0;
        state.phase = 'dead';
        addLog('💀 你倒下了……', 'bad');
        render();
    }

    /* ---- 渲染战斗 ---- */
    function renderBattle() {
        var e = state.enemy;
        var nextMove = e.pattern[state.enemyPatternIdx % e.pattern.length];
        var h = '<div class="game-shell">';
        // topbar
        h += '<div class="topbar"><span class="topbar-title">🎲 灵界幻阵 — 回合 ' + state.turn + '</span>';
        h += '<div class="topbar-stats"><span>❤️ ' + state.hp + '/' + state.hpMax + '</span>';
        h += '<span>🛡️ ' + state.shield + '</span><span>💰 ' + state.gold + '</span></div>';
        h += '<button class="topbar-btn back-btn" onclick="location.href=\'../index.html\'">逃跑</button></div>';
        h += routeHTML();
        h += relicsHTML();
        h += '<div class="game-main"><div class="game-left">';
        h += '<div class="battle-area">'; 

        // enemy
        h += '<div class="combatant"><div class="portrait">' + e.emoji + '</div><div class="info">';
        h += '<div class="name-row"><span class="cname">' + e.name + '</span>';
        h += '<span class="intent">下一手：' + nextMove.desc + '</span></div>';
        h += '<div class="bar-wrap"><span>HP</span><div class="bar-outer"><div class="bar-inner enemy-hp" style="width:' + Math.max(0, e.currentHp / e.hp * 100) + '%"></div>';
        h += '<span class="bar-label">' + Math.max(0, e.currentHp) + ' / ' + e.hp + '</span></div></div>';
        h += '<div class="status-area">';
        if (state.enemyShield > 0) h += '<div class="bar-wrap"><span>🛡️</span><span style="color:#58a6ff">' + state.enemyShield + '</span></div>';
        // enemy buffs
        h += '<div class="buffs">';
        if (state.enemyBuffs.poison > 0) h += '<span class="buff-tag debuff">🧪 中毒 ' + state.enemyBuffs.poison + '</span>';
        if (state.enemyBuffs.armor_break > 0) h += '<span class="buff-tag debuff">💥 破甲 ' + state.enemyBuffs.armor_break + '</span>';
        if (state.enemyBuffs.weak > 0) h += '<span class="buff-tag debuff">😵 虚弱 ' + state.enemyBuffs.weak + '</span>';
        if (state.enemyBonusDmg > 0) h += '<span class="buff-tag">💪 攻击 +' + state.enemyBonusDmg + '</span>';
        h += '</div></div></div></div>';

        // player
        h += '<div class="combatant player-section"><div class="portrait">' + (state.character ? state.character.emoji : '🧑') + '</div><div class="info">';
        h += '<div class="name-row"><span class="cname">' + (state.character ? state.character.name : '你') + '</span></div>';
        h += '<div class="bar-wrap"><span>HP</span><div class="bar-outer"><div class="bar-inner hp" style="width:' + Math.max(0, state.hp / state.hpMax * 100) + '%"></div>';
        h += '<span class="bar-label">' + Math.max(0, state.hp) + ' / ' + state.hpMax + '</span></div></div>';
        h += '<div class="status-area">';
        if (state.shield > 0) h += '<div class="bar-wrap"><span>🛡️</span><span style="color:#58a6ff">' + state.shield + '</span></div>';
        // player buffs
        h += '<div class="buffs">';
        if (state.playerPoison > 0) h += '<span class="buff-tag debuff">🧪 中毒 ' + state.playerPoison + '</span>';
        if (state.playerArmorBreak > 0) h += '<span class="buff-tag debuff">💥 破甲 ' + state.playerArmorBreak + '</span>';
        h += '</div></div>';
        h += '</div></div>';

        h += '</div>'; // close battle-area

        // dice (先选骰子) — inside game-left so always visible
        h += '<div class="dice-area"><h4>🎲 灵力骰子（先选骰子）</h4><div class="dice-row">';
        state.dice.forEach(function (d, di) {
            var cls = d.used ? 'used' : (di === state.selectedDice ? 'selected' : '');
            h += '<button class="dice-btn ' + cls + '" data-di="' + di + '">' + d.value + '</button>';
        });
        if (state.rerollsLeft > 0) {
            var rerollLabel = state.rerollsLeft > 1 ? '🔄 重掷 (x' + state.rerollsLeft + ')' : '🔄 重掷';
            h += '<button class="topbar-btn" id="btn-reroll" style="margin-left:12px">' + rerollLabel + '</button>';
        }
        h += '</div></div>';

        // skills (再点技能)
        h += '<div class="skills-area"><h4>⚔️ 再点技能释放</h4><div class="skills-row">';
        state.skills.forEach(function (sk, si) {
            h += '<button class="skill-btn" data-si="' + si + '">' + sk.icon + ' ' + sk.name + ' <span class="skill-req">[' + sk.reqDesc + ']</span></button>';
        });
        h += '</div></div>';

        // action row
        h += '<div class="action-row"><button class="topbar-btn" id="btn-end-turn">结束回合 ▶</button></div>';

        h += '</div>' + logPanelHTML() + '</div>'; // close game-left, add log, close game-main
        h += '</div>'; // close game-shell
        $app.innerHTML = h;

        // bind
        $app.querySelectorAll('.dice-btn:not(.used)').forEach(function (b) { b.onclick = function () { selectDice(parseInt(b.dataset.di)); }; });
        $app.querySelectorAll('.skill-btn').forEach(function (b) { b.onclick = function () { useSkill(parseInt(b.dataset.si)); }; });
        var endBtn = $('#btn-end-turn'); if (endBtn) endBtn.onclick = endPlayerTurn;
        var reBtn = $('#btn-reroll'); if (reBtn) reBtn.onclick = doReroll;
    }

    /* ========== EVENT ========== */
    function startEvent() {
        state.currentEvent = pick(DB_DICE.EVENTS);
        state.phase = 'event';
        addLog('❓ 奇遇：' + state.currentEvent.title, 'highlight');
        render();
    }

    function renderEvent() {
        var ev = state.currentEvent;
        var h = '<div class="game-shell">';
        h += '<div class="topbar"><span class="topbar-title">🎲 灵界幻阵</span>';
        h += '<div class="topbar-stats"><span>❤️ ' + state.hp + '/' + state.hpMax + '</span>';
        h += '<span>🛡️ ' + state.shield + '</span><span>💰 ' + state.gold + '</span></div></div>';
        h += routeHTML();
        h += relicsHTML();
        h += '<div class="game-main"><div class="node-screen">';
        h += '<h2>❓ ' + ev.title + '</h2>';
        h += '<p>' + ev.text + '</p>';
        h += '<div class="modal-choices">';
        ev.choices.forEach(function (c, ci) {
            h += '<button class="modal-choice-btn" data-ci="' + ci + '">' + c.label + '</button>';
        });
        if (state.passive === 'wanshu') {
            h += '<button class="modal-choice-btn" id="btn-wanshu-safe">🎒 百宝囊中（安全撤离，恢复 3 HP）</button>';
        }
        h += '</div></div>' + logPanelHTML() + '</div></div>';
        $app.innerHTML = h;
        $app.querySelectorAll('.modal-choice-btn[data-ci]').forEach(function (b) {
            b.onclick = function () { resolveEventChoice(parseInt(b.dataset.ci)); };
        });
        if (state.passive === 'wanshu') {
            var wsBtn = $('#btn-wanshu-safe');
            if (wsBtn) wsBtn.onclick = function () {
                var heal = Math.min(3, state.hpMax - state.hp);
                state.hp += heal;
                addLog('🎒 百宝囊中！安全撤离，恢复 ' + heal + ' HP', 'good');
                advanceNode();
            };
        }
    }

    function resolveEventChoice(idx) {
        var ev = state.currentEvent;
        var needSkillReplace = false;
        var pendingSk = null;
        var ctx = {
            loseHP: function (v) { state.hp -= v; addLog('❤️ 失去 ' + v + ' HP', 'bad'); if (state.hp <= 0) playerDied(); },
            loseMaxHP: function (v) { state.hpMax -= v; state.hp = Math.min(state.hp, state.hpMax); addLog('💔 最大HP -' + v, 'bad'); },
            gainRandomRelic: function () {
                var available = DB_DICE.RELICS.filter(function (r) { return state.relics.indexOf(r.id) === -1; });
                if (available.length > 0) { var r = pick(available); state.relics.push(r.id); addLog('🎁 获得遗物: ' + r.icon + ' ' + r.name, 'good'); }
                else addLog('没有更多遗物可获得');
            },
            gainRandomSkill: function () {
                var available = DB_DICE.SKILLS.filter(function (s) { return !state.skills.find(function (ps) { return ps.id === s.id; }); });
                if (available.length > 0) {
                    pendingSk = pick(available);
                    needSkillReplace = true;
                    addLog('📖 获得新技能: ' + pendingSk.icon + ' ' + pendingSk.name, 'good');
                } else {
                    addLog('你已学会所有技能');
                }
            },
            steleGamble: function () {
                if (Math.random() < 0.5) {
                    // 实际效果：恢复 10 HP
                    var heal = Math.min(10, state.hpMax - state.hp);
                    state.hp += heal;
                    addLog('✨ 参悟成功！灵气灌顶，恢复 ' + heal + ' HP', 'good');
                } else {
                    state.hp -= 5;
                    addLog('💫 头晕目眩，受到 5 点伤害', 'bad');
                    if (state.hp <= 0) playerDied();
                }
            }
        };
        ev.choices[idx].effect(ctx);
        if (state.phase === 'dead') { render(); return; }
        if (needSkillReplace && pendingSk) {
            showSkillReplaceDialog(pendingSk.id);
            return; // don't advance yet; advanceNode called after replace
        }
        advanceNode();
    }

    /* ========== REST ========== */
    function renderRest() {
        var healAmt = Math.floor(state.hpMax * 0.3);
        var h = '<div class="game-shell">';
        h += '<div class="topbar"><span class="topbar-title">🎲 灵界幻阵</span>';
        h += '<div class="topbar-stats"><span>❤️ ' + state.hp + '/' + state.hpMax + '</span>';
        h += '<span>💰 ' + state.gold + '</span></div></div>';
        h += routeHTML();
        h += relicsHTML();
        h += '<div class="game-main"><div class="node-screen">';
        h += '<h2>🏕️ 休息营地</h2>';
        h += '<p>篝火温暖地燃烧着，你可以在此恢复体力。</p>';
        h += '<div class="modal-choices">';
        h += '<button class="modal-choice-btn" id="btn-rest-heal">🔥 生火休息（恢复 ' + healAmt + ' HP）</button>';
        if (state.passive === 'player') {
            h += '<button class="modal-choice-btn" id="btn-rest-learn">💡 灵感顿悟（学习新技能）</button>';
        }
        h += '</div></div>' + logPanelHTML() + '</div></div>';
        $app.innerHTML = h;
        $('#btn-rest-heal').onclick = function () {
            state.hp = Math.min(state.hp + healAmt, state.hpMax);
            addLog('🔥 休息一夜，恢复了 ' + healAmt + ' HP', 'good');
            advanceNode();
        };
        if (state.passive === 'player') {
            var learnBtn = $('#btn-rest-learn');
            if (learnBtn) learnBtn.onclick = function () {
                var pool = DB_DICE.SKILLS.filter(function (s) { return !state.skills.find(function (ps) { return ps.id === s.id; }); });
                if (pool.length === 0) { showToast('没有更多技能可学'); return; }
                shuffle(pool);
                var offers = pool.slice(0, 2);
                var oh = '<div class="modal-overlay" id="learn-modal"><div class="modal-box">';
                oh += '<h3>💡 灵感顿悟 — 选择一个技能</h3>';
                oh += '<div class="modal-choices">';
                offers.forEach(function (sk) {
                    oh += '<button class="modal-choice-btn" data-skid="' + sk.id + '">' + sk.icon + ' ' + sk.name + ' [' + sk.reqDesc + ']</button>';
                });
                oh += '<button class="modal-choice-btn" id="btn-learn-cancel">放弃</button>';
                oh += '</div></div></div>';
                $app.insertAdjacentHTML('beforeend', oh);
                $app.querySelectorAll('#learn-modal [data-skid]').forEach(function (b) {
                    b.onclick = function () {
                        var skid = parseInt(b.dataset.skid);
                        var m = $('#learn-modal'); if (m) m.remove();
                        showSkillReplaceDialog(skid);
                    };
                });
                var cb = $('#btn-learn-cancel');
                if (cb) cb.onclick = function () { var m = $('#learn-modal'); if (m) m.remove(); };
            };
        }
    }

    /* ========== SHOP ========== */
    function renderShop() {
        var h = '<div class="game-shell">';
        h += '<div class="topbar"><span class="topbar-title">🎲 灵界幻阵</span>';
        h += '<div class="topbar-stats"><span>❤️ ' + state.hp + '/' + state.hpMax + '</span>';
        h += '<span>💰 ' + state.gold + '</span></div></div>';
        h += routeHTML();
        h += relicsHTML();
        h += '<div class="game-main"><div class="node-screen">';
        h += '<h2>🏪 商店</h2>';
        h += '<p>游商摊位上摆满了奇珍异宝。</p>';
        h += '<div class="shop-items">';
        // sell relics not owned
        var shopRelics = DB_DICE.RELICS.filter(function (r) { return state.relics.indexOf(r.id) === -1; });
        shuffle(shopRelics);
        shopRelics.slice(0, 3).forEach(function (r) {
            var price = 15;
            var canBuy = state.gold >= price;
            h += '<div class="shop-item' + (canBuy ? '' : ' disabled') + '" data-rid="' + r.id + '" data-price="' + price + '">';
            h += '<span class="item-icon">' + r.icon + '</span>';
            h += '<div class="item-info"><div class="item-name">' + r.name + '</div><div class="item-desc">' + r.desc + '</div></div>';
            h += '<span class="item-price">' + price + ' 💰</span></div>';
        });
        h += '</div>';
        h += '<button class="topbar-btn" id="btn-shop-leave" style="margin-top:20px">离开商店 ▶</button>';
        h += '</div>' + logPanelHTML() + '</div></div>';
        $app.innerHTML = h;
        $app.querySelectorAll('.shop-item:not(.disabled)').forEach(function (el) {
            el.onclick = function () {
                var rid = el.dataset.rid;
                var price = parseInt(el.dataset.price);
                if (state.gold < price) { showToast('金币不足'); return; }
                state.gold -= price;
                state.relics.push(rid);
                var r = DB_DICE.RELICS.find(function (x) { return x.id === rid; });
                addLog('🛒 购买了 ' + r.icon + ' ' + r.name, 'good');
                renderShop();
            };
        });
        $('#btn-shop-leave').onclick = function () { advanceNode(); };
    }

    /* ========== SKILL REWARD ========== */
    function renderSkillReward() {
        var pool = DB_DICE.SKILLS.filter(function (s) { return !state.skills.find(function (ps) { return ps.id === s.id; }); });
        shuffle(pool);
        var offers = pool.slice(0, 3);
        var h = '<div class="game-shell">';
        h += '<div class="topbar"><span class="topbar-title">🎲 战斗奖励</span>';
        h += '<div class="topbar-stats"><span>❤️ ' + state.hp + '/' + state.hpMax + '</span></div></div>';
        h += routeHTML();
        h += '<div class="game-main"><div class="node-screen">';
        h += '<h2>🎁 选择一个新技能（替换现有技能）</h2>';
        h += '<div class="modal-choices">';
        offers.forEach(function (sk) {
            h += '<button class="modal-choice-btn" data-skid="' + sk.id + '">' + sk.icon + ' ' + sk.name + ' [' + sk.reqDesc + ']</button>';
        });
        h += '<button class="modal-choice-btn" id="btn-skip-reward">跳过</button>';
        h += '</div></div>' + logPanelHTML() + '</div></div>';
        $app.innerHTML = h;
        $app.querySelectorAll('[data-skid]').forEach(function (b) {
            b.onclick = function () {
                var skid = parseInt(b.dataset.skid);
                showSkillReplaceDialog(skid);
            };
        });
        var skipBtn = $('#btn-skip-reward');
        if (skipBtn) skipBtn.onclick = function () { advanceNode(); };
    }

    function showSkillReplaceDialog(newSkillId) {
        var newSk = DB_DICE.SKILLS.find(function (s) { return s.id === newSkillId; });
        var h = '<div class="modal-overlay" id="replace-modal"><div class="modal-box">';
        h += '<h3>选择要替换的技能</h3>';
        h += '<p>新技能: ' + newSk.icon + ' ' + newSk.name + ' [' + newSk.reqDesc + ']</p>';
        h += '<div class="modal-choices">';
        state.skills.forEach(function (sk, si) {
            h += '<button class="modal-choice-btn" data-si="' + si + '">替换 ' + sk.icon + ' ' + sk.name + '</button>';
        });
        h += '<button class="modal-choice-btn" id="btn-cancel-replace">取消</button>';
        h += '</div></div></div>';
        $app.insertAdjacentHTML('beforeend', h);
        $app.querySelectorAll('#replace-modal [data-si]').forEach(function (b) {
            b.onclick = function () {
                var si = parseInt(b.dataset.si);
                state.skills[si] = newSk;
                addLog('📖 替换技能：' + newSk.icon + ' ' + newSk.name, 'good');
                var modal = $('#replace-modal');
                if (modal) modal.remove();
                advanceNode();
            };
        });
        var cancelBtn = $app.querySelector('#btn-cancel-replace');
        if (cancelBtn) cancelBtn.onclick = function () { var m = $('#replace-modal'); if (m) m.remove(); };
    }

    /* ========== RELIC REWARD (Elite) ========== */
    function renderRelicReward() {
        var available = DB_DICE.RELICS.filter(function (r) { return state.relics.indexOf(r.id) === -1; });
        shuffle(available);
        var offers = available.slice(0, 2);
        var h = '<div class="game-shell">';
        h += '<div class="topbar"><span class="topbar-title">🎲 精英奖励</span>';
        h += '<div class="topbar-stats"><span>❤️ ' + state.hp + '/' + state.hpMax + '</span></div></div>';
        h += routeHTML();
        h += '<div class="game-main"><div class="node-screen">';
        h += '<h2>🏆 精英战利品！选择一个遗物</h2>';
        h += '<div class="modal-choices">';
        offers.forEach(function (r) {
            h += '<button class="modal-choice-btn" data-rid="' + r.id + '">' + r.icon + ' ' + r.name + ' — ' + r.desc + '</button>';
        });
        h += '</div>';
        h += '<p style="margin-top:16px;color:#8b949e">同时还有新技能可选：</p>';
        // Also offer skill
        var pool = DB_DICE.SKILLS.filter(function (s) { return !state.skills.find(function (ps) { return ps.id === s.id; }); });
        shuffle(pool);
        pool.slice(0, 3).forEach(function (sk) {
            h += '<button class="modal-choice-btn" data-skid="' + sk.id + '">' + sk.icon + ' ' + sk.name + ' [' + sk.reqDesc + ']</button>';
        });
        h += '<button class="modal-choice-btn" id="btn-skip-er">跳过技能 ▶</button>';
        h += '</div>' + logPanelHTML() + '</div></div>';
        $app.innerHTML = h;
        // relic
        $app.querySelectorAll('[data-rid]').forEach(function (b) {
            b.onclick = function () {
                var r = DB_DICE.RELICS.find(function (x) { return x.id === b.dataset.rid; });
                state.relics.push(r.id);
                addLog('🎁 获得遗物: ' + r.icon + ' ' + r.name, 'good');
                // now show skill offer part (player can still pick or skip)
                b.parentNode.querySelectorAll('[data-rid]').forEach(function (x) { x.classList.add('disabled'); x.style.pointerEvents = 'none'; });
            };
        });
        $app.querySelectorAll('[data-skid]').forEach(function (b) {
            b.onclick = function () { showSkillReplaceDialog(parseInt(b.dataset.skid)); };
        });
        var skipBtn = $('#btn-skip-er');
        if (skipBtn) skipBtn.onclick = function () { advanceNode(); };
    }

    /* ========== RESULT ========== */
    function renderResult() {
        var won = state.phase === 'boss_dead';
        var stageReached = state.currentNode + 1;
        var h = '<div class="result-overlay"><div class="result-box">';
        if (won) {
            h += '<h2>🎊 通关！灵界幻阵已被净化！</h2>';
            h += '<p>你成功击败了墨染邪尊，庭院安宁了。</p>';
            h += '<p>💰 获得 ' + state.gold + ' 金币</p>';
            h += '<div class="stars">⭐⭐⭐</div>';
        } else {
            h += '<h2>💀 灵力耗尽……</h2>';
            h += '<p>你在第 ' + stageReached + ' 关倒下了。</p>';
            h += '<p>💰 获得 ' + Math.floor(state.gold * 0.5) + ' 金币（安慰奖）</p>';
            var stars = stageReached >= 5 ? '⭐⭐' : (stageReached >= 3 ? '⭐' : '');
            h += '<div class="stars">' + (stars || '无星') + '</div>';
        }
        h += '<button class="topbar-btn" onclick="location.reload()">再来一局</button>';
        h += '<button class="topbar-btn back-btn" style="margin-left:10px" onclick="location.href=\'../index.html\'">返回</button>';
        h += '</div></div>';
        $app.innerHTML = h;
    }

    function advanceNode() {
        state.currentNode++;
        if (state.currentNode >= DB_DICE.NODE_SEQUENCE.length) {
            state.phase = 'boss_dead';
        } else {
            state.phase = 'map';
        }
        state.shield = 0; // clear shield between nodes
        state.playerPoison = 0;
        state.playerArmorBreak = 0;
        render();
    }

    /* ---- 启动 ---- */
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
