import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { manifestUrl } from "./site-links";
describe("homepage and installation routing", () => {
  it("computes install links for the current production or preview domain", () => {
    expect(manifestUrl("https://example.pages.dev")).toBe(
      "https://example.pages.dev/manifest.json",
    );
    expect(manifestUrl("https://preview.example.test")).toBe(
      "https://preview.example.test/manifest.json",
    );
  });
  it("works on development ports without hardcoded hosting identity", () => {
    expect(manifestUrl("http://localhost:5173")).toBe(
      "http://localhost:5173/manifest.json",
    );
  });
  it("keeps extension action on the compact panel route", () => {
    const manifest = JSON.parse(readFileSync("public/manifest.json", "utf8"));
    expect(manifest.action.popover).toBe("/panel.html");
    expect(manifest.action.width).toBe(260);
    expect(manifest.action.height).toBe(96);
  });
  it("keeps product homepage distinct from tracker entry", () => {
    const home = readFileSync("index.html", "utf8"),
      panel = readFileSync("panel.html", "utf8");
    expect(home).toContain("/src/landing.ts");
    expect(home).toContain('src="/panel.html"');
    expect(panel).toContain("/src/main.tsx");
    expect(home).not.toContain("/src/main.tsx");
  });
  it("discloses live QA limit and links rules attribution", () => {
    const home = readFileSync("index.html", "utf8");
    expect(home).toContain("真实房间联测尚未完成");
    expect(home).toContain("/LICENSE-SRD.txt");
    expect(home).toContain("客户端进行");
  });
  it("does not add external fonts or analytics scripts", () => {
    const home = readFileSync("index.html", "utf8"),
      css = readFileSync("src/landing.css", "utf8");
    expect(home).not.toMatch(/<script[^>]+src=["']https?:/);
    expect(css).not.toContain("@import");
  });
});
