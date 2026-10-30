import OBR from "@owlbear-rodeo/sdk";

export const PANEL_WIDTH = 260;
export const PANEL_MIN_HEIGHT = 96;
export const PANEL_MAX_HEIGHT = 420;

export function panelHeight(contentHeight: number, dialogOpen = false) {
  return dialogOpen
    ? PANEL_MAX_HEIGHT
    : Math.min(
        PANEL_MAX_HEIGHT,
        Math.max(PANEL_MIN_HEIGHT, Math.ceil(contentHeight)),
      );
}

// Follow the official Initiative Tracker: render directly in the action iframe.
// Owlbear owns its icon toggle, anchor and translucent paper; we only size it.
export function watchActionSize(element: HTMLElement) {
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
        await OBR.action.setHeight(next);
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
      // Correct dimensions for rooms with older cached manifests as well.
      void OBR.action.setWidth(PANEL_WIDTH).catch((error) => {
        if (!stopped) console.warn("面板宽度调整失败", error);
      });
      update();
    }
  });
  return () => {
    stopped = true;
    resize.disconnect();
    dialogs.disconnect();
  };
}
