import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { createAdapter, type Snapshot, type Change } from "./adapter";
import {
  type Effect,
  availableEffects,
  canRemove,
  sorted,
  advance,
  previous,
  publicDefaults,
  privateDefaults,
  validateCatalog,
} from "./model";
import "./style.css";
const adapter = createAdapter();
const empty: Snapshot = {
  viewer: { id: "", role: "PLAYER" },
  characters: [],
  effects: [],
  battle: { round: 1, activeId: null },
  ready: false,
  members: [],
};
function placeTooltip(el: HTMLElement) {
  const r = el.getBoundingClientRect();
  const width = Math.min(280, innerWidth - 20);
  const below = innerHeight - r.bottom - 12,
    above = r.top - 12;
  const down = below >= 190 || below > above;
  el.style.setProperty(
    "--tip-left",
    `${Math.max(10, Math.min(r.left, innerWidth - width - 10))}px`,
  );
  el.style.setProperty("--tip-top", `${down ? r.bottom + 5 : r.top - 5}px`);
  el.style.setProperty("--tip-transform", down ? "none" : "translateY(-100%)");
  el.style.setProperty(
    "--tip-height",
    `${Math.max(70, Math.min(300, down ? below : above))}px`,
  );
}
function Icon({
  kind,
}: {
  kind:
    "prev" | "next" | "plus" | "settings" | "back" | "close" | "info" | "reset";
}) {
  if (kind === "reset")
    return (
      <svg
        width="17"
        height="17"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M4 10a8 8 0 1 1 1 7M4 4v6h6"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  if (kind === "prev" || kind === "next")
    return (
      <svg width="18" height="18" viewBox="0 0 20 20" aria-hidden="true">
        <path
          d={
            kind === "next" ? "M4 4v12l9-6Z M15 4v12" : "M16 4v12l-9-6Z M5 4v12"
          }
          fill="currentColor"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
        />
      </svg>
    );
  if (kind === "settings")
    return (
      <svg width="18" height="18" viewBox="0 0 20 20" aria-hidden="true">
        <path
          d="M4 5h12M4 10h12M4 15h12"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <circle cx="7" cy="5" r="2" fill="currentColor" />
        <circle cx="13" cy="10" r="2" fill="currentColor" />
        <circle cx="8" cy="15" r="2" fill="currentColor" />
      </svg>
    );
  return (
    <span aria-hidden="true">
      {{ plus: "＋", back: "‹", close: "×", info: "ⓘ" }[kind]}
    </span>
  );
}
function App() {
  const [s, setS] = useState(empty),
    [tab, setTab] = useState<"battle" | "effects" | "about">("battle"),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [picker, setPicker] = useState<string | null>(null),
    [search, setSearch] = useState(""),
    [editing, setEditing] = useState<Effect | null>(null),
    [adding, setAdding] = useState(false),
    [newName, setNewName] = useState(""),
    [newInit, setNewInit] = useState("0");
  const inFlight = useRef(false),
    fileRef = useRef<HTMLInputElement>(null),
    dialogRef = useRef<HTMLDialogElement>(null);
  const gm = s.viewer.role === "GM";
  useEffect(() => adapter.subscribe(setS), []);
  useEffect(() => {
    const f = (e: Event) => setError((e as CustomEvent).detail);
    window.addEventListener("adapter-error", f);
    return () => window.removeEventListener("adapter-error", f);
  }, []);
  useEffect(() => {
    if (!gm) {
      setTab("battle");
      setEditing(null);
    }
    setPicker(null);
  }, [gm]);
  useEffect(() => {
    if (editing && !dialogRef.current?.open) dialogRef.current?.showModal();
    if (!editing && dialogRef.current?.open) dialogRef.current?.close();
  }, [editing]);
  async function run(fn: () => Promise<void>) {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }
  const change = (id: string, op: Change) => run(() => adapter.change(id, op));
  const chars = sorted(s.characters);
  const saveEffect = (e: Effect) =>
    run(async () => {
      await adapter.saveCatalog([...s.effects.filter((x) => x.id !== e.id), e]);
      setEditing(null);
    });
  function exportEffects() {
    try {
      const blob = new Blob(
          [JSON.stringify(adapter.exportCatalog(), null, 2)],
          { type: "application/json" },
        ),
        url = URL.createObjectURL(blob),
        a = document.createElement("a");
      a.href = url;
      a.download = "combat-effects.json";
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      setError(String(e));
    }
  }
  return (
    <main>
      {adapter.demo && (
        <div className="demo">
          <span>演示</span>
          <button
            className={gm ? "selected" : ""}
            onClick={() => adapter.switchRole("GM")}
          >
            DM
          </button>
          <button
            className={!gm ? "selected" : ""}
            onClick={() => adapter.switchRole("PLAYER")}
          >
            玩家
          </button>
        </div>
      )}
      <header className="toolbar">
        {tab !== "battle" && (
          <button
            className="icon"
            aria-label="返回先攻"
            onClick={() => setTab("battle")}
          >
            <Icon kind="back" />
          </button>
        )}
        <h1>
          {tab === "battle"
            ? "先攻"
            : tab === "effects"
              ? "效果管理"
              : "规则与说明"}
        </h1>
        {tab === "battle" ? (
          <>
            <span className="round-count" title={`第 ${s.battle.round} 回合`}>
              R{s.battle.round}
            </span>
            {gm && (
              <button
                className="icon"
                aria-label="重置轮数"
                title="重置为第 1 轮；保留角色、先攻和状态"
                disabled={busy || !s.ready}
                onClick={() =>
                  run(() => adapter.setBattle({ round: 1, activeId: null }))
                }
              >
                <Icon kind="reset" />
              </button>
            )}
            <button
              className="icon"
              aria-label="上一个角色"
              title="上一个角色"
              disabled={busy || !chars.length || !s.ready}
              onClick={() =>
                run(() => adapter.setBattle(previous(s.battle, chars)))
              }
            >
              <Icon kind="prev" />
            </button>
            <button
              className="icon"
              aria-label="下一个角色"
              title="下一个角色"
              disabled={busy || !chars.length || !s.ready}
              onClick={() =>
                run(() => adapter.setBattle(advance(s.battle, chars)))
              }
            >
              <Icon kind="next" />
            </button>
            <button
              className={"icon " + (adding ? "selected" : "")}
              aria-label="添加角色"
              title="添加角色"
              disabled={!s.ready}
              onClick={() => {
                setAdding(!adding);
                setPicker(null);
              }}
            >
              <Icon kind="plus" />
            </button>
            {gm && (
              <button
                className="icon"
                aria-label="效果管理"
                title="效果管理"
                onClick={() => {
                  setTab("effects");
                  setPicker(null);
                }}
              >
                <Icon kind="settings" />
              </button>
            )}
          </>
        ) : (
          <button
            className="icon"
            aria-label="规则与说明"
            onClick={() => setTab("about")}
          >
            <Icon kind="info" />
          </button>
        )}
      </header>
      {error && (
        <div className="alert" role="alert">
          <span>{error}</span>
          <button
            className="icon"
            aria-label="关闭错误"
            onClick={() => setError("")}
          >
            ×
          </button>
        </div>
      )}
      {tab === "battle" && (
        <>
          {adding && (
            <form
              className="add-form"
              onSubmit={(e) => {
                e.preventDefault();
                void run(async () => {
                  await adapter.addManual(newName, Number(newInit));
                  setAdding(false);
                  setNewName("");
                  setNewInit("0");
                });
              }}
            >
              <div className="add-fields">
                <input
                  autoFocus
                  aria-label="新角色名称"
                  placeholder="角色名称"
                  required
                  maxLength={80}
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
                <input
                  aria-label="新角色先攻"
                  type="number"
                  min="-99"
                  max="999"
                  step="0.1"
                  value={newInit}
                  onChange={(e) => setNewInit(e.target.value)}
                />
                <button
                  className="primary"
                  type="submit"
                  disabled={busy || !newName.trim()}
                >
                  添加
                </button>
              </div>
              <button
                type="button"
                className="text-button"
                disabled={busy}
                onClick={() =>
                  run(async () => {
                    await adapter.addSelected();
                    setAdding(false);
                  })
                }
              >
                {adapter.demo ? "添加示例角色" : "加入地图选中 Token"}
              </button>
            </form>
          )}
          {!s.ready ? (
            <p className="empty">请先打开场景</p>
          ) : !chars.length ? (
            <p className="empty">点击 ＋ 添加角色</p>
          ) : (
            <section className="character-list" aria-label="先攻列表">
              {chars.map((c) => (
                <article
                  className={
                    "character " + (s.battle.activeId === c.id ? "active" : "")
                  }
                  key={c.id}
                >
                  <div className="character-main">
                    <span
                      className="current-dot"
                      aria-label={
                        s.battle.activeId === c.id ? "当前角色" : undefined
                      }
                    >
                      {s.battle.activeId === c.id ? "▸" : ""}
                    </span>
                    <input
                      className="character-name"
                      key={`${c.id}-${c.name}`}
                      aria-label={`${c.name}名称`}
                      title={c.name}
                      maxLength={80}
                      defaultValue={c.name}
                      disabled={busy}
                      onBlur={(e) => {
                        const value = e.currentTarget.value;
                        e.currentTarget.value = c.name;
                        if (value.trim() !== c.name)
                          void change(c.id, { type: "name", value });
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") e.currentTarget.blur();
                      }}
                    />
                    {c.hidden && (
                      <span title="地图隐藏角色" className="hidden-label">
                        隐
                      </span>
                    )}
                    <input
                      className="initiative"
                      key={`${c.id}-${c.initiative}`}
                      aria-label={`${c.name}先攻`}
                      title="先攻"
                      type="number"
                      min="-99"
                      max="999"
                      step="0.1"
                      defaultValue={c.initiative}
                      disabled={busy}
                      onBlur={(e) => {
                        const value = e.currentTarget.value;
                        e.currentTarget.value = String(c.initiative);
                        if (value !== String(c.initiative))
                          void change(c.id, {
                            type: "initiative",
                            value: Number(value),
                          });
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") e.currentTarget.blur();
                      }}
                    />
                    {gm && (
                      <button
                        className="remove-character icon"
                        aria-label={`移出${c.name}`}
                        title="移出角色"
                        disabled={busy}
                        onClick={() => void change(c.id, { type: "untrack" })}
                      >
                        ×
                      </button>
                    )}
                  </div>
                  <div className="status-row">
                    {c.statuses.map((status) => (
                      <div
                        className="status-wrap"
                        key={status.instanceId}
                        onMouseEnter={(e) => placeTooltip(e.currentTarget)}
                        onFocus={(e) => placeTooltip(e.currentTarget)}
                      >
                        <button
                          className="status-chip"
                          style={
                            { "--chip": status.color } as React.CSSProperties
                          }
                          aria-describedby={"tip-" + status.instanceId}
                          onClick={(e) =>
                            e.currentTarget.parentElement?.classList.toggle(
                              "expanded",
                            )
                          }
                        >
                          {status.name}
                          {status.addedByRole === "GM" && <small>◆</small>}
                        </button>
                        <div
                          role="tooltip"
                          className="tooltip"
                          id={"tip-" + status.instanceId}
                        >
                          <b>{status.name}</b>
                          <p>{status.description || "暂无说明"}</p>
                          {canRemove(s.viewer, c, status) && (
                            <button
                              className="danger"
                              disabled={busy}
                              onClick={() =>
                                change(c.id, {
                                  type: "remove",
                                  instanceId: status.instanceId,
                                })
                              }
                            >
                              移除
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                    <button
                      className={
                        "add-status " + (picker === c.id ? "selected" : "")
                      }
                      aria-label={`给${c.name}添加状态`}
                      title="添加状态"
                      disabled={busy}
                      onClick={() => {
                        setPicker(picker === c.id ? null : c.id);
                        setSearch("");
                      }}
                    >
                      ＋
                    </button>
                  </div>
                  {picker === c.id && (
                    <div className="picker">
                      <div className="picker-search">
                        <input
                          aria-label="搜索效果"
                          placeholder="搜索状态"
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                        />
                        <button
                          className="icon"
                          aria-label="关闭状态选择"
                          onClick={() => setPicker(null)}
                        >
                          ×
                        </button>
                      </div>
                      <div className="effect-choices">
                        {availableEffects(s.viewer, s.effects)
                          .filter((e) => e.name.includes(search))
                          .map((e) => (
                            <button
                              key={e.id}
                              title={e.description}
                              disabled={
                                busy || c.statuses.some((s) => s.id === e.id)
                              }
                              onClick={() =>
                                run(async () => {
                                  await adapter.change(c.id, {
                                    type: "add",
                                    effectId: e.id,
                                  });
                                  setPicker(null);
                                })
                              }
                            >
                              <i style={{ background: e.color }} />
                              {e.name}
                              {gm && e.access === "gm" && <small>DM</small>}
                            </button>
                          ))}
                        {!availableEffects(s.viewer, s.effects).filter((e) =>
                          e.name.includes(search),
                        ).length && <span className="empty">无匹配状态</span>}
                      </div>
                    </div>
                  )}
                </article>
              ))}
            </section>
          )}
          <div className="utility">
            <button className="text-button" onClick={() => setTab("about")}>
              ⓘ
            </button>
          </div>
        </>
      )}
      {tab === "effects" && gm && (
        <section className="catalog">
          <div className="catalog-top">
            <button
              className="primary"
              onClick={() => {
                setError("");
                setEditing({
                  id: crypto.randomUUID(),
                  name: "",
                  description: "",
                  color: "#b7acd8",
                  access: "player",
                });
              }}
            >
              ＋ 新建效果
            </button>
            <button onClick={exportEffects}>导出</button>
            <button onClick={() => fileRef.current?.click()}>导入</button>
          </div>
          <div className="catalog-filter">
            <input
              aria-label="管理搜索效果"
              placeholder="搜索效果"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {(["player", "gm"] as const).map((access) => (
            <div className="catalog-group" key={access}>
              <h2>{access === "player" ? "玩家可添加" : "仅 DM 可添加"}</h2>
              {s.effects
                .filter((e) => e.access === access && e.name.includes(search))
                .map((e) => (
                  <div className="effect-card" key={e.id}>
                    <i style={{ background: e.color }} />
                    <span>{e.name}</span>
                    <button
                      aria-label={`编辑${e.name}`}
                      onClick={() => {
                        setError("");
                        setEditing(e);
                      }}
                    >
                      编辑
                    </button>
                    <button
                      className="danger icon"
                      aria-label={`删除${e.name}`}
                      disabled={busy}
                      onClick={() => {
                        if (confirm(`删除「${e.name}」定义？已应用状态保留。`))
                          void run(() =>
                            adapter.saveCatalog(
                              s.effects.filter((x) => x.id !== e.id),
                            ),
                          );
                      }}
                    >
                      ×
                    </button>
                  </div>
                ))}
            </div>
          ))}
          <button
            className="text-button"
            disabled={busy}
            onClick={() =>
              run(() =>
                adapter.saveCatalog([
                  ...s.effects,
                  ...publicDefaults.filter(
                    (d) => !s.effects.some((e) => e.id === d.id),
                  ),
                ]),
              )
            }
          >
            补全 2014 常见效果
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".json,application/json"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file)
                void run(async () => {
                  if (file.size > 100000) throw Error("文件不能超过 100 KB");
                  const effects = validateCatalog(
                    JSON.parse(await file.text()),
                  );
                  if (confirm(`用 ${effects.length} 个效果替换当前效果库？`))
                    await adapter.saveCatalog(effects);
                });
            }}
          />
        </section>
      )}
      {tab === "about" && (
        <section className="about">
          <h2>D&D 5e · 2014</h2>
          <p>
            14 种标准状态及力竭 1–6 级。力竭按 2014 规则累积；0
            级可通过移除标签表示。另含专注、加速、祝福、狂暴等 28 项常见效果。
          </p>
          <p>
            任何人可添加角色、修改名称和先攻，或用箭头切换前后角色。名称修改只影响本面板。地图
            Token 操作仍受房间原有权限限制。先攻支持一位小数；DM
            可用轮数旁的重置按钮回到第 1 轮，并清除当前行动指示。
          </p>
          <p>
            只有 DM 可管理效果。玩家看不到 DM
            专属定义；已添加的状态说明公开。玩家不能移除 DM 添加的状态。
          </p>
          <p>
            DM
            私有效果库保存在当前浏览器，请导出备份。本版本是客户端权限检查，不提供防恶意客户端的服务端授权。
          </p>
          <p>
            状态不自动扣持续时间。同种状态只保留一个标签，持续时间由桌面手动记录。
          </p>
          <a href="/LICENSE-SRD.txt" target="_blank" rel="noreferrer">
            SRD 5.1 规则来源与 CC BY 4.0 授权
          </a>
          {adapter.demo && (
            <button
              onClick={() => {
                if (confirm("恢复演示数据？")) adapter.reset();
              }}
            >
              重置演示
            </button>
          )}
          <small>Combat Panel 0.4.1</small>
        </section>
      )}
      <dialog
        ref={dialogRef}
        onCancel={() => setEditing(null)}
        onClose={() => setEditing(null)}
      >
        {editing && (
          <EffectEditor
            effect={editing}
            error={error}
            busy={busy}
            onSave={saveEffect}
            onCancel={() => setEditing(null)}
          />
        )}
      </dialog>
    </main>
  );
}
function EffectEditor({
  effect,
  error,
  busy,
  onSave,
  onCancel,
}: {
  effect: Effect;
  error: string;
  busy: boolean;
  onSave: (e: Effect) => void;
  onCancel: () => void;
}) {
  const [d, setD] = useState(effect);
  useEffect(() => setD(effect), [effect]);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSave({ ...d, name: d.name.trim() });
      }}
    >
      <div className="dialog-heading">
        <h2>编辑效果</h2>
        <button
          className="icon"
          type="button"
          aria-label="关闭效果编辑"
          onClick={onCancel}
        >
          ×
        </button>
      </div>
      {error && (
        <p className="alert" role="alert">
          {error}
        </p>
      )}
      <label>
        名称
        <input
          required
          maxLength={40}
          value={d.name}
          autoFocus
          onChange={(e) => setD({ ...d, name: e.target.value })}
        />
      </label>
      <label>
        具体效果
        <textarea
          maxLength={1200}
          rows={6}
          value={d.description}
          onChange={(e) => setD({ ...d, description: e.target.value })}
        />
      </label>
      <div className="editor-row">
        <label>
          添加权限
          <select
            value={d.access}
            onChange={(e) =>
              setD({ ...d, access: e.target.value as Effect["access"] })
            }
          >
            <option value="player">玩家可添加</option>
            <option value="gm">仅 DM 可添加</option>
          </select>
        </label>
        <label>
          颜色
          <input
            type="color"
            value={d.color}
            onChange={(e) => setD({ ...d, color: e.target.value })}
          />
        </label>
      </div>
      <div className="form-actions">
        <button type="button" onClick={onCancel}>
          取消
        </button>
        <button
          className="primary"
          disabled={busy || !d.name.trim()}
          type="submit"
        >
          保存
        </button>
      </div>
    </form>
  );
}
createRoot(document.getElementById("root")!).render(<App />);
