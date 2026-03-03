// ============================================================
// DB_cases.js — 组合式案件数据（真凶随机版）
// 每个模板包含3个真凶变体，每局随机选取其一
// 函数文件夹：只放常量，零运行时状态
// ============================================================

// ─── 地点定义（不变）───
var DT_LOCATIONS = Object.freeze([
    { id: 'gate',    name: '前院门房', desc: '出入必经之所，登记簿与灯笼整齐排列。',   x: 0.13, y: 0.82, icon: '🚪' },
    { id: 'vault',   name: '偏库',     desc: '存放账册与贵重物品的厢房，门锁精巧。',   x: 0.28, y: 0.55, icon: '🔒' },
    { id: 'bridge',  name: '池畔廊桥', desc: '横跨碧池的曲桥，夜间幽寂，常有足迹。',   x: 0.38, y: 0.35, icon: '🌉' },
    { id: 'study',   name: '账房书案', desc: '堆满册卷的长案，烛泪凝了一层又一层。',   x: 0.72, y: 0.28, icon: '📖' },
    { id: 'hall',    name: '后堂茶室', desc: '待客议事之地，茶香与秘密同在。',         x: 0.82, y: 0.52, icon: '🍵' },
    { id: 'garden',  name: '花圃假山', desc: '假山嶙峋，藤萝掩映，隐蔽处甚多。',       x: 0.55, y: 0.72, icon: '🌿' },
    { id: 'side',    name: '侧门小径', desc: '仅供杂役通行的窄道，少有灯火。',         x: 0.15, y: 0.35, icon: '🚶' },
    { id: 'tower',   name: '钟漏阁',   desc: '记录时辰的更漏器械，滴滴作响。',         x: 0.60, y: 0.15, icon: '⏳' }
]);

// ─── 嫌疑人原型（不变）───
var DT_SUSPECTS = Object.freeze([
    { id: 'accountant', name: '账房许慎', title: '万宝阁账房先生',   portrait: '🧮', desc: '精于算计，手不离册，眼神闪烁。'   },
    { id: 'guard',      name: '护院罗川', title: '万宝阁护院统领',   portrait: '⚔️', desc: '魁梧武人，口供直来直去，但记性不太好。' },
    { id: 'visitor',    name: '青衫客',   title: '神秘夜访者',       portrait: '🎭', desc: '来历不明，自称路过借宿，行止可疑。' },
    { id: 'gardener',   name: '花匠阿禾', title: '庭院杂役',         portrait: '🌱', desc: '老实巴交的花匠，常在夜间浇花施肥。' },
    { id: 'steward',    name: '库管韩嫂', title: '南库管事',         portrait: '🔑', desc: '精明能干，钥匙从不离身，但最近常叹气。' },
    { id: 'musician',   name: '琴师柳七', title: '宴席乐师',         portrait: '🎵', desc: '清瘦文人，与人多有债务往来。' }
]);

// ═══════════════════════════════════════════════════════════════
//  案件模板（3个模板 × 每模板3个真凶变体 = 9种逻辑链）
// ═══════════════════════════════════════════════════════════════

