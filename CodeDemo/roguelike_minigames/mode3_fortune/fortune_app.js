// ============================================================
// 模式三：气运钱庄 — 游戏主逻辑 (fortune_app.js)
// ============================================================
(function () {
    'use strict';

    /* ---- 工具 ---- */
    function $(sel, p) { return (p || document).querySelector(sel); }
    function $$(sel, p) { return (p || document).querySelectorAll(sel); }
    function delay(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
    function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
    function pick(arr) { return arr[randInt(0, arr.length - 1)]; }
    function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = randInt(0, i); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
    function cloneArr(a) { return a.map(function (o) { return { id: o.id, bonusScore: o.bonusScore || 0 }; }); }

    var ITEMS = DB_FORTUNE.ITEMS;
    var STAGES = DB_FORTUNE.STAGES;
    var REWARD_POOLS = DB_FORTUNE.REWARD_POOLS;
    var SLOTS = DB_FORTUNE.DISPLAY_SLOTS; // 6

    /* ---- 状态 ---- */
    var state = {};

    function resetState() {
        state.bag = DB_FORTUNE.makeStarterBag();
        state.totalScore = 0;
        state.stageIdx = 0;
        state.spinsLeft = STAGES[0].spins;
        state.phase = 'idle';       // idle | spinning | resolving | reward | purge | win | lose
        state.display = [];         // [{id, bonusScore, destroyed, floats:[]}]
        state.logs = [];
        state.resolving = false;
    }

    var $app, $toast;

    /* ==== 初始化 ==== */
    function init() {
        $app = $('#app');
        $toast = $('#toast');
        resetState();
        addLog('📜 玩法说明：', 'special');
        addLog('1. 点击【运转气运盘】从袋子里随机抽6件物品', '');
        addLog('2. 物品自动结算得分，有联动加成（猫吃鼠+25、商贾×钱币+4/个…）', '');
        addLog('3. 每个Stage限定转盘次数，累计分数达标即过关', '');
        addLog('4. 过关后可选1个新物品加入袋子，构筑你的印钞引擎！', '');
        addLog('—— 目标：Stage1→100分, Stage2→300, Stage3→800, Stage4→2000, Stage5→5000 ——', 'special');
        render();
    }

    /* ---- Toast ---- */
    function toast(msg) {
        $toast.textContent = msg;
        $toast.classList.add('show');
        setTimeout(function () { $toast.classList.remove('show'); }, 1400);
    }

    /* ---- 日志 ---- */
    function addLog(text, cls) {
        state.logs.push({ text: text, cls: cls || '' });
    }

    /* ==================================================================
       渲染
    ================================================================== */
    function render() {
        if (state.phase === 'win' || state.phase === 'lose') {
            renderResult();
            return;
        }
        if (state.phase === 'reward') {
            renderReward();
            return;
        }
        if (state.phase === 'purge') {
            renderPurge();
            return;
        }
        renderMain();
    }

    /* ---- 主界面 ---- */
    function renderMain() {
        var stg = STAGES[state.stageIdx];
        var pct = Math.min(100, (state.totalScore / stg.target * 100)).toFixed(1);

        var html = '<div class="game-shell">';

        /* 顶栏 */
        html += '<div class="stage-bar">';
        html += '<span class="stage-label">' + stg.label + '</span>';
        html += '<span class="score-text">得分：<span class="current-score">' + state.totalScore + '</span> / ' + stg.target + '</span>';
        html += '<span class="spin-text">剩余转盘：' + state.spinsLeft + '</span>';
        html += '</div>';
        html += '<div class="score-progress"><div class="score-progress-inner" style="width:' + pct + '%"></div></div>';

        html += '<div class="game-main" style="flex-direction:column;">';

        /* 展示板 */
        html += '<div class="slot-board">';
        for (var i = 0; i < SLOTS; i++) {
            var s = state.display[i];
            if (s) {
                var info = ITEMS[s.id];
                var sc = info.baseScore + (s.bonusScore || 0);
                var cls = 'slot-card';
                if (s.destroyed) cls += ' consumed';
                if (s.highlight) cls += ' highlight';
                html += '<div class="' + cls + '" data-idx="' + i + '">';
                html += '<span class="slot-score-tag">' + sc + '</span>';
                html += '<span>' + info.emoji + '</span>';
                html += '<span class="slot-name">' + info.name + '</span>';
                /* floats */
                if (s.floats) {
                    for (var f = 0; f < s.floats.length; f++) {
                        var fl = s.floats[f];
                        html += '<div class="slot-float ' + (fl.neg ? 'negative' : '') + '" style="animation-delay:' + (f * 0.3) + 's">' + fl.text + '</div>';
                    }
                }
                html += '</div>';
            } else {
                html += '<div class="slot-card"><span style="color:#666">?</span></div>';
            }
        }
        html += '</div>';

        /* 按钮 */
        html += '<div class="fortune-actions">';
        var canSpin = state.phase === 'idle' && state.spinsLeft > 0;
        html += '<button id="btnSpin" ' + (canSpin ? '' : 'disabled') + '>🎰 运转气运盘</button>';
        html += '</div>';

        /* 解说日志 */
        html += '<div class="resolution-log" id="resLog">';
        for (var l = 0; l < state.logs.length; l++) {
            html += '<div class="res-step ' + state.logs[l].cls + '">' + state.logs[l].text + '</div>';
        }
        html += '</div>';

        /* 袋子预览 */
        html += '<div class="bag-preview">';
        html += '<h3>🎒 你的袋子 (' + state.bag.length + ' 件)</h3>';
        html += '<div class="bag-grid">';
        var sorted = bagSummary();
        for (var k = 0; k < sorted.length; k++) {
            html += '<span class="bag-chip" title="' + ITEMS[sorted[k].id].name + (sorted[k].bonus ? ' (+' + sorted[k].bonus + ')' : '') + '">' + ITEMS[sorted[k].id].emoji + (sorted[k].count > 1 ? 'x' + sorted[k].count : '') + '</span>';
        }
        html += '</div></div>';

        html += '</div>'; // game-main
        html += '</div>'; // game-shell

        $app.innerHTML = html;

        /* 绑定 */
        var btn = $('#btnSpin');
        if (btn) btn.onclick = doSpin;

        scrollLog();
    }

    function scrollLog() {
        var el = $('#resLog');
        if (el) el.scrollTop = el.scrollHeight;
    }

    function bagSummary() {
        var map = {};
        state.bag.forEach(function (item) {
            var key = item.id + '_' + (item.bonusScore || 0);
            if (!map[key]) map[key] = { id: item.id, bonus: item.bonusScore || 0, count: 0 };
            map[key].count++;
        });
        var arr = [];
        for (var k in map) arr.push(map[k]);
        arr.sort(function (a, b) { return (ITEMS[a.id].baseScore + a.bonus) - (ITEMS[b.id].baseScore + b.bonus); });
        return arr;
    }

    /* ==================================================================
       核心 Spin 逻辑
    ================================================================== */
    async function doSpin() {
        if (state.phase !== 'idle' || state.spinsLeft <= 0) return;
        state.spinsLeft--;
        state.phase = 'spinning';
        state.logs = [];
        addLog('—— 第 ' + (STAGES[state.stageIdx].spins - state.spinsLeft) + ' 次运转 ——', 'special');

        /* 从袋子中随机抽 6 个 */
        var pool = cloneArr(state.bag);
        shuffle(pool);
        var drawn = pool.slice(0, Math.min(SLOTS, pool.length));
        state.display = drawn.map(function (d) {
            return { id: d.id, bonusScore: d.bonusScore || 0, destroyed: false, highlight: false, floats: [] };
        });
        // 补齐不足
        while (state.display.length < SLOTS) {
            state.display.push({ id: 'coin', bonusScore: 0, destroyed: false, highlight: false, floats: [] });
        }

        render();
        await delay(600);

        /* ---- 分步结算 ---- */
        var extraScore = 0;
        var anyDestroyed = false;

        /* === Priority 1: 消除/吞噬 === */
        addLog('▸ 检查吞噬效果...', '');
        render(); await delay(400);

        // cheese + mouse → mouse eats cheese, mouse becomes fat_mouse
        extraScore += await resolveCheeseAndMouse();
        // cat eats mouse or fish
        extraScore += await resolveCat();
        // thief steals coin or gem
        extraScore += await resolveThief();

        anyDestroyed = state.display.some(function (s) { return s.destroyed; });

        /* === Priority 2: 捕快逮盗贼 === */
        extraScore += await resolveCop();

        // update anyDestroyed
        if (!anyDestroyed) anyDestroyed = state.display.some(function (s) { return s.destroyed; });

        /* === Priority 3: 加成 === */
        addLog('▸ 检查加成效果...', '');
        render(); await delay(400);
        extraScore += await resolveMerchant();
        extraScore += await resolveBrewer();

        /* === Priority 4: 聚宝盆 === */
        extraScore += await resolveMagicBox(anyDestroyed);

        /* === Priority 5: 基础分合计 === */
        var baseTotal = 0;
        state.display.forEach(function (s) {
            if (!s.destroyed) {
                baseTotal += ITEMS[s.id].baseScore + (s.bonusScore || 0);
            }
        });

        var spinTotal = baseTotal + extraScore;

        /* === Priority 5: 皇帝 === */
        var emperorMult = await resolveEmperor();
        spinTotal = spinTotal * emperorMult;

        addLog('基础分 ' + baseTotal + ' + 加成 ' + extraScore + (emperorMult > 1 ? ' ×' + emperorMult : '') + ' = 本轮 ' + spinTotal + ' 分', 'special');

        state.totalScore += spinTotal;

        /* ---- 销毁永久移除 ---- */
        state.display.forEach(function (s) {
            if (s.destroyed) {
                // 从袋子移除第一个匹配
                for (var i = 0; i < state.bag.length; i++) {
                    if (state.bag[i].id === s.id) {
                        state.bag.splice(i, 1);
                        break;
                    }
                }
            }
        });

        /* ---- 聚宝盆永久加分更新 ---- */
        // already handled in resolveMagicBox

        state.phase = 'idle';
        render();
        await delay(500);

        /* ---- 检查阶段完成 ---- */
        checkStageComplete();
    }

    /* ---- 奶酪 + 老鼠 ---- */
    async function resolveCheeseAndMouse() {
        var extra = 0;
        var mice = findSlots('mouse');
        var cheeses = findSlots('cheese');
        if (mice.length > 0 && cheeses.length > 0) {
            // 每只老鼠吃一个奶酪
            var pairs = Math.min(mice.length, cheeses.length);
            for (var p = 0; p < pairs; p++) {
                var mi = mice[p];
                var ci = cheeses[p];
                state.display[ci].destroyed = true;
                state.display[mi].id = 'fat_mouse';
                state.display[mi].bonusScore = 0;
                state.display[mi].floats.push({ text: '+15 🐹变胖', neg: false });
                addLog('🐭 老鼠吃掉了 🧀 奶酪！变成胖老鼠 +15分', 'positive');
                extra += 15;
                // 袋子中将该 mouse 改为 fat_mouse
                for (var i = 0; i < state.bag.length; i++) {
                    if (state.bag[i].id === 'mouse') {
                        state.bag[i].id = 'fat_mouse';
                        state.bag[i].bonusScore = 0;
                        break;
                    }
                }
                render(); await delay(500);
            }
        }
        return extra;
    }

    /* ---- 招财猫 ---- */
    async function resolveCat() {
        var extra = 0;
        var cats = findSlots('cat');
        if (cats.length === 0) return extra;
        for (var c = 0; c < cats.length; c++) {
            var ci = cats[c];
            // 猫吃 mouse 或 fish（不吃 fat_mouse）
            var targets = findSlots('mouse').concat(findSlots('fish'));
            if (targets.length > 0) {
                var ti = targets[0];
                var tname = ITEMS[state.display[ti].id].name;
                state.display[ti].destroyed = true;
                state.display[ci].highlight = true;
                state.display[ci].floats.push({ text: '+25 吃掉' + tname, neg: false });
                addLog('🐱 招财猫吞噬了 ' + ITEMS[state.display[ti].id].emoji + ' ' + tname + ' +25分', 'positive');
                extra += 25;
                render(); await delay(500);
            }
        }
        return extra;
    }

    /* ---- 盗贼 ---- */
    async function resolveThief() {
        var extra = 0;
        var thieves = findSlots('thief');
        if (thieves.length === 0) return extra;
        for (var t = 0; t < thieves.length; t++) {
            var ti = thieves[t];
            // 优先吃 gem
            var gems = findSlotsAlive('gem');
            if (gems.length > 0) {
                var gi = gems[0];
                state.display[gi].destroyed = true;
                state.display[ti].floats.push({ text: '+100 抢宝石！', neg: false });
                addLog('🥷 盗贼抢走了 💎 灵气宝石！+100分', 'special');
                extra += 100;
                render(); await delay(500);
                continue;
            }
            var coins = findSlotsAlive('coin');
            if (coins.length > 0) {
                var coinI = coins[0];
                state.display[coinI].destroyed = true;
                state.display[ti].floats.push({ text: '+20 偷铜钱', neg: false });
                addLog('🥷 盗贼偷走了 🪙 铜钱 +20分', 'positive');
                extra += 20;
                render(); await delay(500);
            }
        }
        return extra;
    }

    /* ---- 捕快 ---- */
    async function resolveCop() {
        var extra = 0;
        var cops = findSlotsAlive('cop');
        var thieves = findSlotsAlive('thief');
        if (cops.length > 0 && thieves.length > 0) {
            var pairs = Math.min(cops.length, thieves.length);
            for (var p = 0; p < pairs; p++) {
                var thi = thieves[p];
                state.display[thi].destroyed = true;
                state.display[cops[p]].highlight = true;
                state.display[cops[p]].floats.push({ text: '+50 逮捕盗贼！', neg: false });
                addLog('👮 捕快逮捕了 🥷 盗贼！+50分', 'positive');
                extra += 50;
                render(); await delay(500);
            }
        }
        return extra;
    }

    /* ---- 商贾 ---- */
    async function resolveMerchant() {
        var extra = 0;
        var mercs = findSlotsAlive('merchant');
        if (mercs.length === 0) return extra;
        var moneyCount = findSlotsAlive('coin').length + findSlotsAlive('silver').length + findSlotsAlive('gold').length;
        if (moneyCount > 0) {
            for (var m = 0; m < mercs.length; m++) {
                var bonus = moneyCount * 4;
                state.display[mercs[m]].highlight = true;
                state.display[mercs[m]].floats.push({ text: '+' + bonus + ' 钱币联动', neg: false });
                addLog('🤵 商贾 发现 ' + moneyCount + ' 个钱币类，+' + bonus + '分', 'positive');
                extra += bonus;
            }
            render(); await delay(500);
        }
        return extra;
    }

    /* ---- 酿酒师 ---- */
    async function resolveBrewer() {
        var extra = 0;
        var brewers = findSlotsAlive('brewer');
        if (brewers.length === 0) return extra;
        var matCount = findSlotsAlive('wine_cup').length + findSlotsAlive('grass').length;
        if (matCount > 0) {
            for (var b = 0; b < brewers.length; b++) {
                var bonus = matCount * 5;
                state.display[brewers[b]].highlight = true;
                state.display[brewers[b]].floats.push({ text: '+' + bonus + ' 杯草联动', neg: false });
                addLog('🍶 酿酒师 发现 ' + matCount + ' 个杯/草，+' + bonus + '分', 'positive');
                extra += bonus;
            }
            render(); await delay(500);
        }
        return extra;
    }

    /* ---- 聚宝盆 ---- */
    async function resolveMagicBox(anyDestroyed) {
        var extra = 0;
        var boxes = findSlotsAlive('magic_box');
        if (boxes.length === 0 || !anyDestroyed) return extra;
        for (var b = 0; b < boxes.length; b++) {
            // 永久加分：给袋子里所有 magic_box 加 bonusScore
            for (var i = 0; i < state.bag.length; i++) {
                if (state.bag[i].id === 'magic_box') {
                    state.bag[i].bonusScore = (state.bag[i].bonusScore || 0) + 1;
                }
            }
            state.display[boxes[b]].bonusScore = (state.display[boxes[b]].bonusScore || 0) + 1;
            state.display[boxes[b]].highlight = true;
            state.display[boxes[b]].floats.push({ text: '永久+1！', neg: false });
            addLog('🏺 聚宝盆 感知到吞噬，永久 +1 基础分！', 'special');
        }
        render(); await delay(500);
        return extra;
    }

    /* ---- 皇帝 ---- */
    async function resolveEmperor() {
        var emps = findSlotsAlive('emperor');
        if (emps.length === 0) return 1;
        var mult = Math.pow(2, emps.length);
        for (var e = 0; e < emps.length; e++) {
            state.display[emps[e]].highlight = true;
            state.display[emps[e]].floats.push({ text: '×2 皇恩', neg: false });
        }
        addLog('👑 皇帝驾到！本轮总分 ×' + mult, 'special');
        render(); await delay(600);
        return mult;
    }

    /* ---- 辅助查找 ---- */
    function findSlots(id) {
        var r = [];
        state.display.forEach(function (s, i) { if (s.id === id && !s.destroyed) r.push(i); });
        return r;
    }
    function findSlotsAlive(id) {
        return findSlots(id); // same - only live ones
    }

    /* ==================================================================
       阶段检查
    ================================================================== */
    function checkStageComplete() {
        var stg = STAGES[state.stageIdx];
        if (state.totalScore >= stg.target) {
            // 通关本 Stage
            addLog('✅ ' + stg.label + ' 达标！得分 ' + state.totalScore + ' / ' + stg.target, 'special');
            if (state.stageIdx >= STAGES.length - 1) {
                // 全部通关
                state.phase = 'win';
                render();
                return;
            }
            // 奖励选择
            state.phase = 'reward';
            render();
        } else if (state.spinsLeft <= 0) {
            // 没转盘了，也没达标
            addLog('❌ ' + stg.label + ' 未达标！Game Over', 'negative');
            state.phase = 'lose';
            render();
        }
    }

    /* ==================================================================
       奖励选择
    ================================================================== */
    function renderReward() {
        var stg = STAGES[state.stageIdx];
        var pool = REWARD_POOLS[stg.rewardTier] || REWARD_POOLS.common;
        // 随机选 3 个不重复
        var shuffled = shuffle(pool.slice());
        var choices = shuffled.slice(0, Math.min(3, shuffled.length));

        var html = '<div class="game-shell"><div class="reward-panel">';
        html += '<h2>🎁 ' + stg.label + ' 通关！选择一件物品加入袋子</h2>';
        html += '<div class="reward-choices">';
        for (var i = 0; i < choices.length; i++) {
            var info = ITEMS[choices[i]];
            html += '<div class="reward-card" data-id="' + choices[i] + '">';
            html += '<span class="reward-emoji">' + info.emoji + '</span>';
            html += '<span class="reward-name">' + info.name + '</span>';
            html += '<span class="reward-desc">' + info.desc + '</span>';
            html += '</div>';
        }
        html += '</div>';

        /* 也提供移除选项 */
        html += '<p style="color:#aaa;font-size:18px;margin-top:20px;">或者：</p>';
        html += '<button id="btnPurge" style="font-size:20px;padding:8px 24px;background:#8b0000;color:#fff;border:none;border-radius:8px;cursor:pointer;">🗑️ 不拿奖励，改为移除袋子中一件废物</button>';

        html += '</div></div>';
        $app.innerHTML = html;

        $$('.reward-card').forEach(function (el) {
            el.onclick = function () {
                var id = el.getAttribute('data-id');
                state.bag.push({ id: id, bonusScore: 0 });
                addLog('🎁 获得了 ' + ITEMS[id].emoji + ' ' + ITEMS[id].name + '！', 'special');
                toast('获得了 ' + ITEMS[id].name + '！');
                advanceStage();
            };
        });

        var btnP = $('#btnPurge');
        if (btnP) {
            btnP.onclick = function () {
                state.phase = 'purge';
                render();
            };
        }
    }

    /* ==================================================================
       移除（净化）
    ================================================================== */
    function renderPurge() {
        // 显示袋子，可以点一个移除
        var html = '<div class="game-shell"><div class="purge-panel">';
        html += '<h2>🗑️ 选择要移除的物品（点击移除）</h2>';
        html += '<div class="purge-choices">';
        for (var i = 0; i < state.bag.length; i++) {
            var info = ITEMS[state.bag[i].id];
            html += '<span class="purge-chip" data-idx="' + i + '" title="' + info.name + '">' + info.emoji + '</span>';
        }
        html += '</div>';
        html += '<button id="btnCancelPurge" style="font-size:18px;padding:6px 20px;margin-top:16px;background:#555;color:#fff;border:none;border-radius:8px;cursor:pointer;">返回奖励选择</button>';
        html += '</div></div>';
        $app.innerHTML = html;

        $$('.purge-chip').forEach(function (el) {
            el.onclick = function () {
                var idx = parseInt(el.getAttribute('data-idx'));
                var removed = state.bag.splice(idx, 1)[0];
                addLog('🗑️ 移除了 ' + ITEMS[removed.id].emoji + ' ' + ITEMS[removed.id].name, 'negative');
                toast('移除了 ' + ITEMS[removed.id].name);
                advanceStage();
            };
        });

        var btnC = $('#btnCancelPurge');
        if (btnC) {
            btnC.onclick = function () {
                state.phase = 'reward';
                render();
            };
        }
    }

    function advanceStage() {
        state.stageIdx++;
        if (state.stageIdx >= STAGES.length) {
            state.phase = 'win';
            render();
            return;
        }
        state.spinsLeft = STAGES[state.stageIdx].spins;
        state.display = [];
        state.phase = 'idle';
        addLog('—— 进入 ' + STAGES[state.stageIdx].label + ' ——', 'special');
        render();
    }

    /* ==================================================================
       结果画面
    ================================================================== */
    function renderResult() {
        var won = state.phase === 'win';
        var html = '<div class="result-overlay">';
        html += '<h1>' + (won ? '🎉 通关成功！' : '💀 挑战失败') + '</h1>';
        html += '<p style="font-size:22px;">最终得分：' + state.totalScore + '</p>';
        html += '<p style="font-size:20px;">到达 Stage ' + (state.stageIdx + (won ? 1 : 0)) + ' / ' + STAGES.length + '</p>';

        if (won) {
            html += '<p style="font-size:20px;color:#4caf50;">获得大庭院代币 ×3</p>';
        } else {
            var tokens = Math.max(0, state.stageIdx);
            html += '<p style="font-size:20px;color:#ff9800;">获得大庭院代币 ×' + tokens + '</p>';
        }

        html += '<div style="display:flex;gap:16px;margin-top:20px;">';
        html += '<button onclick="location.reload()" style="font-size:22px;padding:10px 30px;background:#c9a94e;border:none;border-radius:8px;cursor:pointer;">🔄 再来一局</button>';
        html += '<button onclick="location.href=\'../index.html\'" style="font-size:22px;padding:10px 30px;background:#666;color:#fff;border:none;border-radius:8px;cursor:pointer;">🏠 返回</button>';
        html += '</div></div>';
        $app.innerHTML = html;
    }

    /* ---- 启动 ---- */
    window.addEventListener('DOMContentLoaded', init);
})();
