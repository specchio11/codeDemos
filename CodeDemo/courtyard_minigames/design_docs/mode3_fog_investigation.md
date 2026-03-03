# 小游戏模式 3：寻人罗盘 (Fog Investigation / Minesweeper Logic)

## 1. 游戏定位与核心玩法
- **类型**：逻辑推理消消乐、不吃剧本的探案盲盒、空间/条件解密（类似扫雷或推理桌游）。
- **目标设定**：系统随机将一名“逃犯”或“秘宝”藏在庭院的某个建筑内，庭院所有建筑被迷雾遮挡。玩家利用有限的“行动力 (AP)”搜索建筑，获取系统生成的“规则线索”（例如：犯人不在有水的地方、犯人距离此处2格），利用排除法找出正确位置。
- **局外关联点**：核心依靠角色的“洞察 (Insight) / 智力 (INT)”来降低翻牌（拿线索）的成本，或者依靠特定法宝直接掀开迷雾。适合喜欢反复动脑子的玩家。

## 2. 核心数据结构 (Data Models)

### 2.1 地图节点 (The Grid Objects)
这是最重要的数据结构。12 个固定节点，带有强类型的标签用于系统随机生成线索。

```json
{
  "node_id": "ND01",
  "name": "正厅",
  "tags": ["indoor", "north", "no_water", "center"],
  "neighbors": ["ND02", "ND04"], // 距离自己为 1 步的节点
  "is_target": false, // 本局真凶是否在这里
  "is_revealed": false // 是否已被玩家花费 AP 搜索过
}
```
**12 个节点设计蓝本：**
1. 正门 (ND_Gate) - `outdoor`, `south`, `no_water`, `edge`
2. 游廊 (ND_Corridor) - `outdoor`, `south`, `no_water`, `center`
3. 假山 (ND_Rockery) - `outdoor`, `north`, `no_water`, `edge`
4. 凉亭 (ND_Pavilion) - `outdoor`, `east`, `no_water`, `edge`
5. 水榭 (ND_Waterside) - `indoor`, `east`, `water`, `center`
6. 后院池塘 (ND_Pond) - `outdoor`, `north`, `water`, `edge`
7. 账房 (ND_Account) - `indoor`, `east`, `no_water`, `center`
8. 书房 (ND_Study) - `indoor`, `west`, `no_water`, `edge`
9. 卧室 (ND_Bedroom) - `indoor`, `north`, `no_water`, `center`
10. 客房 (ND_Guest) - `indoor`, `west`, `no_water`, `center`
11. 厨房 (ND_Kitchen) - `indoor`, `west`, `no_water`, `edge`
12. 柴房 (ND_Wood) - `indoor`, `south`, `no_water`, `edge`

### 2.2 玩家状态与养成加成
```json
{
  "ap_max": 20,
  "ap_current": 20,
  "base_search_cost_ap": 3,
  "arrest_cost_ap": 5, // 直接抓捕/指认的代价很高
  "clues_found": [],
  "hero_insight": 80 // 出战角色的“洞察”属性
}
```

### 2.3 线索生成器 (Clue Generator)
基于目标节点的 tag 或者相对位置。
例如：假设目标藏在 `ND_Account`，该节点有 tag `['indoor', 'east', 'no_water']`。
- 第一类线索（全图 tag）：返回目标包含的某一个 tag -> `"犯人藏在室内房间！"`
- 第二类线索（相对距离）：基于玩家当前搜查的节点起算图形距离 -> `"通过脚印看，他距离你现在所在的地方有两步之遥。"`
- 第三类线索（排除法）：返回一个目标不包含的 tag -> `"身上未沾水渍，说明他没去过有水的地方。"`

## 3. 游戏核心逻辑流 (Game Loop)

### [阶段一：开局与藏星]
1. `init_game()`: 在这 12 个节点中，选定一个数组随机 `index`，该节点设为 `is_target = true`。
2. 将所有节点状态 `is_revealed = false`。
3. 给玩家 `ap_current = 20`。UI 遮罩全图（覆盖黑雾或云朵特效）。

### [阶段二：搜查与检定 (Action: Search)]
1. 玩家点击任意未揭开的节点（例如：点击“厨房”），弹出两个按钮：【搜查 (-3 AP)】 和 【指认 (-5 AP)】。
2. 若玩家点击【搜查】：
   - `ap_current -= 3`
   - **数值检定 (Skill Check)**：`D100 对抗 hero_insight`。
     - 若 `D100 <= hero_insight`（成功）：搜寻顺利。
     - 若失败：该次搜查没底，或者多消耗 1 AP。
   - 搜查成功后，节点变亮 (`is_revealed = true`)。
3. **判定结果**：
   - 如果该节点就是 `is_target === true`：UI 提示玩家：“这就是目标所在！是否立刻指认？”
   - 如果不是：**生成线索**。调用线索生成器，从目前未暴露的线索池里，抓取出一条规则。
   - UI 面板右侧的记事本里，新增一条【线索：犯人不在“南侧”】。

### [阶段三：玩家推理打叉 (Player Deduction)]
1. 不需要程序做复杂推导，玩家自己看着“不在南边”这句话。
2. 玩家可以通过右键点击，在 UI 上给“正门”、“游廊”等自己看着觉得是南侧的建筑画一个大大的红“X”（记号笔功能防手残）。
3. 玩家继续消耗 AP 搜查下一个可能点。

### [阶段四：指认与结算 (Action: Arrest)]
1. 玩家结合 3 条线索，发现只有“账房”没被划掉。
2. 玩家点击“账房”，选择【指认 (-5 AP)】。
3. **游戏结果判定**：
   - 扣除 5 AP 后，如果 `is_target === true` -> 游戏胜利！
   - 如果 `is_target === false` -> 游戏惩罚！弹窗报错`“抓错人了！打草惊蛇，目标可能转移了！”`。游戏可以直接失败，或者让玩家再扣除高昂体力重试。
4. **胜利结算**：剩余 AP 越多，结算的积分与星级越高，反馈到局外的材料奖励越丰厚。

## 4. UI 与 Wording 清单
1. **顶栏参数**：
   - 标题：“奇门捉影：[当前可用行动力 AP]/20”
   - 当前角色：“上阵：[大捕头] (洞察：85)”
2. **节点交互悬浮窗**：
   - 点击迷雾节点：“此处乃[房间名]。\n 选项：[搜寻线索 (耗费3AP)] | [直接指认 (耗费5AP)]”
3. **线索记事本面板 (侧边栏)**：
   - “案情进度板：”
   - “[第1步：书房] 找到泥沙：犯人没有去过有水的地方。”
   - “[第2步：大门] 远处有声响：犯人距离此地恰好有2个区域。”
4. **结束界面**：
   - 胜利：“[特效] 手到擒来！你凭着蛛丝马迹揪出了罪犯。\n评价：⭐⭐⭐ \n剩余行动力：12”
   - 失败：“夜深人静，目标早已逃之夭夭...行动力耗尽。”