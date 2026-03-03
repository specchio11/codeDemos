# 小游戏模式 2：庭院大管家 (Crisis Dispatch / Worker Placement)

## 1. 游戏定位与核心玩法
- **类型**：回合制资源管理、多线程危机调度（Worker Placement）。
- **目标设定**：在一夜（通常为 5-10 个回合）的时间内，通过派遣玩家名下的所有 NPC 角色，处理庭院各处不断爆发的“危机事件”，保证庭院的“声望/稳定度”不归零，争取最高得分。
- **局外关联点**：极其考验玩家的“卡池深度”与“属性广度”。玩家需要上阵多名携带不同属性（力量、智力、敏捷、魅力）的 NPC。

## 2. 核心数据结构 (Data Models)

### 2.1 玩家状态数据
```json
{
  "turn_current": 1,
  "turn_max": 5,
  "mansion_health": 100, // 庭院稳定度，归零则游戏失败
  "score": 0,            // 结案得分，用于结算局外奖励
  "owned_npcs": []       // 本局上阵的卡牌池
}
```

### 2.2 NPC 角色数据 (卡牌)
```json
{
  "id": "npc_001",
  "name": "李护院",
  "rarity": "SR",
  "stats": {
    "STR": 80,  // 力量 (处理战斗、体力活)
    "INT": 20,  // 智力 (处理账目、解谜)
    "AGI": 50,  // 敏捷 (处理抓贼、火灾)
    "CHA": 30   // 魅力 (处理交涉、安抚)
  },
  "stamina": 100,        // 精力值，每次成功派遣消耗30，低于30不可派遣
  "assigned_zone": null  // 当前被派遣到的区域 ID
}
```

### 2.3 地图区域 (Zones) 划设
庭院分为 5 个逻辑大区，UI 上可做成可点击的高亮多边形或图标。
1. `zone_gate` (大门)：常发外交/交涉/冲门危机。
2. `zone_yard` (前院/练武场)：常发体力/火灾危机。
3. `zone_account` (账房)：常发智力/算账/失窃危机。
4. `zone_garden` (后花园)：常发寻物/幽会危机。
5. `zone_master` (正厅/主卧)：保护核心，此地危机惩罚极高。

### 2.4 危机事件池 (Crises DB)
系统每回合从卡池随机抽取生成。
```json
[
  {
    "id": "evt_001",
    "name": "醉汉闹事",
    "zone_tags": ["zone_gate", "zone_yard"],
    "desc_text": "有一群泼皮在门口砸门，需要人手驱逐或安抚。",
    "req_stat": "STR",  // 或者 "CHA"
    "req_value": 100,   // 需要派遣的 NPC 属性总和达到 100
    "timer_turns": 2,   // 倒计时，2回合内部解决则惩罚
    "reward_score": 50,
    "penalty_health": -20
  },
  {
    "id": "evt_002",
    "name": "账本失窃",
    "zone_tags": ["zone_account"],
    "desc_text": "存放密卷的柜子锁被破坏，必须马上审查账目找回失物。",
    "req_stat": "INT",
    "req_value": 120,
    "timer_turns": 1,
    "reward_score": 100,
    "penalty_health": -40
  }
]
```

## 3. 游戏核心逻辑流 (Game Loop)

### [阶段一：回合初始化 (Round Start)]
1. 检查 `turn_current <= turn_max` 且 `mansion_health > 0`，不满足则进入结算。
2. **生成危机**：根据当前回合数，随机在空闲的 Zone 生成 1~2 个危机。
   - UI 表现：在对应地图位置弹出红色的“！”叹号以及倒计时数字。
3. 所有 NPC 设置为闲置 (`assigned_zone = null`)，若 NPC `stamina < 100`，恢复 10 点。

### [阶段二：玩家派遣 (Player Assignment)]
1. 玩家点击深色底部卡槽中的 NPC，**拖拽（或点击选择位置）**到亮起红灯的区域 (Zone)。
2. 同一个区域内允许放置多名 NPC（例如放两个 `STR: 60` 的小兵，凑够 `120` 去解决 `100` 的需求）。
3. 玩家可随时撤回派遣，实时查看该区域的需求满足进度条 `(当前累计属性 / req_value)`。
4. 部署完毕后，点击界面右下角的【执行回合】按钮。

### [阶段三：结算与结算反馈 (Resolution)]
1. 遍历地图上所有存在的 Crisis（危机）：
2. **是否被解决**：
   - 获取该危机所在 Zone 中所有 NPC 对应的 `req_stat` 值进行加总。
   - `if (总和 >= req_value)`：
     - **危机解除**：播放特效，播报文案 `"[危机名称]已被成功化解！获得 [reward_score] 评价！"`
     - 该区域所有参与的 NPC 扣除 30 点 `stamina`。
     - 删除该危机，`score += reward_score`。
   - `else if (总和 > 0 但是 < req_value)`：
     - **解决失败**：因为派了人但没搞定，NPC 白费力气。
     - 该区域参与的 NPC 扣除 15 点 `stamina`。
     - 危机未删除，按放任规则处理（见下一步）。
3. **倒计时衰减**：
   - 未被解决的 Crisis 的 `timer_turns -= 1`。
   - `if (timer_turns == 0)`：
     - **危机爆发**：播报文案 `"[危机名称]未能及时处理，庭院受到损失！"`
     - 删除该危机，`mansion_health += penalty_health`。
4. `turn_current += 1`，重复进入阶段一。

## 4. UI 与 Wording 清单
1. **顶栏**：
   - 标题：“夜巡庭院：第 [X]/[Y] 更天”
   - 状态：“声望：[mansion_health]/100 ❤️” | “得分：[score] ⭐”
2. **卡槽与悬浮窗**：
   - 悬浮在 NPC 首发：`“[名字] - [职业]\n力:[STR] 智:[INT] 敏:[AGI] 魅:[CHA]\n精力:[stamina]”`
3. **危机详情窗**：
   - 悬浮事件节点：`“紧急！[危机名称]\n要求：[req_stat_中文]需达到 [req_value]\n倒计时：[timer_turns] 刻钟\n失败惩罚：声望 [penalty_health]”`
4. **结束界面**：
   - 胜利：`“天明破晓。庭院安然无恙，你统筹有方。\n总得分：[score]”`然后发放局外对应奖励。
   - 失败：`“局势失控了！声望跌破底线，大伙不欢而散...”`