import { beforeEach, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  height: undefined as number | undefined,
  actionOpen: true,
  onOpen: undefined as undefined | ((open: boolean) => void),
  resize: undefined as undefined | (() => void),
  mutation: undefined as undefined | (() => void),
  contentHeight: 170.2,
  dialogOpen: false,
  mode: "DARK" as "DARK" | "LIGHT",
  onTheme: undefined as
    undefined | ((theme: { mode: "DARK" | "LIGHT" }) => void),
  disconnect: vi.fn(),
}));
vi.mock("@owlbear-rodeo/sdk", () => ({
  default: {
    onReady: (fn: () => void) => fn(),
    action: {
      setWidth: vi.fn(async () => {}),
      setHeight: vi.fn(async () => {}),
      isOpen: async () => m.actionOpen,
      close: vi.fn(async () => {
        m.actionOpen = false;
        m.onOpen?.(false);
      }),
      onOpenChange: (fn: (open: boolean) => void) => {
        m.onOpen = fn;
        return () => {
          m.onOpen = undefined;
        };
      },
    },
    popover: {
      // Reproduce the real host's no-response behavior for a missing popover.
      getHeight: vi.fn(() => new Promise<number | undefined>(() => {})),
      open: vi.fn(async (options) => {
        m.height = options.height;
      }),
      close: vi.fn(async () => {
        m.height = undefined;
      }),
      setHeight: vi.fn(async (_id, height) => {
        m.height = height;
      }),
    },
    theme: {
      getTheme: vi.fn(async () => ({ mode: m.mode })),
      onChange: (fn: (theme: { mode: "DARK" | "LIGHT" }) => void) => {
        m.onTheme = fn;
        return () => {
          m.onTheme = undefined;
        };
      },
    },
  },
}));
import OBR from "@owlbear-rodeo/sdk";
import {
  PANEL_WIDTH,
  PANEL_MIN_HEIGHT,
  PANEL_MAX_HEIGHT,
  FLOATING_PANEL_ID,
  FLOATING_PANEL_URL,
  panelHeight,
  connectActionLauncher,
  watchFloatingSize,
  syncPanelColorScheme,
  closeFloatingPanel,
} from "./panel-surface";

beforeEach(() => {
  vi.clearAllMocks();
  m.height = undefined;
  m.actionOpen = true;
  m.onOpen = m.resize = m.mutation = undefined;
  m.contentHeight = 170.2;
  m.dialogOpen = false;
  m.mode = "DARK";
  m.onTheme = undefined;
  vi.stubGlobal("matchMedia", () => ({ matches: true }));
  vi.stubGlobal(
    "ResizeObserver",
    class {
      constructor(fn: () => void) {
        m.resize = fn;
      }
      observe() {}
      disconnect() {
        m.disconnect();
      }
    },
  );
  vi.stubGlobal(
    "MutationObserver",
    class {
      constructor(fn: () => void) {
        m.mutation = fn;
      }
      observe() {}
      disconnect() {
        m.disconnect();
      }
    },
  );
});

it("clamps the panel height and reserves space for an open editor", () => {
  expect(panelHeight(0)).toBe(PANEL_MIN_HEIGHT);
  expect(panelHeight(170.2)).toBe(171);
  expect(panelHeight(2000)).toBe(PANEL_MAX_HEIGHT);
  expect(panelHeight(170, true)).toBe(PANEL_MAX_HEIGHT);
});

it("opens without the pending height query and can reopen after an explicit close", async () => {
  const error = vi.fn();
  const stop = connectActionLauncher(error);
  await vi.waitFor(() => expect(OBR.action.close).toHaveBeenCalledTimes(1));
  expect(OBR.action.setWidth).toHaveBeenCalledWith(PANEL_WIDTH);
  expect(OBR.action.setHeight).toHaveBeenCalledWith(PANEL_MIN_HEIGHT);
  expect(OBR.popover.getHeight).not.toHaveBeenCalled();
  expect(OBR.theme.getTheme).not.toHaveBeenCalled();
  expect(OBR.popover.open).toHaveBeenCalledWith(
    expect.objectContaining({
      id: FLOATING_PANEL_ID,
      url: `${FLOATING_PANEL_URL}&theme=dark`,
      width: 260,
      hidePaper: true,
      disableClickAway: true,
    }),
  );
  await closeFloatingPanel();
  expect(OBR.popover.close).toHaveBeenCalledWith(FLOATING_PANEL_ID);
  m.actionOpen = true;
  m.onOpen?.(true);
  await vi.waitFor(() => expect(OBR.popover.open).toHaveBeenCalledTimes(2));
  expect(OBR.popover.getHeight).not.toHaveBeenCalled();
  expect(error).not.toHaveBeenCalled();
  stop();
  expect(m.onOpen).toBeUndefined();
});

it("matches the host color scheme and follows subsequent theme changes", async () => {
  const root = { style: { colorScheme: "" } } as HTMLElement;
  const stop = syncPanelColorScheme(root);
  await vi.waitFor(() => expect(root.style.colorScheme).toBe("dark"));
  m.onTheme?.({ mode: "LIGHT" });
  expect(root.style.colorScheme).toBe("light");
  stop();
  expect(root.style.colorScheme).toBe("");
  expect(m.onTheme).toBeUndefined();
});

it("reports launcher failures instead of silently leaving a blank action", async () => {
  const error = vi.fn();
  vi.mocked(OBR.popover.open).mockRejectedValueOnce(new Error("Disconnected"));
  const stop = connectActionLauncher(error);
  await vi.waitFor(() => expect(error).toHaveBeenCalled());
  expect(OBR.action.close).not.toHaveBeenCalled();
  stop();
});

it("grows, shrinks and handles dialogs without retaining resize listeners", async () => {
  const element = {
    getBoundingClientRect: () => ({ height: m.contentHeight }),
    querySelector: () => (m.dialogOpen ? {} : null),
  } as unknown as HTMLElement;
  const stop = watchFloatingSize(element);
  await vi.waitFor(() => expect(m.height).toBe(171));
  m.contentHeight = 300;
  m.resize?.();
  m.contentHeight = 140;
  m.resize?.();
  await vi.waitFor(() => expect(m.height).toBe(140));
  m.dialogOpen = true;
  m.mutation?.();
  await vi.waitFor(() => expect(m.height).toBe(420));
  m.dialogOpen = false;
  m.mutation?.();
  await vi.waitFor(() => expect(m.height).toBe(140));
  stop();
  const calls = vi.mocked(OBR.popover.setHeight).mock.calls.length;
  m.contentHeight = 200;
  m.resize?.();
  await Promise.resolve();
  expect(OBR.popover.setHeight).toHaveBeenCalledTimes(calls);
  expect(m.disconnect).toHaveBeenCalledTimes(2);
});
