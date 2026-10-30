import { describe, it, expect } from "vitest";
import {
  canEdit,
  availableEffects,
  canRemove,
  addStatus,
  removeStatus,
  sorted,
  advance,
  previous,
  validName,
  validateCatalog,
  publicDefaults,
  privateDefaults,
  demoCharacters,
} from "./model";
const gm = { id: "gm-demo", role: "GM" as const },
  p = { id: "player-demo", role: "PLAYER" as const };
describe("v0.2 shared character permissions", () => {
  it("all roles can edit every character without ownership", () => {
    for (const c of demoCharacters()) {
      expect(canEdit(p, c)).toBe(true);
      expect(canEdit(gm, c)).toBe(true);
    }
  });
  it("never lists GM definitions for player", () => {
    expect(
      availableEffects(p, [...publicDefaults, ...privateDefaults]),
    ).toEqual(publicDefaults);
  });
  it("rejects player adding DM-only status even without UI", () => {
    expect(() =>
      addStatus(p, demoCharacters()[0], privateDefaults[0]),
    ).toThrow();
  });
  it("permits player adding public status to another former owner", () => {
    expect(
      addStatus(p, demoCharacters()[1], publicDefaults[0]).statuses,
    ).toHaveLength(1);
  });
  it("rejects duplicate effect", () => {
    expect(() =>
      addStatus(p, demoCharacters()[0], publicDefaults[0]),
    ).toThrow();
  });
  it("player can remove own player-added effect", () => {
    const c = demoCharacters()[0];
    expect(canRemove(p, c, c.statuses[0])).toBe(true);
    expect(removeStatus(p, c, "s1").statuses).toHaveLength(0);
  });
  it("player cannot remove a GM-added public effect", () => {
    const c = addStatus(
      gm,
      { ...demoCharacters()[0], statuses: [] },
      publicDefaults[0],
    );
    expect(canRemove(p, c, c.statuses[0])).toBe(false);
    expect(() => removeStatus(p, c, c.statuses[0].instanceId)).toThrow();
  });
  it("player cannot remove another player effect", () => {
    const c = demoCharacters()[0];
    c.statuses[0].addedBy = "someone";
    expect(canRemove(p, c, c.statuses[0])).toBe(false);
  });
  it("GM can remove any effect", () => {
    const c = demoCharacters()[2];
    expect(canRemove(gm, c, c.statuses[0])).toBe(true);
  });
});
describe("initiative navigation", () => {
  it("sorts descending with deterministic tie order", () => {
    const c = demoCharacters();
    expect(sorted(c).map((c) => c.initiative)).toEqual([19, 16, 13, 8]);
    expect(
      sorted([
        { ...c[0], id: "z", name: "same" },
        { ...c[0], id: "a", name: "same" },
      ])[0].id,
    ).toBe("a");
  });
  it("starts and wraps next round", () => {
    const c = demoCharacters();
    expect(advance({ round: 1, activeId: null }, c)).toEqual({
      round: 1,
      activeId: "aidan",
    });
    expect(advance({ round: 1, activeId: "guard" }, c)).toEqual({
      round: 2,
      activeId: "aidan",
    });
  });
  it("previous moves back and clamps round at one", () => {
    const c = demoCharacters();
    expect(previous({ round: 2, activeId: "aidan" }, c)).toEqual({
      round: 1,
      activeId: "guard",
    });
    expect(previous({ round: 1, activeId: "aidan" }, c)).toEqual({
      round: 1,
      activeId: "guard",
    });
    expect(previous({ round: 3, activeId: "hunter" }, c)).toEqual({
      round: 3,
      activeId: "lilia",
    });
  });
  it("handles empty and missing active character both ways", () => {
    expect(advance({ round: 8, activeId: "gone" }, [])).toEqual({
      round: 1,
      activeId: null,
    });
    expect(previous({ round: 8, activeId: "gone" }, [])).toEqual({
      round: 1,
      activeId: null,
    });
    expect(
      advance({ round: 8, activeId: "gone" }, demoCharacters()).activeId,
    ).toBe("aidan");
    expect(
      previous({ round: 8, activeId: "gone" }, demoCharacters()).activeId,
    ).toBe("guard");
  });
  it("handles single character round wrap", () => {
    const c = [demoCharacters()[0]];
    expect(advance({ round: 1, activeId: c[0].id }, c).round).toBe(2);
    expect(previous({ round: 2, activeId: c[0].id }, c).round).toBe(1);
  });
});
describe("2014 conditions", () => {
  it("contains 14 standard non-exhaustion conditions and six cumulative levels", () => {
    expect(
      publicDefaults.filter((e) => !e.id.startsWith("exhaustion-")),
    ).toHaveLength(14);
    const levels = publicDefaults.filter((e) => e.id.startsWith("exhaustion-"));
    expect(levels).toHaveLength(6);
    expect(levels[5].description).toContain("1 级");
    expect(levels[5].description).toContain("6 级：死亡");
    expect(levels[3].description).toContain("生命值上限减半");
  });
  it("all standard conditions initially player-addable", () => {
    expect(publicDefaults.every((e) => e.access === "player")).toBe(true);
  });
  it("replaces own previous exhaustion level", () => {
    const e1 = publicDefaults.find((e) => e.id === "exhaustion-1")!,
      e3 = publicDefaults.find((e) => e.id === "exhaustion-3")!;
    const c = addStatus(p, { ...demoCharacters()[0], statuses: [] }, e1);
    const next = addStatus(p, c, e3);
    expect(next.statuses).toHaveLength(1);
    expect(next.statuses[0].id).toBe("exhaustion-3");
  });
  it("player cannot replace GM applied exhaustion through a new level", () => {
    const e1 = publicDefaults.find((e) => e.id === "exhaustion-1")!,
      e3 = publicDefaults.find((e) => e.id === "exhaustion-3")!;
    const c = addStatus(gm, { ...demoCharacters()[0], statuses: [] }, e1);
    expect(() => addStatus(p, c, e3)).toThrow("只能由 DM");
  });
});
it("player cannot replace another player's exhaustion", () => {
  const e1 = publicDefaults.find((e) => e.id === "exhaustion-1")!,
    e2 = publicDefaults.find((e) => e.id === "exhaustion-2")!;
  const c = addStatus(
    { id: "p2", role: "PLAYER" },
    { ...demoCharacters()[0], statuses: [] },
    e1,
  );
  expect(() => addStatus(p, c, e2)).toThrow("原添加者");
});
describe("imports and names", () => {
  it("accepts and projects catalog fields", () => {
    expect(
      validateCatalog([{ ...publicDefaults[0], secret: "ignore" }])[0],
    ).not.toHaveProperty("secret");
  });
  it("rejects invalid roles, colors and duplicate identifiers", () => {
    for (const value of [
      [{ ...publicDefaults[0], access: "admin" }],
      [{ ...publicDefaults[0], color: "url(http://bad)" }],
      [{ ...publicDefaults[0], id: " " }],
      [publicDefaults[0], publicDefaults[0]],
    ])
      expect(() => validateCatalog(value)).toThrow();
  });
  it("rejects excessive data", () => {
    expect(() => validateCatalog(Array(41).fill(publicDefaults[0]))).toThrow();
    expect(() =>
      validateCatalog([
        { ...publicDefaults[0], description: "x".repeat(1201) },
      ]),
    ).toThrow();
  });
  it("validates manual and renamed character names", () => {
    expect(validName("  测试角色  ")).toBe("测试角色");
    expect(() => validName(" ")).toThrow();
    expect(() => validName("x".repeat(81))).toThrow();
  });
});
