import { beforeEach, describe, it, expect, vi } from "vitest";
import {
  KEY,
  publicDefaults,
  privateDefaults,
  standardConditions,
} from "./model";
const m = vi.hoisted(() => ({
  role: "GM" as "GM" | "PLAYER",
  items: [] as any[],
  room: {} as Record<string, unknown>,
  scene: {} as Record<string, unknown>,
  handlers: {} as Record<string, Function>,
  selection: [] as string[],
}));
vi.mock("@owlbear-rodeo/sdk", () => ({
  default: {
    isAvailable: true,
    onReady: (f: () => void) => f(),
    room: {
      id: "test-room",
      getMetadata: async () => m.room,
      setMetadata: async (u: object) => {
        m.room = { ...m.room, ...u };
        m.handlers.room?.(m.room);
      },
      onMetadataChange: (f: Function) => {
        m.handlers.room = f;
        return () => delete m.handlers.room;
      },
    },
    player: {
      id: "p1",
      getRole: async () => m.role,
      getName: async () => "Alice",
      getSelection: async () => m.selection,
      onChange: (f: Function) => {
        m.handlers.player = f;
        return () => delete m.handlers.player;
      },
    },
    party: {
      getPlayers: async () => [],
      onChange: (f: Function) => {
        m.handlers.party = f;
        return () => delete m.handlers.party;
      },
    },
    scene: {
      isReady: async () => true,
      getMetadata: async () => m.scene,
      setMetadata: async (u: object) => {
        m.scene = { ...m.scene, ...u };
        m.handlers.scene?.(m.scene);
      },
      onReadyChange: (f: Function) => {
        m.handlers.ready = f;
        return () => delete m.handlers.ready;
      },
      onMetadataChange: (f: Function) => {
        m.handlers.scene = f;
        return () => delete m.handlers.scene;
      },
      items: {
        getItems: async (ids?: string[]) =>
          m.items.filter((i) => !ids || ids.includes(i.id)),
        onChange: (f: Function) => {
          m.handlers.items = f;
          return () => delete m.handlers.items;
        },
        updateItems: async (filter: any[], fn: Function) => {
          const ids = filter.map((i) => (typeof i === "string" ? i : i.id));
          fn(m.items.filter((i) => ids.includes(i.id)));
          m.handlers.items?.(m.items);
        },
      },
    },
  },
}));
import { OwlbearAdapter, type Snapshot } from "./adapter";
function item(id = "token", visible = true, ownerId = "p1") {
  return {
    id,
    name: id,
    visible,
    layer: "CHARACTER",
    metadata: {
      other: { untouched: true },
      [KEY]: { initiative: 10, ownerId, statuses: [] },
    },
  };
}
let store: Map<string, string>;
beforeEach(() => {
  m.role = "GM";
  m.items = [item(), item("hidden", false)];
  m.room = { [KEY + "/catalog"]: publicDefaults, other: "keep" };
  m.scene = {};
  m.handlers = {};
  m.selection = [];
  store = new Map();
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => store.get(k) || null,
    setItem: (k: string, v: string) => store.set(k, v),
  });
  vi.stubGlobal("window", { dispatchEvent: vi.fn() });
  vi.stubGlobal(
    "CustomEvent",
    class {
      constructor(
        public type: string,
        public options: any,
      ) {}
    },
  );
});
async function ready() {
  const adapter = new OwlbearAdapter();
  let state!: Snapshot;
  const off = adapter.subscribe((s) => (state = s));
  await vi.waitFor(() => expect(state.ready).toBe(true));
  return {
    adapter,
    get state() {
      return state;
    },
    off,
  };
}
describe("live SDK adapter under mocked OBR APIs", () => {
  it("keeps unused private library out of room metadata and player snapshots", async () => {
    const a = await ready();
    await a.adapter.saveCatalog([...publicDefaults, ...privateDefaults]);
    expect(JSON.stringify(m.room)).not.toContain("猎手印记");
    expect(store.size).toBe(1);
    m.role = "PLAYER";
    await m.handlers.player();
    await vi.waitFor(() => expect(a.state.viewer.role).toBe("PLAYER"));
    expect(a.state.effects.every((e) => e.access === "player")).toBe(true);
    expect(a.state.characters.some((c) => c.hidden)).toBe(false);
    let first!: Snapshot;
    a.adapter.subscribe((s) => (first = s));
    expect(first.characters.some((c) => c.hidden)).toBe(false);
    a.off();
  });
  it("rechecks current role for DM-only catalog and removal", async () => {
    const a = await ready();
    m.role = "PLAYER";
    await expect(a.adapter.saveCatalog(privateDefaults)).rejects.toThrow(
      "只有 DM",
    );
    await expect(
      a.adapter.change("token", { type: "untrack" }),
    ).rejects.toThrow("只有 DM");
    a.off();
  });
  it("lets players navigate both ways and rename any visible character", async () => {
    m.role = "PLAYER";
    m.items = [item("other", true, "someone")];
    const a = await ready();
    await a.adapter.setBattle({ round: 2, activeId: "other" });
    expect(m.scene[KEY + "/battle"]).toEqual({ round: 2, activeId: "other" });
    await a.adapter.setBattle({ round: 1, activeId: null });
    await a.adapter.change("other", { type: "name", value: "  新名字  " });
    expect(m.items[0].metadata[KEY].name).toBe("新名字");
    expect(m.items[0].name).toBe("other");
    a.off();
  });
  it("players can add named entries without map tokens", async () => {
    m.role = "PLAYER";
    m.items = [];
    const a = await ready();
    await a.adapter.addManual("手动战士", 17);
    const key = Object.keys(m.scene).find((k) =>
      k.startsWith(KEY + "/manual/"),
    )!;
    expect((m.scene[key] as any).name).toBe("手动战士");
    expect(a.state.characters).toHaveLength(1);
    const id = a.state.characters[0].id;
    await a.adapter.change(id, { type: "name", value: "改名战士" });
    await a.adapter.change(id, { type: "initiative", value: 22 });
    await a.adapter.change(id, { type: "add", effectId: "poisoned" });
    expect(a.state.characters[0].name).toBe("改名战士");
    expect(a.state.characters[0].initiative).toBe(22);
    expect(a.state.characters[0].statuses).toHaveLength(1);
    a.off();
  });
  it("fresh rooms immediately expose standard 2014 defaults", async () => {
    m.role = "PLAYER";
    m.room = {};
    const a = await ready();
    expect(a.state.effects).toHaveLength(47);
    expect(a.state.effects.some((e) => e.id === "exhaustion-6")).toBe(true);
    expect(a.state.effects.some((e) => e.id === "spell-haste")).toBe(true);
    a.off();
  });
  it("rejects private effects for player even with guessed id", async () => {
    const a = await ready();
    m.role = "PLAYER";
    await expect(
      a.adapter.change("token", { type: "add", effectId: "gm-mark" }),
    ).rejects.toThrow("不可用");
    a.off();
  });
  it("allows own initiative/status and preserves unrelated metadata", async () => {
    m.role = "PLAYER";
    const a = await ready();
    await a.adapter.change("token", { type: "initiative", value: 21 });
    await a.adapter.change("token", { type: "add", effectId: "poisoned" });
    expect(m.items[0].metadata.other).toEqual({ untouched: true });
    expect(m.items[0].metadata[KEY].initiative).toBe(21);
    expect(m.items[0].metadata[KEY].statuses[0].addedByRole).toBe("PLAYER");
    a.off();
  });
  it("allows shared initiatives but rejects hidden characters and invalid values", async () => {
    m.role = "PLAYER";
    m.items = [item("other", true, "p2"), item(), item("secret", false)];
    const a = await ready();
    await a.adapter.change("other", { type: "initiative", value: 20 });
    expect(m.items[0].metadata[KEY].initiative).toBe(20);
    await expect(
      a.adapter.change("secret", { type: "initiative", value: 20 }),
    ).rejects.toThrow("隐藏");
    await expect(
      a.adapter.change("token", { type: "initiative", value: NaN }),
    ).rejects.toThrow("最多一位小数");
    a.off();
  });
  it("does not permit deleting a GM-applied public status", async () => {
    const a = await ready();
    await a.adapter.change("token", { type: "add", effectId: "poisoned" });
    const id = m.items[0].metadata[KEY].statuses[0].instanceId;
    m.role = "PLAYER";
    await expect(
      a.adapter.change("token", { type: "remove", instanceId: id }),
    ).rejects.toThrow("只有 DM");
    a.off();
  });
  it("checks room metadata total budget and leaves unrelated data", async () => {
    const a = await ready();
    await a.adapter.saveCatalog(publicDefaults);
    expect(m.room.other).toBe("keep");
    m.room.other = "x".repeat(16000);
    await expect(a.adapter.saveCatalog(publicDefaults)).rejects.toThrow(
      "16 KB",
    );
    a.off();
  });
  it("adds only selected character tokens without overwriting existing metadata", async () => {
    m.role = "PLAYER";
    m.items = [
      item(),
      {
        id: "new",
        name: "New",
        visible: true,
        layer: "CHARACTER",
        metadata: { other: 3 },
      },
      { id: "map", layer: "MAP", metadata: {} },
    ];
    m.selection = ["token", "new", "map"];
    const a = await ready();
    await a.adapter.addSelected();
    expect(m.items[0].metadata[KEY].initiative).toBe(10);
    expect(m.items[1].metadata[KEY].initiative).toBe(0);
    expect(m.items[1].metadata.other).toBe(3);
    expect(m.items[2].metadata[KEY]).toBeUndefined();
    a.off();
  });
  it("untracks without deleting token or foreign metadata", async () => {
    const a = await ready();
    await a.adapter.change("token", { type: "untrack" });
    expect(m.items[0].metadata[KEY]).toBeUndefined();
    expect(m.items[0].metadata.other).toEqual({ untouched: true });
    expect(m.items).toHaveLength(2);
    a.off();
  });
  it("accepts one decimal for token and manual initiative and rejects higher precision", async () => {
    m.role = "PLAYER";
    const a = await ready();
    await a.adapter.change("token", { type: "initiative", value: 20.5 });
    expect(m.items[0].metadata[KEY].initiative).toBe(20.5);
    await a.adapter.change("token", { type: "initiative", value: 68.1 });
    expect(m.items[0].metadata[KEY].initiative).toBe(68.1);
    await a.adapter.addManual("小数角色", 20.5);
    const manual = a.state.characters.find((c) => c.name === "小数角色")!;
    await a.adapter.change(manual.id, { type: "initiative", value: 20 });
    expect(a.state.characters.find((c) => c.id === manual.id)!.initiative).toBe(
      20,
    );
    for (const value of [20.55, NaN, Infinity, -99.1, 999.1]) {
      await expect(
        a.adapter.change("token", { type: "initiative", value }),
      ).rejects.toThrow();
      await expect(a.adapter.addManual("无效先攻", value)).rejects.toThrow();
    }
    expect(m.items[0].metadata[KEY].initiative).toBe(68.1);
    a.off();
  });
  it("resets only battle state while retaining characters, initiative and statuses", async () => {
    const a = await ready();
    await a.adapter.addManual("保留角色", 20.5);
    await a.adapter.change("token", { type: "add", effectId: "spell-haste" });
    const characters = structuredClone(a.state.characters);
    await a.adapter.setBattle({ round: 100, activeId: "token" });
    await a.adapter.setBattle({ round: 1, activeId: null });
    expect(a.state.battle).toEqual({ round: 1, activeId: null });
    expect(a.state.characters).toEqual(characters);
    a.off();
  });
  it("preserves saved catalogs until the DM explicitly supplements defaults", async () => {
    m.room[KEY + "/catalog"] = [
      { ...standardConditions[0], description: "DM 自定义说明" },
    ];
    const a = await ready();
    expect(a.state.effects.find((e) => e.id === "blinded")!.description).toBe(
      "DM 自定义说明",
    );
    expect(a.state.effects.some((e) => e.id === "spell-haste")).toBe(false);
    a.off();
  });
});
