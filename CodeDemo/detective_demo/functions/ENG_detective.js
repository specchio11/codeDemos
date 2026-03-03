// ============================================================
// ENG_detective.js — 探案引擎核心逻辑（真凶随机版）
// 函数文件夹：纯函数，不持有运行时状态
// ============================================================

// ─── 工具函数 ───
function DT_weightedPick(arr, weights) {
    var total = 0;
    for (var i = 0; i < weights.length; i++) total += weights[i];
    var roll = Math.random() * total;
    for (var i = 0; i < arr.length; i++) {
        roll -= weights[i];
        if (roll <= 0) return arr[i];
    }
    return arr[arr.length - 1];
}

function DT_shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
    }
    return a;
}

// ─── 生成一局案件实例（核心改造）───
function DT_generateCase(templateId) {
    // 1. 选模板
    var template;
    if (!templateId) {
        var idx = Math.floor(Math.random() * DT_CASE_TEMPLATES.length);
        template = DT_CASE_TEMPLATES[idx];
    } else {
        for (var i = 0; i < DT_CASE_TEMPLATES.length; i++) {
            if (DT_CASE_TEMPLATES[i].id === templateId) { template = DT_CASE_TEMPLATES[i]; break; }
        }
    }
    if (!template) template = DT_CASE_TEMPLATES[0];

    // 2. 从候选真凶中随机选一个
    var variants = template.culpritVariants;
    var variantIdx = Math.floor(Math.random() * variants.length);
    var chosenVariant = variants[variantIdx];

    // 3. 组装线索池
    //    关键线索 = 选中变体的 clues（证据链）
    //    红鲱鱼   = 选中变体的 herringClues（指向其他人的误导）
    //    噪声     = 模板公共的 noiseClues
    var keyClues = [];
    for (var i = 0; i < chosenVariant.clues.length; i++) {
        keyClues.push(Object.assign({}, chosenVariant.clues[i]));
    }

    var herringClues = [];
    if (chosenVariant.herringClues) {
        for (var i = 0; i < chosenVariant.herringClues.length; i++) {
            herringClues.push(Object.assign({}, chosenVariant.herringClues[i]));
        }
    }

    var noiseClues = [];
    if (template.noiseClues) {
        for (var i = 0; i < template.noiseClues.length; i++) {
            noiseClues.push(Object.assign({}, template.noiseClues[i]));
        }
    }
    // 红鲱鱼也混入噪声池（对玩家来说它们看起来像正经线索但指向错误方向）
    noiseClues = DT_shuffle(noiseClues.concat(herringClues));

    // 4. 线索地点有限打乱：部分线索在2个候选地点中随机
    keyClues = _shuffleClueLocations(keyClues);

    // 5. 选取干扰事件（1-2个）
    var distCount = 1 + Math.floor(Math.random() * 2);
    var shuffledDist = DT_shuffle(DT_DISTURBANCES);
    var activeDisturbances = shuffledDist.slice(0, distCount);

    // 6. 计算初始AP
    var baseAP = 10;
    for (var i = 0; i < activeDisturbances.length; i++) {
        if (activeDisturbances[i].effect === 'lose_ap') {
            baseAP -= activeDisturbances[i].value;
        }
    }

    // 7. 构建嫌疑人列表
    var suspects = [];
    for (var i = 0; i < template.involvedSuspects.length; i++) {
        var sid = template.involvedSuspects[i];
        for (var j = 0; j < DT_SUSPECTS.length; j++) {
            if (DT_SUSPECTS[j].id === sid) {
                suspects.push(Object.assign({}, DT_SUSPECTS[j]));
                break;
            }
        }
    }

    // 8. 对话从选中变体中取（键不含 caseId 前缀）
    var dialogues = {};
    var dkeys = Object.keys(chosenVariant.dialogues);
    for (var i = 0; i < dkeys.length; i++) {
        dialogues[dkeys[i]] = chosenVariant.dialogues[dkeys[i]];
    }

    return {
        seed: Math.floor(Math.random() * 999999),
        template: template,
        culpritId: chosenVariant.culpritId,
        variantIndex: variantIdx,
        suspects: suspects,
        keyClues: keyClues,
        noiseClues: noiseClues,
        dialogues: dialogues,
        verdicts: chosenVariant.verdicts,
        disturbances: activeDisturbances,
        maxAP: baseAP,
        requiredProof: Object.assign({}, template.requiredProof)
    };
}

// ─── 线索地点有限打乱 ───
// 非矛盾类线索有几率在相邻地点间移动，增加每局差异
function _shuffleClueLocations(clues) {
    var adjacency = {
        gate:   ['side', 'vault'],
        vault:  ['gate', 'bridge', 'side'],
        bridge: ['vault', 'garden', 'tower'],
        study:  ['tower', 'hall'],
        hall:   ['study', 'garden'],
        garden: ['bridge', 'hall', 'side'],
        side:   ['gate', 'vault', 'garden'],
        tower:  ['bridge', 'study']
    };

    for (var i = 0; i < clues.length; i++) {
        var c = clues[i];
        // 矛盾线索不移动（它的位置是逻辑关键）
        if (c.type === 'contradiction') continue;
        // 30% 概率移动到相邻地点
        if (Math.random() < 0.3) {
            var neighbors = adjacency[c.locationId];
            if (neighbors && neighbors.length > 0) {
                c.locationId = neighbors[Math.floor(Math.random() * neighbors.length)];
            }
        }
    }
    return clues;
}

// ─── 检定函数（不变）───
function DT_performCheck(baseRate, skillBonus, pressure, distDebuff) {
    var rate = baseRate + skillBonus - (pressure * 5) - (distDebuff || 0);
    rate = Math.max(10, Math.min(95, rate));
    var roll = Math.floor(Math.random() * 100) + 1;
    return {
        success: roll <= rate,
        roll: roll,
        threshold: rate
    };
}

// ─── 判断证据链是否满足结案条件 ───
function DT_evaluateVerdict(collectedClues, caseInstance, accusedId, skillReduceActive) {
    var counts = { evidence: 0, testimony: 0, motive: 0, contradiction: 0 };
    for (var i = 0; i < collectedClues.length; i++) {
        var t = collectedClues[i].type;
        if (counts[t] !== undefined) counts[t]++;
    }

    var req = caseInstance.requiredProof;
    var minTotal = (req.evidence || 0) + (req.testimony || 0) + (req.motive || 0);
    if (skillReduceActive && minTotal > 3) minTotal--;

    var hasContradiction = counts.contradiction >= 1;
    var meetsEvidence = counts.evidence >= (req.evidence || 0);
    var meetsTestimony = counts.testimony >= (req.testimony || 0);
    var meetsMotive = counts.motive >= (req.motive || 0);

    var correctCulprit = (accusedId === caseInstance.culpritId);

    if (correctCulprit && meetsEvidence && meetsTestimony && meetsMotive && hasContradiction) {
        return 'truth';
    } else if (correctCulprit && (meetsEvidence || meetsTestimony) && meetsMotive) {
        return 'normal';
    } else {
        return 'wrong';
    }
}