var DT_CASE_TEMPLATES = Object.freeze([

    // ──────────────────────────────────────────
    //  C001：云津渡·失窃账册
    // ──────────────────────────────────────────
    {
        id: 'C001',
        name: '云津渡·失窃账册',
        type: '盗窃',
        icon: '📜',
        openingNarrator: '子时将尽，万宝阁偏库门锁完好，却独失"分红总账"。',
        openingSteward:  '账册若落入外人之手，三家商会明日就会翻脸。阁主，此事拜托了。',
        openingPlayer:   '今夜封院，逐一查人。谁在说谎，天亮前见分晓。',
        involvedSuspects: ['accountant', 'guard', 'visitor', 'gardener'],
        requiredProof: { evidence: 2, testimony: 1, motive: 1 },

        noiseClues: [
            { id: 'c1_noise1', type: 'noise', text: '花圃发现一柄生锈小刀，与案件无关。',       locationId: 'garden', reliability: 0 },
            { id: 'c1_noise2', type: 'noise', text: '后堂茶桌下有封未寄出的情书，不知是谁写的。', locationId: 'hall',   reliability: 0 }
        ],

        culpritVariants: [
            // ===== 变体A：许慎（账房）是真凶 =====
            // 动机：赌债缠身，篡改账册掩盖挪用
            {
                culpritId: 'accountant',
                clues: [
                    { id: 'c1a_wax',       type: 'evidence',      text: '偏库锁孔内残留蜡痕，有人曾用蜡模复制钥匙。',                         locationId: 'vault',  reliability: 0.95 },
                    { id: 'c1a_ink',        type: 'evidence',      text: '书案上发现新墨覆盖旧字痕迹，有人篡改过账目。',                       locationId: 'study',  reliability: 0.85 },
                    { id: 'c1a_test_guard', type: 'testimony',     text: '罗川称：二更时分看见许慎提灯过桥，往偏库方向走。',                   locationId: 'bridge', reliability: 0.8,  npcId: 'guard' },
                    { id: 'c1a_test_flower',type: 'testimony',     text: '阿禾称：闻到松烟墨混着药油味，从书案方向飘来。',                     locationId: 'garden', reliability: 0.75, npcId: 'gardener' },
                    { id: 'c1a_motive',     type: 'motive',        text: '许慎最近在外欠了赌债，正好对得上账册缺页的金额。',                   locationId: 'hall',   reliability: 0.9,  npcId: 'accountant' },
                    { id: 'c1a_contra',     type: 'contradiction', text: '许慎称整夜未离书案，但池畔湿鞋印只有去程没有返程——他走的侧门回来。', locationId: 'bridge', reliability: 1.0 }
                ],
                herringClues: [
                    { id: 'c1a_herr1', type: 'motive', text: '青衫客承认受雇来取账册，但声称到偏库时门已开、册子已不在。', locationId: 'hall', reliability: 0.5, npcId: 'visitor' }
                ],
                dialogues: {
                    'accountant_ask':    { speaker: '许慎', text: '我整夜都在书案誊抄新册，哪有功夫去偏库？你瞧，这墨迹还没干透呢。' },
                    'accountant_press':  { speaker: '许慎', text: '……你什么意思？我改什么账了？那是誊写时的笔误，改了很正常！' },
                    'accountant_confront':{ speaker: '许慎', text: '（额角冒汗）……这鞋印……我、我是去解手路过的，并非……' },
                    'guard_ask':         { speaker: '罗川', text: '二更巡完我就在前院歇着了。不过我看见许先生提灯过桥，往偏库那边去。', yieldsClueId: 'c1a_test_guard' },
                    'guard_press':       { speaker: '罗川', text: '千真万确！那灯笼是账房专用的青纱灯，我不会认错。' },
                    'visitor_ask':       { speaker: '青衫客', text: '在下不过路过借宿，对你们阁中事务一无所知。' },
                    'visitor_press':     { speaker: '青衫客', text: '（叹气）……好吧。确实有人雇我来拿账册，但我到偏库时门已经开了，册子已经不在了。', yieldsClueId: 'c1a_herr1' },
                    'gardener_ask':      { speaker: '阿禾', text: '我就在花圃浇水，听到偏库那边有响动。后来闻到一股松烟墨掺药油的味道。', yieldsClueId: 'c1a_test_flower' },
                    'gardener_press':    { speaker: '阿禾', text: '味道嘛……是从书案那个方向飘过来的，我鼻子灵，不会错。' }
                },
                verdicts: {
                    truth: {
                        title: '真相大白',
                        text: '你将湿鞋印与改墨笔迹并列——"你不是偷账，你是在改账。"\n许慎沉默片刻，缓缓跪地。\n\n赌债是因，改账是果，侧门回来以为天衣无缝——可惜没算到池畔的泥地。'
                    },
                    normal: {
                        title: '草草结案',
                        text: '你认出许慎就是监守自盗之人，但缺少铁证将他逼到无路可退。\n账册追回、许慎领了罚，可那些赌债的底细始终没能查清。\n管事叹道："差一步就能把前因后果都翻出来。"'
                    },
                    wrong: {
                        title: '误判冤案',
                        text: '你指认了错误的人。三日后账目再乱，真凶逍遥法外。\n管事叹道："阁主，下次可得看仔细了。"'
                    }
                }
            },

            // ===== 变体B：罗川（护院）是真凶 =====
            // 动机：受外商贿赂，偷册卖路线情报
            {
                culpritId: 'guard',
                clues: [
                    { id: 'c1b_patrol',     type: 'evidence',      text: '巡夜记录有涂改痕迹——二更值班签名笔迹生硬，像是事后补签。',         locationId: 'tower',  reliability: 0.9 },
                    { id: 'c1b_merchant',   type: 'evidence',      text: '偏库角落夹层中发现外商暗记碎纸，与罗川私通外商的凭证。',           locationId: 'vault',  reliability: 0.85 },
                    { id: 'c1b_test_acct',  type: 'testimony',     text: '许慎称：半夜听见偏库方向有人开锁，脚步沉重，不像女子。',           locationId: 'study',  reliability: 0.8,  npcId: 'accountant' },
                    { id: 'c1b_test_visit', type: 'testimony',     text: '青衫客称：借宿时见到一个魁梧身影从侧门方向走过，步伐匆忙。',       locationId: 'hall',   reliability: 0.75, npcId: 'visitor' },
                    { id: 'c1b_motive',     type: 'motive',        text: '罗川私下与外商往来已久，对方要的正是分红总账上的商路信息。',         locationId: 'gate',   reliability: 0.9,  npcId: 'guard' },
                    { id: 'c1b_contra',     type: 'contradiction', text: '罗川称二更巡过偏库，但门房签到簿该时段无他记录——他故意绕过了登记。', locationId: 'gate',  reliability: 1.0 }
                ],
                herringClues: [
                    { id: 'c1b_herr1', type: 'motive', text: '许慎近日常叹气，手边有几张算不清的旧账。', locationId: 'study', reliability: 0.4, npcId: 'accountant' }
                ],
                dialogues: {
                    'guard_ask':         { speaker: '罗川', text: '我二更巡完一圈就在前院打盹了，什么都没看到。偏库？我路过时没问题啊。' },
                    'guard_press':       { speaker: '罗川', text: '门房签到簿？那个……我有时忘签，不代表没巡过！你别乱扣帽子。' },
                    'guard_confront':    { speaker: '罗川', text: '（攥拳发抖）……那个外商给的太多了……我只是想挣一笔就收手……' },
                    'accountant_ask':    { speaker: '许慎', text: '我整夜在书案干活，半夜倒是听见偏库方向有人开锁，脚步很重。', yieldsClueId: 'c1b_test_acct' },
                    'accountant_press':  { speaker: '许慎', text: '脚步声？很沉，像是罗川那种体格的人。不过我没出去看。' },
                    'visitor_ask':       { speaker: '青衫客', text: '在下借宿而已。不过夜里确实见到一个高大身影从侧门匆匆过去。', yieldsClueId: 'c1b_test_visit' },
                    'visitor_press':     { speaker: '青衫客', text: '那人走路步子很大，像是习武之人。往偏库方向去的。' },
                    'gardener_ask':      { speaker: '阿禾', text: '我就在花圃干活，倒没特别注意到什么。就是觉得罗统领今夜似乎一直没来巡花圃这边。' }
                },
                verdicts: {
                    truth: {
                        title: '真相大白',
                        text: '"你说你二更巡过偏库，门房签到簿却无你记录。外商的暗记纸就藏在你巡夜的路线上。"\n罗川浑身一颤，单膝跪地。\n\n监守自盗，里应外合——好一出灯下黑。'
                    },
                    normal: {
                        title: '草草结案',
                        text: '你认定罗川嫌疑最大，管事也被说服将他收押。但缺少致命矛盾，罗川死咬不认。\n最终以"渎职失察"论处，那张外商暗记碎纸的来历始终无人能解释清楚。'
                    },
                    wrong: {
                        title: '误判冤案',
                        text: '你指认了错误的人。一月后又有账册差项，这次连运货路线都泄露了。\n管事苦笑："真凶可还在院里呢。"'
                    }
                }
            },

            // ===== 变体C：青衫客（外来者）是真凶 =====
            // 动机：受竞争商会雇佣，专为分红总账而来
            {
                culpritId: 'visitor',
                clues: [
                    { id: 'c1c_latch',      type: 'evidence',      text: '侧门窗栓从外侧被撬，痕迹是外来工具所留，非阁中器物。',             locationId: 'side',   reliability: 0.9 },
                    { id: 'c1c_camphor',    type: 'evidence',      text: '偏库地面发现不属于阁中人的泥足印，鞋纹与青衫客靴底吻合。',           locationId: 'vault',  reliability: 0.85 },
                    { id: 'c1c_test_flower',type: 'testimony',     text: '阿禾称：夜间闻到一股陌生的外来香料味，从偏库方向飘来。',             locationId: 'garden', reliability: 0.8,  npcId: 'gardener' },
                    { id: 'c1c_test_guard', type: 'testimony',     text: '罗川巡夜时发现侧门虚掩，锁舌歪了——平日是从内侧拴死的。',             locationId: 'gate',   reliability: 0.75, npcId: 'guard' },
                    { id: 'c1c_motive',     type: 'motive',        text: '青衫客实为竞争商会派来的暗探，专为窃取分红总账中的商路信息。',         locationId: 'hall',   reliability: 0.9,  npcId: 'visitor' },
                    { id: 'c1c_contra',     type: 'contradiction', text: '青衫客称整夜未离后堂，但其靴底沾有偏库独有的樟脑防虫粉——他去过偏库。', locationId: 'hall',  reliability: 1.0 }
                ],
                herringClues: [
                    { id: 'c1c_herr1', type: 'motive', text: '许慎近来在外欠债，手边有几张还不清的旧账。', locationId: 'study', reliability: 0.4, npcId: 'accountant' }
                ],
                dialogues: {
                    'visitor_ask':       { speaker: '青衫客', text: '在下不过路过借宿，对你们阁中买卖一无所知。后堂喝茶等天亮罢了。' },
                    'visitor_press':     { speaker: '青衫客', text: '樟脑粉？许是路过花圃时蹭上的吧……这种东西到处都有。' },
                    'visitor_confront':  { speaker: '青衫客', text: '（冷笑后叹气）……罢了。是对家商会出的价，在下不过替人办事。' },
                    'guard_ask':         { speaker: '罗川', text: '我巡到侧门时，发现门栓居然是松的。平日这门都从里面拴死，不可能从外面开。', yieldsClueId: 'c1c_test_guard' },
                    'guard_press':       { speaker: '罗川', text: '侧门外有撬痕，不是阁中的工具干的——手法很专业。' },
                    'accountant_ask':    { speaker: '许慎', text: '我整夜都在书案，跟账册失窃没有半点关系。你去查那个借宿的外人吧。' },
                    'gardener_ask':      { speaker: '阿禾', text: '夜里偏库那边飘来一股味道，不是咱们院里的东西，像是外地人身上带的香料。', yieldsClueId: 'c1c_test_flower' },
                    'gardener_press':    { speaker: '阿禾', text: '那味道我后来又闻到过——就是那个穿青衫的客人经过花圃时，一模一样。' }
                },
                verdicts: {
                    truth: {
                        title: '真相大白',
                        text: '"你说整夜未离后堂，那靴底的樟脑粉怎么解释？全院只有偏库才存这东西。"\n青衫客苦笑一声，不再辩解。\n\n借宿是假，窃册是真——对家的手段倒也不算高明。'
                    },
                    normal: {
                        title: '草草结案',
                        text: '你将青衫客交给管事看押，证据有指向但差了那一锤定音的矛盾。\n次日天未亮，此人越墙逃走，账册下落不明。\n"可惜，差一步就能当场揭穿。"'
                    },
                    wrong: {
                        title: '误判冤案',
                        text: '你指认了院中自己人。那个"借宿客"在天亮前从容离去，账册随他消失。\n三天后对家商会抛出了你们的运货路线——一切都迟了。'
                    }
                }
            }
        ]
    },

    // ──────────────────────────────────────────
    //  C002：春宴池畔·坠亡疑云
    // ──────────────────────────────────────────
    {
        id: 'C002',
        name: '春宴池畔·坠亡疑云',
        type: '伤亡',
        icon: '💀',
        openingNarrator: '宴散灯残，一名乐师倒伏池阶，额角伤重，已无气息。',
        openingSteward:  '众人都说是争执失手，可谁都不肯先开口。这案子，水很深。',
        openingPlayer:   '从时辰查起。死人不会说谎，钟漏会。',
        involvedSuspects: ['guard', 'visitor', 'gardener', 'musician'],
        requiredProof: { evidence: 1, testimony: 2, motive: 1 },

        noiseClues: [
            { id: 'c2_noise1', type: 'noise', text: '池边倒扣一只酒杯，里面只有普通的菊花茶。', locationId: 'bridge', reliability: 0 },
            { id: 'c2_noise2', type: 'noise', text: '钟漏阁墙角有几张算卦签纸，年代久远。',     locationId: 'tower',  reliability: 0 }
        ],

        culpritVariants: [
            // ===== 变体A：罗川（护院）是真凶 =====
            // 动机：死者催债太紧，争执中失手
            {
                culpritId: 'guard',
                clues: [
                    { id: 'c2a_wound',      type: 'evidence',      text: '死者后脑有钝击伤加滑落擦痕，非单纯失足所致。',                       locationId: 'bridge', reliability: 0.95 },
                    { id: 'c2a_button',     type: 'evidence',      text: '池阶裂缝中嵌着一枚袖扣，花纹为巡夜执事制服专属。',                   locationId: 'bridge', reliability: 0.9 },
                    { id: 'c2a_test_visit', type: 'testimony',     text: '酒侍称：二更末收杯盏时，隐约见两人在池畔争吵，声音很大。',           locationId: 'hall',   reliability: 0.75, npcId: 'visitor' },
                    { id: 'c2a_test_doc',   type: 'testimony',     text: '客卿医者判断死亡时辰更接近三更初，与争吵时点差了至少半个时辰。',     locationId: 'tower',  reliability: 0.85, npcId: 'gardener' },
                    { id: 'c2a_motive',     type: 'motive',        text: '死者曾多次催罗川还钱，数目不小，双方积怨已久。',                     locationId: 'study',  reliability: 0.85, npcId: 'guard' },
                    { id: 'c2a_contra',     type: 'contradiction', text: '罗川称二更末已离开池畔，但钟漏记录他三更初仍在附近——时辰对不上。',   locationId: 'tower',  reliability: 1.0 }
                ],
                herringClues: [
                    { id: 'c2a_herr1', type: 'motive', text: '柳七与死者有旧债纠葛，宴间曾低声争论。', locationId: 'hall', reliability: 0.4, npcId: 'musician' }
                ],
                dialogues: {
                    'guard_ask':         { speaker: '罗川', text: '我二更敲完更就去歇了，什么都没看到。池边那事儿是后来才听说的。' },
                    'guard_press':       { speaker: '罗川', text: '我说的是实话！二更过后我就没去过池畔，你查钟漏……呃，钟漏上怎么写的？' },
                    'guard_confront':    { speaker: '罗川', text: '（沉默良久）……他逼我还钱，越逼越紧。那晚……是他先动手的，我只是……推了一把。' },
                    'visitor_ask':       { speaker: '酒侍', text: '二更末我收完杯盏往回走，隐约听到池边有两人说话，声音很大。但灯太暗看不清脸。', yieldsClueId: 'c2a_test_visit' },
                    'gardener_ask':      { speaker: '客卿医者', text: '据我诊断，死亡时辰应在三更初。这与他人所说的二更末争吵时点差了至少半个时辰。', yieldsClueId: 'c2a_test_doc' },
                    'musician_ask':      { speaker: '柳七', text: '我和他虽有旧债，但宴后我一直在收拾琴具……我可以发誓。', yieldsClueId: 'c2a_herr1' },
                    'musician_press':    { speaker: '柳七', text: '那点旧债算什么？他欠罗川的才叫多呢。你该去问问罗统领。' }
                },
                verdicts: {
                    truth: {
                        title: '真相大白',
                        text: '"你说二更末离席，那为何钟漏写着你三更还在池边？"\n罗川浑身一震，再无法辩驳。\n\n催债催出了命案——一推之下，万劫不复。'
                    },
                    normal: {
                        title: '疑案悬置',
                        text: '你认定罗川有重大嫌疑，但缺少关键矛盾，无法让他当场认罪。\n案件以"争执意外"草草结案，罗川被调离护院之职。\n但你心里清楚——那半个时辰的空白，他至今说不清。'
                    },
                    wrong: {
                        title: '误判冤案',
                        text: '你指认了错误的人。死者家属悲愤离去。\n半月后有人在院墙上写下"冤"字，此案成了万宝阁的一根刺。'
                    }
                }
            },

            // ===== 变体B：柳七（琴师）是真凶 =====
            // 动机：死者要向阁主揭发柳七巨额赌债
            {
                culpritId: 'musician',
                clues: [
                    { id: 'c2b_string',     type: 'evidence',      text: '死者颈侧有一道细线状瘀痕，非拳脚可致——像是被琴弦一类细线勒过。',     locationId: 'bridge', reliability: 0.9 },
                    { id: 'c2b_rosin',      type: 'evidence',      text: '池畔栏杆上残留松香指痕——这只有长期弹琴之人手上才有。',               locationId: 'bridge', reliability: 0.85 },
                    { id: 'c2b_test_guard', type: 'testimony',     text: '罗川称：三更巡经池畔时闻到松香味，当时觉得奇怪但没在意。',           locationId: 'gate',   reliability: 0.8,  npcId: 'guard' },
                    { id: 'c2b_test_doc',   type: 'testimony',     text: '客卿医者称：伤口边缘有细线状瘀痕，与琴弦直径高度吻合。',             locationId: 'tower',  reliability: 0.85, npcId: 'gardener' },
                    { id: 'c2b_motive',     type: 'motive',        text: '死者多次威胁要向阁主告发柳七的巨额赌债，柳七急于封口。',             locationId: 'study',  reliability: 0.9,  npcId: 'musician' },
                    { id: 'c2b_contra',     type: 'contradiction', text: '柳七称宴后一直在收拾琴具，但从者称琴箱子时已锁好——他撒了谎。',       locationId: 'hall',   reliability: 1.0 }
                ],
                herringClues: [
                    { id: 'c2b_herr1', type: 'motive', text: '罗川欠死者不少钱，宴前二人有过口角。', locationId: 'gate', reliability: 0.4, npcId: 'guard' }
                ],
                dialogues: {
                    'musician_ask':      { speaker: '柳七', text: '宴后我一直在收拾琴具，到二更半才歇下。池畔？我没去过。' },
                    'musician_press':    { speaker: '柳七', text: '琴箱？那个……从者可能记错了，我后来又打开擦了擦弦。' },
                    'musician_confront': { speaker: '柳七', text: '（面如死灰）……他说要告发我……我只是想吓唬他……没想到……' },
                    'guard_ask':         { speaker: '罗川', text: '三更巡到池边时，闻到一股松香味。当时没多想，现在想起来确实反常。', yieldsClueId: 'c2b_test_guard' },
                    'guard_press':       { speaker: '罗川', text: '我跟死者是有旧债，但宴后各走各的。我没去池边找他。', yieldsClueId: 'c2b_herr1' },
                    'visitor_ask':       { speaker: '酒侍', text: '二更末看到柳七往池畔方向走，手里提着琴囊。我以为他要练曲子。' },
                    'gardener_ask':      { speaker: '客卿医者', text: '伤口边缘有极细的线状瘀痕，直径约一毫——与琴弦粗细高度吻合。', yieldsClueId: 'c2b_test_doc' }
                },
                verdicts: {
                    truth: {
                        title: '真相大白',
                        text: '"你说宴后一直在收拾琴具，从者却说琴箱子时已锁好。池畔栏杆上的松香指痕——谁的手会有松香？"\n柳七抬手看了看自己的指尖，不再说话。\n\n赌债逼人，杀人灭口——一根琴弦，断送两条路。'
                    },
                    normal: {
                        title: '疑案悬置',
                        text: '证据有指向但不够铁，柳七坚不承认，案件以"意外坠亡"结案。\n但你注意到他从此再不弹那把琴了。'
                    },
                    wrong: {
                        title: '误判冤案',
                        text: '你抓错了人。柳七在混乱中悄悄处理了那根染血的琴弦。\n从此池畔夜夜有琴声，院中人却无人敢去听。'
                    }
                }
            },

            // ===== 变体C：青衫客（外来者）是真凶 =====
            // 动机：死者认出其真实身份，威胁揭发
            {
                culpritId: 'visitor',
                clues: [
                    { id: 'c2c_fabric',     type: 'evidence',      text: '死者手中紧攥一片青色衣角碎片，布料质地非本地所产。',                   locationId: 'bridge', reliability: 0.9 },
                    { id: 'c2c_incense',    type: 'evidence',      text: '池畔石阶有外来沉香残留——这味道只有青衫客身上有。',                     locationId: 'garden', reliability: 0.85 },
                    { id: 'c2c_test_guard', type: 'testimony',     text: '罗川称：二更末看见青衫客从后堂往池畔方向走去，步伐很快。',             locationId: 'gate',   reliability: 0.8,  npcId: 'guard' },
                    { id: 'c2c_test_doc',   type: 'testimony',     text: '客卿医者判断致命伤来自身后突袭，死者毫无防备。',                       locationId: 'tower',  reliability: 0.85, npcId: 'gardener' },
                    { id: 'c2c_motive',     type: 'motive',        text: '死者酒后曾对旁人说"那个青衫的不是过路客"——他认出了什么。',             locationId: 'hall',   reliability: 0.9,  npcId: 'visitor' },
                    { id: 'c2c_contra',     type: 'contradiction', text: '青衫客称宴后即回房休息，但茶房丫鬟证实他房间至四更都无人——他在外面。', locationId: 'hall',   reliability: 1.0 }
                ],
                herringClues: [
                    { id: 'c2c_herr1', type: 'motive', text: '柳七与死者有金钱纠葛，席间似有不和。', locationId: 'study', reliability: 0.4, npcId: 'musician' }
                ],
                dialogues: {
                    'visitor_ask':       { speaker: '青衫客', text: '宴后我便回房歇息了，什么也不知道。你们院里的事，与我这过路人无关。' },
                    'visitor_press':     { speaker: '青衫客', text: '死者说了什么？他喝多了胡言乱语，不能当真。我就是个路过借宿的。' },
                    'visitor_confront':  { speaker: '青衫客', text: '（冷笑渐变为沉默）……他认出我了。若让他说出去，死的就是我。' },
                    'guard_ask':         { speaker: '罗川', text: '二更末我看到那个穿青衫的客人从后堂出来，步子很快，往池畔方向去了。', yieldsClueId: 'c2c_test_guard' },
                    'guard_press':       { speaker: '罗川', text: '我本来想喊他，但他走太快。后来就听说池边出事了。' },
                    'musician_ask':      { speaker: '柳七', text: '我跟死者确实有钱债，但仅此而已。宴后我就在房里歇着了。', yieldsClueId: 'c2c_herr1' },
                    'gardener_ask':      { speaker: '客卿医者', text: '致命伤来自身后——死者毫无防备。凶手是背后偷袭，不是正面争执。', yieldsClueId: 'c2c_test_doc' }
                },
                verdicts: {
                    truth: {
                        title: '真相大白',
                        text: '"你说宴后便回了房，可茶房丫鬟证实你的房间至四更都是空的。死者手里攥着的青色衣角——还要我继续说吗？"\n青衫客闭上眼睛，不再辩解。\n\n身份被识破，杀人灭口——这位"过路客"，路可走到头了。'
                    },
                    normal: {
                        title: '疑案悬置',
                        text: '你怀疑青衫客，但铁证不足，只能将其暂押。此人口风极紧，始终不吐真言。\n案件以"意外身亡"了结，但那片青色碎布，你一直留着。'
                    },
                    wrong: {
                        title: '误判冤案',
                        text: '你指认了错误的人。青衫客趁乱连夜翻墙离去，从此杳无音信。\n死者至死手里攥着的那片衣角碎片，成了永远的孤证。'
                    }
                }
            }
        ]
    },

    // ──────────────────────────────────────────
    //  C003：南库火起·谁在嫁祸
    // ──────────────────────────────────────────
    {
        id: 'C003',
        name: '南库火起·谁在嫁祸',
        type: '纵火',
        icon: '🔥',
        openingNarrator: '寅时风急，南库先冒白烟后起明火，幸及时压住，但账目尽毁。',
        openingSteward:  '有人指认是外门弟子周九点的火。但周九喊冤，说被人栽赃。',
        openingPlayer:   '先别急着抓人。火会走路，谎也会。',
        involvedSuspects: ['steward', 'guard', 'gardener', 'musician'],
        requiredProof: { evidence: 2, testimony: 1, motive: 1 },

        noiseClues: [
            { id: 'c3_noise1', type: 'noise', text: '花圃角落有一双泥泞旧鞋，是花匠换下的。',     locationId: 'garden', reliability: 0 },
            { id: 'c3_noise2', type: 'noise', text: '后堂发现一张欠条，字迹模糊，看不清是谁的。', locationId: 'hall',   reliability: 0 }
        ],

        culpritVariants: [
            // ===== 变体A：韩嫂（库管）是真凶 =====
            // 动机：挪用库银填补家用，纵火毁账掩盖亏空
            {
                culpritId: 'steward',
                clues: [
                    { id: 'c3a_origin',     type: 'evidence',      text: '起火点在内侧货架底部，外部无破窗，系内部纵火。',                       locationId: 'vault',  reliability: 0.95 },
                    { id: 'c3a_oil',        type: 'evidence',      text: '油料间缺了半瓶引火油，登记簿上签名笔迹异常——像是模仿周九的字。',       locationId: 'side',   reliability: 0.9 },
                    { id: 'c3a_test_flower',type: 'testimony',     text: '阿禾称：寅时出来浇花，看见韩嫂从外墙小径快步走过，手里提着什么。',     locationId: 'garden', reliability: 0.8,  npcId: 'gardener' },
                    { id: 'c3a_test_guard', type: 'testimony',     text: '偏门岗登记写得清楚：周九案发时在北院搬货，有三人作证。',               locationId: 'gate',   reliability: 0.9,  npcId: 'guard' },
                    { id: 'c3a_motive',     type: 'motive',        text: '韩嫂私下挪用库银填补家用，纵火毁账是为了掩盖越来越大的亏空。',         locationId: 'study',  reliability: 0.9,  npcId: 'steward' },
                    { id: 'c3a_contra',     type: 'contradiction', text: '韩嫂称钥匙未离身且整夜未出屋，但油滴路线与她鞋底花纹吻合——路线矛盾。', locationId: 'side',  reliability: 1.0 }
                ],
                herringClues: [
                    { id: 'c3a_herr1', type: 'motive', text: '柳七欠外人的钱不少，账册里有他的借据。', locationId: 'hall', reliability: 0.3, npcId: 'musician' }
                ],
                dialogues: {
                    'steward_ask':       { speaker: '韩嫂', text: '我子时就回屋歇了，钥匙一直在我身上。周九那小子平日就不老实，这次肯定是他！' },
                    'steward_press':     { speaker: '韩嫂', text: '什么油滴？我不知道你在说什么！我那天穿的是布底鞋，哪来什么花纹？' },
                    'steward_confront':  { speaker: '韩嫂', text: '（瘫坐在地）……挪了库银补家用，越补越多……只想把账本烧了，没想过害人……' },
                    'guard_ask':         { speaker: '罗川', text: '偏门岗的记录清楚得很，周九那会儿在北院搬货，三个人看着呢。他不可能纵火。', yieldsClueId: 'c3a_test_guard' },
                    'gardener_ask':      { speaker: '阿禾', text: '寅时我出来浇花，正好看见韩嫂从外墙小径快步走过，手里好像提着什么东西。', yieldsClueId: 'c3a_test_flower' },
                    'gardener_press':    { speaker: '阿禾', text: '那东西像个油壶，不大，韩嫂走得很急。我当时也没多想。' },
                    'musician_ask':      { speaker: '柳七', text: '我那天根本不在院里，我在城西喝酒……那张欠条跟我没关系！', yieldsClueId: 'c3a_herr1' }
                },
                verdicts: {
                    truth: {
                        title: '真相大白',
                        text: '油滴路线直指韩嫂，而她"未出屋"的说辞与鞋底花纹彻底矛盾。\n"为填亏空纵火毁账，再嫁祸他人——好手段。"\n\n韩嫂伏地痛哭。一切因贪念而起。'
                    },
                    normal: {
                        title: '表面了结',
                        text: '周九被释放，你认准韩嫂就是纵火者，但缺少令她无法辩驳的矛盾。\n韩嫂被暂停管事之职，但以"证据不足"为由未被定罪。\n那瓶少了半数的引火油，至今没有合理的解释。'
                    },
                    wrong: {
                        title: '误判冤案',
                        text: '你听信了指认，周九含冤受罚。一月后南库再次失火，这次烧的不只是账本了。\n管事沉声道："当初就该查得更细。"'
                    }
                }
            },

            // ===== 变体B：罗川（护院）是真凶 =====
            // 动机：克扣巡夜经费，帐内有记录，审计在即需毁灭证据
            {
                culpritId: 'guard',
                clues: [
                    { id: 'c3b_torch',      type: 'evidence',      text: '火点引燃物是巡夜专用火折子的残片——非普通油灯可比。',                   locationId: 'vault',  reliability: 0.9 },
                    { id: 'c3b_soot',       type: 'evidence',      text: '罗川靴底有库房独有的炭灰痕迹，颜色与纵火残留一致。',                   locationId: 'gate',   reliability: 0.85 },
                    { id: 'c3b_test_flower',type: 'testimony',     text: '阿禾称：寅时见一高大身影从侧门方向经过，绝不是韩嫂的身形。',           locationId: 'garden', reliability: 0.8,  npcId: 'gardener' },
                    { id: 'c3b_test_stew',  type: 'testimony',     text: '韩嫂称：她的库房钥匙昨日白天被罗川借过一个时辰，说是"检查门锁"。',     locationId: 'hall',   reliability: 0.85, npcId: 'steward' },
                    { id: 'c3b_motive',     type: 'motive',        text: '近三月巡夜经费流水不清，审计在即，罗川急需毁掉相关账目。',             locationId: 'study',  reliability: 0.9,  npcId: 'guard' },
                    { id: 'c3b_contra',     type: 'contradiction', text: '罗川称寅时在北门值守，但北门岗哨记录该时段无人签到——他不在那里。',     locationId: 'tower',  reliability: 1.0 }
                ],
                herringClues: [
                    { id: 'c3b_herr1', type: 'motive', text: '韩嫂最近家中开销大增，常独自到库房加班，神色慌张。', locationId: 'study', reliability: 0.4, npcId: 'steward' }
                ],
                dialogues: {
                    'guard_ask':         { speaker: '罗川', text: '寅时我在北门值守，离南库远着呢。周九那小子手脚不干净，这事八成是他。' },
                    'guard_press':       { speaker: '罗川', text: '北门签到？那个……可能是我忘签了，巡夜的哪记得每次都签。' },
                    'guard_confront':    { speaker: '罗川', text: '（面色铁青）……审计要是查出来，我这统领就完了……我只是想烧几本账……' },
                    'steward_ask':       { speaker: '韩嫂', text: '我的钥匙一直在身上……不过昨天白天罗统领确实借过一个时辰，说要检查门锁。', yieldsClueId: 'c3b_test_stew' },
                    'steward_press':     { speaker: '韩嫂', text: '他还钥匙时我看了一眼，没觉得不对。不过……他为什么要检查门锁呢？' },
                    'gardener_ask':      { speaker: '阿禾', text: '寅时有个高大的人影从侧门那边过来，走路步子沉重，肯定不是韩嫂那样的身材。', yieldsClueId: 'c3b_test_flower' },
                    'musician_ask':      { speaker: '柳七', text: '我在城西喝酒到天亮，南库着火时我根本不在院里。' }
                },
                verdicts: {
                    truth: {
                        title: '真相大白',
                        text: '"你说寅时在北门值守，北门签到簿上却无你记录。靴底的炭灰、借钥匙的时机——你其实在南库。"\n罗川双膝一软。\n\n审计逼上门，放火烧账——护院反成纵火犯，何其讽刺。'
                    },
                    normal: {
                        title: '表面了结',
                        text: '周九被释放，你认定罗川嫌疑最大，但少了最后一环铁证，他拒不承认。\n案件记为"巡夜疏忽致火"，罗川被罚俸降职。\n但你看见他接过处分时，手在发抖。'
                    },
                    wrong: {
                        title: '误判冤案',
                        text: '你指认了无辜的人。罗川继续当他的护院统领。\n三月后审计发现巨额亏空，但账本已灰飞烟灭——什么都查不出了。'
                    }
                }
            },

            // ===== 变体C：柳七（琴师）是真凶 =====
            // 动机：库中借据记录巨额欠款，烧毁则无凭
            {
                culpritId: 'musician',
                clues: [
                    { id: 'c3c_resin',      type: 'evidence',      text: '火点残留物含松脂成分——琴师保养琴弦专用，非寻常引火物。',               locationId: 'vault',  reliability: 0.9 },
                    { id: 'c3c_flint',      type: 'evidence',      text: '侧门小径发现打火石碎片，与柳七随身火镰纹路完全吻合。',                 locationId: 'side',   reliability: 0.85 },
                    { id: 'c3c_test_flower',type: 'testimony',     text: '阿禾称：夜间闻到松脂燃烧的特殊气味，很像琴房保养琴弦时的味道。',       locationId: 'garden', reliability: 0.8,  npcId: 'gardener' },
                    { id: 'c3c_test_guard', type: 'testimony',     text: '罗川称：城门记录显示柳七子夜前已回阁，并非"城西喝酒到天亮"。',         locationId: 'gate',   reliability: 0.9,  npcId: 'guard' },
                    { id: 'c3c_motive',     type: 'motive',        text: '库中借据记录柳七累计欠银过百两，烧毁账本则无凭可查。',                 locationId: 'study',  reliability: 0.9,  npcId: 'musician' },
                    { id: 'c3c_contra',     type: 'contradiction', text: '柳七称当夜在城西未归，但城门簿记录他亥时末已入城——他在撒谎。',         locationId: 'tower',  reliability: 1.0 }
                ],
                herringClues: [
                    { id: 'c3c_herr1', type: 'motive', text: '韩嫂近来叹气频繁，似有心事，常独自在库房清点。', locationId: 'hall', reliability: 0.4, npcId: 'steward' }
                ],
                dialogues: {
                    'musician_ask':      { speaker: '柳七', text: '我那天根本不在院里，在城西喝酒喝到天亮。南库着火跟我有什么关系？' },
                    'musician_press':    { speaker: '柳七', text: '城门记录？那个……也许我回来得比记忆中早一点，但回来后就直接去睡了。' },
                    'musician_confront': { speaker: '柳七', text: '（嘴唇发白）……那些借据……过百两……我这辈子也还不清……只要账本烧了就没人知道……' },
                    'guard_ask':         { speaker: '罗川', text: '城门夜间记录我查过了，柳七亥时末就入城了。他说在城西喝到天亮是假话。', yieldsClueId: 'c3c_test_guard' },
                    'guard_press':       { speaker: '罗川', text: '偏门岗也有记录——周九案发时确实在北院搬货，有三人作证。他是被冤枉的。' },
                    'steward_ask':       { speaker: '韩嫂', text: '我子时就歇了，钥匙一直在身上。不过……库房门锁昨天似乎被人动过。' },
                    'gardener_ask':      { speaker: '阿禾', text: '夜里闻到一股松脂燃烧的味道——不是普通灯油，很像琴房保养弦用的那种。', yieldsClueId: 'c3c_test_flower' },
                    'gardener_press':    { speaker: '阿禾', text: '对对对，就是那种松松的香味。而且我看到侧门那边有个瘦瘦的人影一闪而过。' }
                },
                verdicts: {
                    truth: {
                        title: '真相大白',
                        text: '"你说当夜不在院中，城门簿却记着你亥时末已入城。火点的松脂、侧门的打火石碎片——全是你的东西。"\n柳七瘫坐在地，双手掩面。\n\n百两债逼出了一场火，差点烧掉整个南库。'
                    },
                    normal: {
                        title: '表面了结',
                        text: '周九被释放，你的矛头直指柳七，但差了一锤定音的矛盾。\n柳七被逐出万宝阁，但并未被定罪。\n走出大门时他擦了擦额角的汗——那些借据，的确烧没了。'
                    },
                    wrong: {
                        title: '误判冤案',
                        text: '你抓错了人。柳七从容离去，一月后悄然辞去乐师之职——连同那过百两的债。\n"账本烧了，欠条没了。好一个金蝉脱壳。"'
                    }
                }
            }
        ]
    }
]);

