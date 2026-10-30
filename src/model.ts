import { commonEffects2014 } from "./effects-2014";

export type Role = "GM" | "PLAYER";
export interface Effect {
  id: string;
  name: string;
  description: string;
  color: string;
  access: "player" | "gm";
}
export interface Status extends Effect {
  instanceId: string;
  addedBy: string;
  addedByRole: Role;
}
export interface Character {
  id: string;
  name: string;
  initiative: number;
  ownerId: string;
  statuses: Status[];
  hidden?: boolean;
}
export interface Viewer {
  id: string;
  role: Role;
}
export interface Battle {
  round: number;
  activeId: string | null;
}
export const KEY = "io.combat-panel.v1";
const condition = (
  id: string,
  name: string,
  description: string,
  color = "#b7acd8",
): Effect => ({ id, name, description, color, access: "player" });
const exhaustionRules = [
  "属性检定具有劣势。",
  "速度减半。",
  "攻击检定与豁免具有劣势。",
  "生命值上限减半。",
  "速度变为 0。",
  "死亡。",
];
export const standardConditions: Effect[] = [
  condition(
    "blinded",
    "目盲",
    "无法看见，依赖视觉的属性检定自动失败；自身攻击劣势，对其攻击优势。",
  ),
  condition(
    "charmed",
    "魅惑",
    "不能攻击魅惑者，也不能用有害能力或魔法效果以其为目标；魅惑者与其社交互动的属性检定具有优势。",
    "#dca1bb",
  ),
  condition("deafened", "耳聋", "无法听见，依赖听觉的属性检定自动失败。"),
  condition(
    "frightened",
    "恐慌",
    "恐惧源在视线内时，属性检定与攻击检定劣势；不能自愿靠近恐惧源。",
    "#d6ad7b",
  ),
  condition(
    "grappled",
    "擒抱",
    "速度为 0，不能受益于速度加值。擒抱者失能，或效果使目标离开擒抱者／擒抱效果触及范围时结束。擒抱本身不会使攻击劣势。",
  ),
  condition(
    "incapacitated",
    "失能",
    "不能执行动作或反应。依照 2014 通则：不能执行动作也意味着不能执行附赠动作；失能会结束专注。",
  ),
  condition(
    "invisible",
    "隐形",
    "普通视觉无法看见，魔法或特殊感官除外。躲藏时视为重度遮蔽，但声音或踪迹仍可能暴露位置；自身攻击优势，对其攻击劣势。隐形不等于自动躲藏。",
    "#8fc8d5",
  ),
  condition(
    "paralyzed",
    "麻痹",
    "失能，不能移动或说话；力量与敏捷豁免自动失败；对其攻击优势；攻击者在其 5 尺内时，命中即重击。",
  ),
  condition(
    "petrified",
    "石化",
    "连同穿戴／携带的非魔法物品变为无生命固体，重量变为 10 倍且停止衰老。失能，不能移动或说话，不知周围情况；力量与敏捷豁免自动失败，对其攻击优势；所有伤害抗性，免疫毒素和疾病。已有毒素／疾病暂停而非清除。",
    "#adb4bd",
  ),
  condition("poisoned", "中毒", "攻击检定与属性检定具有劣势。", "#9bc77e"),
  condition(
    "prone",
    "倒地",
    "只能爬行，站起结束；自身攻击劣势；5 尺内攻击者对其攻击优势，其他距离则劣势。",
    "#d6ad7b",
  ),
  condition(
    "restrained",
    "束缚",
    "速度为 0，不能受益于速度加值；自身攻击劣势，对其攻击优势；敏捷豁免劣势。",
  ),
  condition(
    "stunned",
    "震慑",
    "失能、不能移动、说话断续；力量与敏捷豁免自动失败；对其攻击优势。",
    "#d6ad7b",
  ),
  condition(
    "unconscious",
    "昏迷",
    "失能，不能移动或说话，不知周围情况；松开手持物并倒地；力量与敏捷豁免自动失败；对其攻击优势；攻击者在其 5 尺内时，命中即重击。",
  ),
  ...exhaustionRules.map((_, i) =>
    condition(
      `exhaustion-${i + 1}`,
      `力竭 ${i + 1}`,
      `D&D 5e 2014 · 力竭 ${i + 1} 级（包含所有较低级效果）\n${exhaustionRules
        .slice(0, i + 1)
        .map((text, n) => `${n + 1} 级：${text}`)
        .join(
          "\n",
        )}\n获得额外力竭时等级累加。进食饮水且完成长休后降低 1 级。0 级表示无力竭。`,
      "#d99283",
    ),
  ),
];
export const publicDefaults: Effect[] = [
  ...standardConditions,
  ...commonEffects2014,
];
export const MAX_EFFECTS = 80;
export const privateDefaults: Effect[] = [
  {
    id: "gm-mark",
    name: "猎手印记",
    description:
      "该角色被猎手标记。由 DM 根据当前遭遇决定标记的具体效果与结束时机。",
    color: "#d992b9",
    access: "gm",
  },
];
export function canEdit(_viewer: Viewer, _c: Character) {
  return true;
}
export function availableEffects(viewer: Viewer, effects: Effect[]) {
  return effects.filter((e) => viewer.role === "GM" || e.access === "player");
}
export function canRemove(viewer: Viewer, c: Character, s: Status) {
  return (
    viewer.role === "GM" ||
    (canEdit(viewer, c) &&
      s.access === "player" &&
      s.addedByRole === "PLAYER" &&
      s.addedBy === viewer.id)
  );
}
export function addStatus(
  viewer: Viewer,
  c: Character,
  effect: Effect,
): Character {
  if (
    !canEdit(viewer, c) ||
    (viewer.role !== "GM" && effect.access !== "player")
  )
    throw Error("没有添加该效果的权限");
  if (
    viewer.role === "PLAYER" &&
    effect.id.startsWith("exhaustion-") &&
    c.statuses.some(
      (s) => s.id.startsWith("exhaustion-") && s.addedByRole === "GM",
    )
  )
    throw Error("DM 添加的力竭只能由 DM 调整");
  if (
    effect.id.startsWith("exhaustion-") &&
    c.statuses.some(
      (s) => s.id.startsWith("exhaustion-") && !canRemove(viewer, c, s),
    )
  )
    throw Error("只能由原添加者或 DM 调整力竭");
  if (c.statuses.some((s) => s.id === effect.id))
    throw Error("角色已拥有此状态");
  return {
    ...c,
    statuses: [
      ...c.statuses.filter(
        (s) =>
          !effect.id.startsWith("exhaustion-") ||
          !s.id.startsWith("exhaustion-"),
      ),
      {
        ...effect,
        instanceId: crypto.randomUUID(),
        addedBy: viewer.id,
        addedByRole: viewer.role,
      },
    ],
  };
}
export function removeStatus(
  viewer: Viewer,
  c: Character,
  id: string,
): Character {
  const s = c.statuses.find((s) => s.instanceId === id);
  if (!s || !canRemove(viewer, c, s))
    throw Error("只有 DM 或该状态的添加者可以移除");
  return { ...c, statuses: c.statuses.filter((s) => s.instanceId !== id) };
}
export function sorted(chars: Character[]) {
  return [...chars].sort(
    (a, b) =>
      b.initiative - a.initiative ||
      a.name.localeCompare(b.name, "zh-CN") ||
      a.id.localeCompare(b.id),
  );
}
export function advance(b: Battle, chars: Character[]): Battle {
  const list = sorted(chars);
  if (!list.length) return { round: 1, activeId: null };
  const i = list.findIndex((c) => c.id === b.activeId);
  return {
    round: b.round + (i === list.length - 1 ? 1 : 0),
    activeId: list[(i + 1) % list.length].id,
  };
}
export function previous(b: Battle, chars: Character[]): Battle {
  const list = sorted(chars);
  if (!list.length) return { round: 1, activeId: null };
  const i = list.findIndex((c) => c.id === b.activeId);
  if (i < 0)
    return { round: Math.max(1, b.round), activeId: list[list.length - 1].id };
  return {
    round: Math.max(1, b.round - (i === 0 ? 1 : 0)),
    activeId: list[(i - 1 + list.length) % list.length].id,
  };
}
export function validName(value: string): string {
  const name = value.trim();
  if (!name || name.length > 80) throw Error("角色名称须为 1–80 字");
  return name;
}
export function validEffect(v: unknown): v is Effect {
  const e = v as Effect;
  return (
    !!e &&
    typeof e.id === "string" &&
    e.id.trim().length > 0 &&
    e.id.length <= 80 &&
    typeof e.name === "string" &&
    e.name.trim().length > 0 &&
    e.name.length <= 40 &&
    typeof e.description === "string" &&
    e.description.length <= 1200 &&
    /^#[0-9a-f]{6}$/i.test(e.color) &&
    ["gm", "player"].includes(e.access)
  );
}
export function validateCatalog(value: unknown): Effect[] {
  if (
    !Array.isArray(value) ||
    value.length > MAX_EFFECTS ||
    !value.every(validEffect) ||
    new Set(value.map((e) => e.id)).size !== value.length
  )
    throw Error(
      `效果文件格式不正确：最多 ${MAX_EFFECTS} 个效果，名称 1–40 字，说明最多 1200 字。`,
    );
  return value.map((e) => ({
    id: e.id,
    name: e.name,
    description: e.description,
    color: e.color,
    access: e.access,
  }));
}
export function demoCharacters(): Character[] {
  return [
    {
      id: "aidan",
      name: "艾琳 · 战士",
      initiative: 19,
      ownerId: "player-demo",
      statuses: [
        {
          ...publicDefaults[0],
          instanceId: "s1",
          addedBy: "player-demo",
          addedByRole: "PLAYER",
        },
      ],
    },
    {
      id: "lilia",
      name: "米拉 · 游侠",
      initiative: 16,
      ownerId: "player-other",
      statuses: [],
    },
    {
      id: "hunter",
      name: "幽影猎手",
      initiative: 13,
      ownerId: "gm-demo",
      statuses: [
        {
          ...privateDefaults[0],
          instanceId: "s2",
          addedBy: "gm-demo",
          addedByRole: "GM",
        },
      ],
    },
    {
      id: "guard",
      name: "遗迹守卫",
      initiative: 8,
      ownerId: "gm-demo",
      statuses: [],
    },
  ];
}
