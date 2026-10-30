import OBR from "@owlbear-rodeo/sdk";

export const PANEL_WIDTH = 260;
export const PANEL_MIN_HEIGHT = 96;
export const PANEL_MAX_HEIGHT = 420;
export const FLOATING_PANEL_ID = "io.combat-panel.v1/floating-panel";
export const FLOATING_PANEL_URL = "/panel.html?surface=floating";

export function panelHeight(contentHeight: number, dialogOpen = false) {
  return dialogOpen
    ? PANEL_MAX_HEIGHT
    : Math.min(
        PANEL_MAX_HEIGHT,
        Math.max(PANEL_MIN_HEIGHT, Math.ceil(contentHeight)),
      );
}

// Action popovers have native paper. Launch a documented hidePaper popover
// instead so the iframe's translucent pixels really reveal the scene.
export function connectActionLauncher(onError: (error: unknown) => void) {
  let stopped = false;
  let busy = false;
  let off: (() => void) | undefined;
  async function toggle() {
    if (stopped || busy) return;
    busy = true;
    try {
      const height = await OBR.popover.getHeight(FLOATING_PANEL_ID);
      if (stopped) return;
      if (height !== undefined) {
        await OBR.popover.close(FLOATING_PANEL_ID);
      } else {
        const theme = await OBR.theme.getTheme();
        if (stopped) return;
        await OBR.popover.open({
          id: FLOATING_PANEL_ID,
          url: `${FLOATING_PANEL_URL}&theme=${theme.mode.toLowerCase()}`,
          width: PANEL_WIDTH,
          height: PANEL_MIN_HEIGHT,
          anchorReference: "POSITION",
          anchorPosition: { left: 16, top: 64 },
          anchorOrigin: { horizontal: "LEFT", vertical: "TOP" },
          transformOrigin: { horizontal: "LEFT", vertical: "TOP" },
          hidePaper: true,
          disableClickAway: true,
          marginThreshold: 8,
        });
      }
      if (!stopped) await OBR.action.close();
    } catch (error) {
      if (!stopped) onError(error);
    } finally {
      busy = false;
    }
  }
  OBR.onReady(async () => {
    if (stopped) return;
    try {
      // Also update already-installed manifests with the former 340x480 size.
      await Promise.all([
        OBR.action.setWidth(PANEL_WIDTH),
        OBR.action.setHeight(PANEL_MIN_HEIGHT),
      ]);
      if (stopped) return;
      off = OBR.action.onOpenChange((open) => {
        if (open) void toggle();
      });
      if (await OBR.action.isOpen()) await toggle();
    } catch (error) {
      if (!stopped) onError(error);
    }
  });
  return () => {
    stopped = true;
    off?.();
  };
}

export function watchFloatingSize(element: HTMLElement) {
  let stopped = false;
  let ready = false;
  let running = false;
  let appliedHeight = 0;
  let desiredHeight = PANEL_MIN_HEIGHT;
  async function flush() {
    if (!ready || running || stopped) return;
    running = true;
    try {
      while (!stopped && appliedHeight !== desiredHeight) {
        const next = desiredHeight;
        await OBR.popover.setHeight(FLOATING_PANEL_ID, next);
        appliedHeight = next;
      }
    } catch (error) {
      if (!stopped) console.warn("面板尺寸调整失败", error);
    } finally {
      running = false;
    }
  }
  const update = () => {
    desiredHeight = panelHeight(
      element.getBoundingClientRect().height,
      Boolean(element.querySelector("dialog[open]")),
    );
    void flush();
  };
  const resize = new ResizeObserver(update);
  const dialogs = new MutationObserver(update);
  resize.observe(element);
  dialogs.observe(element, {
    attributes: true,
    attributeFilter: ["open"],
    subtree: true,
  });
  OBR.onReady(() => {
    if (!stopped) {
      ready = true;
      update();
    }
  });
  return () => {
    stopped = true;
    resize.disconnect();
    dialogs.disconnect();
  };
}

export async function closeFloatingPanel() {
  await OBR.popover.close(FLOATING_PANEL_ID);
}

// The iframe canvas must use the host's color scheme or browsers can paint an
// opaque fallback even when html/body have transparent backgrounds.
export function syncPanelColorScheme(root: HTMLElement) {
  let stopped = false;
  let changed = false;
  let off: (() => void) | undefined;
  const previous = root.style.colorScheme;
  const apply = (theme: { mode: "DARK" | "LIGHT" }) => {
    if (!stopped) root.style.colorScheme = theme.mode.toLowerCase();
  };
  OBR.onReady(async () => {
    if (stopped) return;
    off = OBR.theme.onChange((theme) => {
      changed = true;
      apply(theme);
    });
    try {
      const theme = await OBR.theme.getTheme();
      if (!changed) apply(theme);
    } catch (error) {
      if (!stopped) console.warn("面板主题同步失败", error);
    }
  });
  return () => {
    stopped = true;
    off?.();
    root.style.colorScheme = previous;
  };
}
