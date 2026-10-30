# 2014 规则来源与效果范围

v0.4.1 的原有 20 个选项为 14 种通常状态与 6 级力竭。另有 28 个常见效果标签（含专注），共 48 个公开默认选项。专注、法术与职业效果不是新增的正式 Condition；它们是便于桌面记录的效果摘要，不自动施法、修改 AC/伤害、维持专注或扣除持续时间。

## 本地核对来源

使用用户已有的 `5etools-cn-20260921-9aaa6c9` 本地快照，仓库快照标识为 `9aaa6c9ab9345f80a8f292aa2738afa6299b7a5c`。仅核对 `source: PHB` 的 2014 条目，未使用 `XPHB` 2024 条目：

- `data/spells/spells-phb.json`：以 `ENG_name` 定位原文条目，所选法术均标为 `srd: true`。文件 SHA-256 为 `f0757303c7145a6c70763fa41d60ae28610d44f84a1eb52a4985973fbe94a60d`。
- `data/class/class-barbarian.json`：Rage，PHB 第 46 页。
- `data/class/class-bard.json`：Bardic Inspiration，PHB 第 51 页。
- `data/book/book-phb.json`：Concentration（专注），PHB 第 203 页；按每个伤害来源分别进行体质豁免，DC 为 10 或一半伤害中的较高者，失能/死亡或施放另一专注法术时结束。标签加在施法者身上，不自动清除其他角色的法术标签。

未复制或发布完整本地资料和译文。软件内说明为重新概括的简短中文规则摘要；公开规则依据为 SRD 5.1，归属与 CC BY 4.0 许可继续见 LICENSE-SRD.txt。

## 新增效果索引

| 标签 | 本地 PHB 2014 对照条目 | PHB 页码 |
|---|---|---|
| 专注 | Concentration（施法规则） | 203 |
| 加速术、加速倦怠 | Haste | 250 |
| 缓慢术 | Slow | 277 |
| 祝福术 | Bless | 219 |
| 灾祸术 | Bane | 216 |
| 护盾术 | Shield | 275 |
| 虔诚护盾 | Shield of Faith | 275 |
| 援助术 | Aid | 211 |
| 英雄气概 | Heroism | 250 |
| 朦胧术 | Blur | 219 |
| 镜影术 | Mirror Image | 260 |
| 飞行术 | Fly | 243 |
| 高等隐形术 | Greater Invisibility | 246 |
| 变巨术、缩小术 | Enlarge/Reduce | 237 |
| 石肤术 | Stoneskin | 278 |
| 树肤术 | Barkskin | 217 |
| 防护能量 | Protection from Energy | 270 |
| 防护善恶 | Protection from Evil and Good | 270 |
| 防护毒素 | Protection from Poison | 270 |
| 大步奔行 | Longstrider | 256 |
| 神导术 | Guidance | 248 |
| 抵抗术 | Resistance | 272 |
| 妖火 | Faerie Fire | 239 |
| 防死结界 | Death Ward | 230 |
| 狂暴 | Rage | 46 |
| 吟游诗人激励 | Bardic Inspiration | 51 |

加速的额外动作只允许一次武器攻击或列出的动作；结束后的倦怠独立手动标记。2014 镜影使用 d20 转移攻击，诗人激励持续 10 分钟且须在 DM 宣布成败前使用，狂暴沿用 2014 的结束条件。保持 2014 六级累积力竭。

## 已有房间升级

已有自定义/保存的效果库不会自动覆盖。DM 在效果管理点击「补全 2014 常见效果」，按缺少的 ID 添加默认定义；已有同 ID 的自定义名称、说明、颜色与权限保留。若先前手动删过某个默认条目，补全操作会重新加入它。

最多可导入 80 个定义，但房间共享 metadata 仍受 16 KB 限制，写入前继续按 15,000 字节检查全房间数据。效果过多或说明过长时可能先触及字节限制。不同来源的重复增益与叠加裁定由桌面处理。
