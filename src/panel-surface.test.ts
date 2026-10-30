import { beforeEach, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  ready: undefined as undefined | (() => void),
  resize: undefined as undefined | (() => void),
  mutation: undefined as undefined | (() => void),
  contentHeight: 170.2,
  dialogOpen: false,
  disconnect: vi.fn(),
}));
vi.mock("@owlbear-rodeo/sdk", () => ({
  default: {
    onReady: (fn: () => void) => {
      m.ready = fn;
    },
    action: {
      setWidth: vi.fn(async () => {}),
      setHeight: vi.fn(async () => {}),
      close: vi.fn(),
      onOpenChange: vi.fn(),
    },
    popover: {
      getHeight: vi.fn(() => new Promise(() => {})),
      open: vi.fn(),
    },
    theme: { getTheme: vi.fn() },
  },
}));
import OBR from "@owlbear-rodeo/sdk";
import {
  PANEL_WIDTH,
  PANEL_MIN_HEIGHT,
  PANEL_MAX_HEIGHT,
  panelHeight,
  watchActionSize,
} from "./panel-surface";

function element() {
  return {
    getBoundingClientRect: () => ({ height: m.contentHeight }),
    querySelector: () => (m.dialogOpen ? {} : null),
  } as unknown as HTMLElement;
}

beforeEach(() => {
  vi.clearAllMocks();
  m.ready = m.resize = m.mutation = undefined;
  m.contentHeight = 170.2;
  m.dialogOpen = false;
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

it("sizes the native action only after ready and leaves icon toggling to Owlbear", async () => {
  const stop = watchActionSize(element());
  m.resize?.();
  expect(OBR.action.setHeight).not.toHaveBeenCalled();
  m.ready?.();
  await vi.waitFor(() =>
    expect(OBR.action.setHeight).toHaveBeenCalledWith(171),
  );
  expect(OBR.action.setWidth).toHaveBeenCalledWith(PANEL_WIDTH);
  expect(OBR.action.close).not.toHaveBeenCalled();
  expect(OBR.action.onOpenChange).not.toHaveBeenCalled();
  expect(OBR.popover.open).not.toHaveBeenCalled();
  expect(OBR.popover.getHeight).not.toHaveBeenCalled();
  expect(OBR.theme.getTheme).not.toHaveBeenCalled();
  stop();
});

it("grows, shrinks and handles dialogs without retaining observers", async () => {
  const stop = watchActionSize(element());
  m.ready?.();
  await vi.waitFor(() =>
    expect(OBR.action.setHeight).toHaveBeenLastCalledWith(171),
  );
  m.contentHeight = 300;
  m.resize?.();
  m.contentHeight = 140;
  m.resize?.();
  await vi.waitFor(() =>
    expect(OBR.action.setHeight).toHaveBeenLastCalledWith(140),
  );
  m.dialogOpen = true;
  m.mutation?.();
  await vi.waitFor(() =>
    expect(OBR.action.setHeight).toHaveBeenLastCalledWith(420),
  );
  m.dialogOpen = false;
  m.mutation?.();
  await vi.waitFor(() =>
    expect(OBR.action.setHeight).toHaveBeenLastCalledWith(140),
  );
  stop();
  const calls = vi.mocked(OBR.action.setHeight).mock.calls.length;
  m.contentHeight = 200;
  m.resize?.();
  await Promise.resolve();
  expect(OBR.action.setHeight).toHaveBeenCalledTimes(calls);
  expect(m.disconnect).toHaveBeenCalledTimes(2);
});

it("does not block height sizing on a delayed width response", async () => {
  let release!: () => void;
  vi.mocked(OBR.action.setWidth).mockReturnValueOnce(
    new Promise<void>((resolve) => {
      release = resolve;
    }),
  );
  const stop = watchActionSize(element());
  m.ready?.();
  await vi.waitFor(() =>
    expect(OBR.action.setHeight).toHaveBeenCalledWith(171),
  );
  stop();
  release();
});

it("does not send SDK messages if unmounted before ready", () => {
  const stop = watchActionSize(element());
  stop();
  m.ready?.();
  m.resize?.();
  expect(OBR.action.setWidth).not.toHaveBeenCalled();
  expect(OBR.action.setHeight).not.toHaveBeenCalled();
  expect(m.disconnect).toHaveBeenCalledTimes(2);
});
