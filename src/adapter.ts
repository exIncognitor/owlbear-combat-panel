import OBR, { type Item } from "@owlbear-rodeo/sdk";
import {
  KEY,
  type Character,
  type Viewer,
  type Effect,
  type Battle,
  publicDefaults,
  privateDefaults,
  demoCharacters,
  addStatus,
  removeStatus,
  validateCatalog,
  validEffect,
  validName,
} from "./model";
export interface Snapshot {
  viewer: Viewer;
  characters: Character[];
  effects: Effect[];
  battle: Battle;
  ready: boolean;
  members: { id: string; name: string }[];
}
export type Change =
  | { type: "initiative"; value: number }
  | { type: "name"; value: string }
  | { type: "add"; effectId: string }
  | { type: "remove"; instanceId: string }
  | { type: "untrack" };
export interface Adapter {
  demo: boolean;
  subscribe(fn: (s: Snapshot) => void): () => void;
  change(id: string, op: Change): Promise<void>;
  saveCatalog(e: Effect[]): Promise<void>;
  setBattle(b: Battle): Promise<void>;
  addSelected(): Promise<void>;
  addManual(name: string, initiative: number): Promise<void>;
  switchRole(role: "GM" | "PLAYER"): void;
  reset(): void;
  exportCatalog(): Effect[];
}
function validateInitiative(value: number) {
  if (
    !Number.isFinite(value) ||
    value < -99 ||
    value > 999 ||
    Math.abs(value * 10 - Math.round(value * 10)) > 1e-9
  )
    throw Error("先攻值须在 -99 到 999 之间，最多一位小数");
  return Math.round(value * 10) / 10;
}
function mutate(
  c: Character,
  op: Change,
  v: Viewer,
  effects: Effect[],
): Character | null {
  if (v.role === "PLAYER" && c.hidden) throw Error("不能修改隐藏角色");
  if (op.type === "initiative")
    return { ...c, initiative: validateInitiative(op.value) };
  if (op.type === "name") return { ...c, name: validName(op.value) };
  if (op.type === "untrack") {
    if (v.role !== "GM") throw Error("只有 DM 可以移出角色");
    return null;
  }
  if (op.type === "add") {
    const e = effects.find((e) => e.id === op.effectId);
    if (!e) throw Error("效果已删除或不可用");
    return addStatus(v, c, e);
  }
  return removeStatus(v, c, op.instanceId);
}
function makeManual(name: string, initiative: number): Character {
  return {
    id: "manual-" + crypto.randomUUID(),
    name: validName(name),
    initiative: validateInitiative(initiative),
    ownerId: "",
    statuses: [],
  };
}
function validateBattle(b: Battle) {
  if (
    !Number.isInteger(b.round) ||
    b.round < 1 ||
    b.round > 99999 ||
    (b.activeId !== null && typeof b.activeId !== "string")
  )
    throw Error("回合数据无效");
}
const demoKey = KEY + "/demo-v02";
export class DemoAdapter implements Adapter {
  demo = true;
  private listeners = new Set<(s: Snapshot) => void>();
  private role: "GM" | "PLAYER" =
    new URLSearchParams(location.search).get("role") === "player"
      ? "PLAYER"
      : "GM";
  private data = {
    characters: demoCharacters(),
    effects: [...publicDefaults, ...privateDefaults],
    battle: { round: 1, activeId: "aidan" } as Battle,
  };
  constructor() {
    try {
      const raw = localStorage.getItem(demoKey);
      if (raw) this.data = JSON.parse(raw);
    } catch {}
    window.addEventListener("storage", (e) => {
      if (e.key === demoKey && e.newValue) {
        try {
          this.data = JSON.parse(e.newValue);
          this.emit();
        } catch {}
      }
    });
  }
  private get viewer(): Viewer {
    return {
      id: this.role === "GM" ? "gm-demo" : "player-demo",
      role: this.role,
    };
  }
  private emit() {
    const s: Snapshot = {
      ...this.data,
      characters: this.data.characters.filter(
        (c) => this.role === "GM" || !c.hidden,
      ),
      viewer: this.viewer,
      ready: true,
      effects: this.data.effects.filter(
        (e) => this.role === "GM" || e.access === "player",
      ),
      members: [],
    };
    this.listeners.forEach((fn) => fn(s));
  }
  private persist() {
    localStorage.setItem(demoKey, JSON.stringify(this.data));
    this.emit();
  }
  subscribe(fn: (s: Snapshot) => void) {
    this.listeners.add(fn);
    this.emit();
    return () => {
      this.listeners.delete(fn);
    };
  }
  async change(id: string, op: Change) {
    const c = this.data.characters.find((c) => c.id === id);
    if (!c) throw Error("角色已不存在");
    const next = mutate(c, op, this.viewer, this.data.effects);
    this.data.characters = this.data.characters.flatMap((c) =>
      c.id === id ? (next ? [next] : []) : [c],
    );
    this.persist();
  }
  async saveCatalog(e: Effect[]) {
    if (this.role !== "GM") throw Error("只有 DM 可以管理效果");
    this.data.effects = validateCatalog(e);
    this.persist();
  }
  async setBattle(b: Battle) {
    validateBattle(b);
    this.data.battle = b;
    this.persist();
  }
  async addSelected() {
    await this.addManual("新角色", 10);
  }
  async addManual(name: string, initiative: number) {
    this.data.characters.push(makeManual(name, initiative));
    this.persist();
  }
  switchRole(role: "GM" | "PLAYER") {
    this.role = role;
    this.emit();
  }
  reset() {
    this.data = {
      characters: demoCharacters(),
      effects: [...publicDefaults, ...privateDefaults],
      battle: { round: 1, activeId: "aidan" },
    };
    this.persist();
  }
  exportCatalog() {
    if (this.role !== "GM") throw Error("只有 DM 可以导出");
    return this.data.effects;
  }
}
function sanitizeCharacter(
  id: string,
  value: unknown,
  defaultName: string,
  hidden = false,
): Character | null {
  const d = value as Partial<Character> | undefined;
  if (!d || typeof d !== "object") return null;
  return {
    id,
    name:
      typeof d.name === "string" && d.name.trim()
        ? d.name.slice(0, 80)
        : defaultName,
    initiative: Number.isFinite(d.initiative) ? d.initiative! : 0,
    ownerId: "",
    statuses: Array.isArray(d.statuses)
      ? d.statuses.filter(
          (s) =>
            validEffect(s) &&
            typeof s.instanceId === "string" &&
            typeof s.addedBy === "string" &&
            ["GM", "PLAYER"].includes(s.addedByRole),
        )
      : [],
    hidden,
  };
}
function fromItem(item: Item): Character | null {
  const label =
    ("text" in item
      ? (item as unknown as { text?: { plainText?: string } }).text?.plainText
      : "") ||
    item.name ||
    "未命名角色";
  return sanitizeCharacter(item.id, item.metadata[KEY], label, !item.visible);
}
const manualPrefix = KEY + "/manual/";
export class OwlbearAdapter implements Adapter {
  demo = false;
  private listeners = new Set<(s: Snapshot) => void>();
  private offs: (() => void)[] = [];
  private s: Snapshot = {
    viewer: { id: "", role: "PLAYER" },
    characters: [],
    effects: [],
    battle: { round: 1, activeId: null },
    ready: false,
    members: [],
  };
  private tokenCharacters: Character[] = [];
  private manualCharacters: Character[] = [];
  private privateEffects: Effect[] = [];
  private publicEffects: Effect[] = [];
  private started = false;
  private generation = 0;
  private lifecycle = 0;
  private storageKey() {
    return `${KEY}/private/${OBR.room.id}/${this.s.viewer.id}`;
  }
  private snapshot(): Snapshot {
    return {
      ...this.s,
      effects: [
        ...this.publicEffects,
        ...(this.s.viewer.role === "GM" ? this.privateEffects : []),
      ],
      characters: [...this.tokenCharacters, ...this.manualCharacters].filter(
        (c) => this.s.viewer.role === "GM" || !c.hidden,
      ),
    };
  }
  private emit() {
    const s = this.snapshot();
    this.listeners.forEach((fn) => fn(s));
  }
  private safe(p: Promise<unknown>) {
    void p.catch((e) =>
      window.dispatchEvent(
        new CustomEvent("adapter-error", { detail: String(e) }),
      ),
    );
  }
  subscribe(fn: (s: Snapshot) => void) {
    this.listeners.add(fn);
    fn(this.snapshot());
    if (!this.started) {
      this.started = true;
      const token = ++this.lifecycle;
      OBR.onReady(() => {
        if (token === this.lifecycle && this.started)
          this.safe(this.start(token));
      });
    }
    return () => {
      this.listeners.delete(fn);
      if (!this.listeners.size) {
        ++this.lifecycle;
        ++this.generation;
        this.offs.forEach((f) => f());
        this.offs = [];
        this.started = false;
      }
    };
  }
  private async start(token: number) {
    await this.refreshViewer();
    if (token !== this.lifecycle) return;
    this.offs.push(
      OBR.player.onChange(() => this.safe(this.refreshViewer())),
      OBR.room.onMetadataChange((m) => {
        this.publicEffects = this.readPublic(m);
        this.emit();
      }),
      OBR.scene.onReadyChange(() => this.safe(this.refreshScene())),
      OBR.scene.items.onChange((items) => {
        if (!this.s.ready) return;
        this.tokenCharacters = items
          .map(fromItem)
          .filter((c): c is Character => !!c);
        this.emit();
      }),
      OBR.scene.onMetadataChange((m) => {
        if (!this.s.ready) return;
        this.readScene(m);
        this.emit();
      }),
    );
    this.publicEffects = this.readPublic(await OBR.room.getMetadata());
    await this.refreshScene();
  }
  private readPublic(m: Record<string, unknown>) {
    const e = m[KEY + "/catalog"];
    return Array.isArray(e)
      ? e.filter(validEffect).filter((e) => e.access === "player")
      : publicDefaults;
  }
  private readScene(m: Record<string, unknown>) {
    const b = m[KEY + "/battle"] as Battle | undefined;
    this.s.battle = {
      round: b && Number.isInteger(b.round) && b.round > 0 ? b.round : 1,
      activeId: typeof b?.activeId === "string" ? b.activeId : null,
    };
    this.manualCharacters = Object.entries(m)
      .filter(([k]) => k.startsWith(manualPrefix))
      .map(([k, v]) =>
        sanitizeCharacter(k.slice(manualPrefix.length), v, "未命名角色"),
      )
      .filter((c): c is Character => !!c);
  }
  private async refreshViewer() {
    const role = await OBR.player.getRole();
    this.s.viewer = { id: OBR.player.id, role };
    this.privateEffects = [];
    if (role === "GM") {
      try {
        this.privateEffects = validateCatalog(
          JSON.parse(
            localStorage.getItem(this.storageKey()) ||
              JSON.stringify(privateDefaults),
          ),
        ).filter((e) => e.access === "gm");
      } catch {
        this.privateEffects = [];
      }
    }
    this.emit();
  }
  private async refreshScene() {
    const generation = ++this.generation;
    const ready = await OBR.scene.isReady();
    if (generation !== this.generation) return;
    this.s.ready = ready;
    this.tokenCharacters = [];
    this.manualCharacters = [];
    this.s.battle = { round: 1, activeId: null };
    this.emit();
    if (!ready) return;
    const [items, m] = await Promise.all([
      OBR.scene.items.getItems(),
      OBR.scene.getMetadata(),
    ]);
    if (generation !== this.generation) return;
    this.tokenCharacters = items
      .map(fromItem)
      .filter((c): c is Character => !!c);
    this.readScene(m);
    this.emit();
  }
  private async viewer() {
    return { id: OBR.player.id, role: await OBR.player.getRole() } as Viewer;
  }
  async change(id: string, op: Change) {
    const v = await this.viewer();
    if (!(await OBR.scene.isReady())) throw Error("请先打开场景");
    const effects = [
      ...this.readPublic(await OBR.room.getMetadata()),
      ...(v.role === "GM" ? this.privateEffects : []),
    ];
    if (id.startsWith("manual-")) {
      const m = await OBR.scene.getMetadata();
      const c = sanitizeCharacter(id, m[manualPrefix + id], "未命名角色");
      if (!c) throw Error("角色已不存在");
      await OBR.scene.setMetadata({
        [manualPrefix + id]: mutate(c, op, v, effects),
      });
      return;
    }
    const items = await OBR.scene.items.getItems([id]);
    if (!items.length) throw Error("角色已不存在");
    await OBR.scene.items.updateItems([id], (draft) => {
      const item = draft[0];
      if (!item) return;
      const c = fromItem(item as Item);
      if (!c) throw Error("角色已移出面板");
      const next = mutate(c, op, v, effects);
      if (next)
        item.metadata[KEY] = {
          name: next.name,
          initiative: next.initiative,
          statuses: next.statuses,
        };
      else delete item.metadata[KEY];
    });
  }
  async saveCatalog(e: Effect[]) {
    if ((await this.viewer()).role !== "GM")
      throw Error("只有 DM 可以管理效果");
    e = validateCatalog(e);
    const pub = e.filter((e) => e.access === "player");
    const metadata = await OBR.room.getMetadata();
    if (
      new TextEncoder().encode(
        JSON.stringify({ ...metadata, [KEY + "/catalog"]: pub }),
      ).length > 15000
    )
      throw Error("房间共享数据接近 16 KB 上限，请缩短说明或减少效果数量");
    await OBR.room.setMetadata({ [KEY + "/catalog"]: pub });
    localStorage.setItem(
      this.storageKey(),
      JSON.stringify(e.filter((e) => e.access === "gm")),
    );
    this.publicEffects = pub;
    this.privateEffects = e.filter((e) => e.access === "gm");
    this.emit();
  }
  async setBattle(b: Battle) {
    validateBattle(b);
    if (!(await OBR.scene.isReady())) throw Error("请先打开场景");
    await OBR.scene.setMetadata({ [KEY + "/battle"]: b });
  }
  async addSelected() {
    const v = await this.viewer();
    if (!(await OBR.scene.isReady())) throw Error("请先打开场景");
    const ids = await OBR.player.getSelection();
    if (!ids?.length) throw Error("请先在地图上选择角色 Token");
    const items = await OBR.scene.items.getItems(ids);
    const tokens = items.filter(
      (i) => i.layer === "CHARACTER" && (v.role === "GM" || i.visible),
    );
    if (!tokens.length) throw Error("请选择可见的角色图层 Token");
    await OBR.scene.items.updateItems(tokens, (draft) => {
      draft.forEach((item) => {
        if (!item.metadata[KEY])
          item.metadata[KEY] = { initiative: 0, statuses: [] };
      });
    });
  }
  async addManual(name: string, initiative: number) {
    if (!(await OBR.scene.isReady())) throw Error("请先打开场景");
    const c = makeManual(name, initiative);
    await OBR.scene.setMetadata({ [manualPrefix + c.id]: c });
  }
  switchRole() {
    throw Error("真实房间身份由 Owlbear Rodeo 决定");
  }
  reset() {}
  exportCatalog() {
    if (this.s.viewer.role !== "GM") throw Error("只有 DM 可以导出");
    return [...this.publicEffects, ...this.privateEffects];
  }
}
export function createAdapter(): Adapter {
  return OBR.isAvailable ? new OwlbearAdapter() : new DemoAdapter();
}