// ─── 干扰事件池（不变）───
var DT_DISTURBANCES = Object.freeze([
    { id: 'dist_rain',        text: '🌧️ 突降夜雨，部分户外足迹被冲淡。',             effect: 'outdoor_reliability_down', value: 0.15 },
    { id: 'dist_witness_gone',text: '🏃 一名证人声称身体不适回房了，少一次对话机会。', effect: 'lose_ap', value: 1 },
    { id: 'dist_false_lead',  text: '📝 有人匿名投递一张字条，指向了错误的方向。',     effect: 'add_noise', value: 1 },
    { id: 'dist_lamp_out',    text: '🕯️ 偏库灯油耗尽，该地点首次调查成功率-15%。',   effect: 'location_debuff', locationId: 'vault', value: 0.15 },
    { id: 'dist_dog_bark',    text: '🐕 院中看门犬整夜狂吠，掩盖了部分声响线索。',     effect: 'testimony_reliability_down', value: 0.1 },
    { id: 'dist_time_press',  text: '⏰ 天快亮了！管事催促加快进度。总行动-1。',       effect: 'lose_ap', value: 1 }
]);

// ─── NPC 技能（不变）───
var DT_NPC_SKILLS = Object.freeze([
    { id: 'SK_OBSERVE', name: '察言观色', icon: '👁️',  desc: '搜证与对话检定成功率+20%。',             effect: 'check_bonus',     value: 20 },
    { id: 'SK_RETRY',   name: '旧案经验', icon: '🔄', desc: '本局首次检定失败时可重新尝试。',           effect: 'retry_once',      value: 1 },
    { id: 'SK_SOCIAL',  name: '人情通达', icon: '🤝', desc: '对话检定额外+10%加成。',                   effect: 'lower_threshold', value: 1 },
    { id: 'SK_INSIGHT', name: '现场复盘', icon: '🔍', desc: '消耗1AP，直接获得一条矛盾提示。',         effect: 'reveal_hint',     value: 1 },
    { id: 'SK_COERCE',  name: '威慑盘问', icon: '💢', desc: '强制获得1条证词，但压力+1。',             effect: 'force_testimony', value: 1 },
    { id: 'SK_DEDUCE',  name: '缜密笔录', icon: '📝', desc: '结案时所需证据数量-1（最低3条）。',       effect: 'reduce_required', value: 1 }
]);
