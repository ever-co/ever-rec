import type { Stage } from 'konva/lib/Stage';
import type { Node } from 'konva/lib/Node';

// The editor's stage at phone width (below 768px): touch, and the scale that fits the screen.
//
// The drawing tools listen to Konva's mouse events (`mousedown`, `mousemove`, `mouseup`,
// `click`). Konva reports a finger as `touchstart` / `touchmove` / `touchend` / `tap` instead,
// and stops the browser from making up mouse events when the finger lands on a shape, so on a
// phone no tool would react. `bridgeTouchToMouse` hands one finger to the tools as the mouse.
// `attachPinchZoom` gives two fingers to the view: pinch zooms, moving pans.
//
// The press is handed over on the first move or on the lift, not when the finger lands: when a
// second finger follows, the press was the start of a pinch and no tool sees it. A tool that opens
// the keyboard (text) does so on the lift, inside the gesture the browser accepts for focus.

export interface IPhoneTouchState {
  // Two or more fingers are (or were, until every finger lifts) on the stage.
  gesture: boolean;
  // The tools have had `mousedown` and still wait for `mouseup`.
  pressed: boolean;
  // The finger that has landed and not yet been handed to the tools.
  pending: { target: Node | Stage; evt: TouchEvent } | null;
}

export const createPhoneTouchState = (): IPhoneTouchState => ({
  gesture: false,
  pressed: false,
  pending: null,
});

const NAMESPACE = '.phoneTouch';

const hasListeners = (node: Node | Stage, type: string): boolean =>
  !!(node as any).eventListeners?.[type]?.length;

export const bridgeTouchToMouse = (
  stage: Stage,
  state: IPhoneTouchState,
): (() => void) => {
  const fire = (target: Node | Stage, type: string, evt: TouchEvent) =>
    target.fire(type, { evt }, true);

  const press = () => {
    if (!state.pending) return;
    const { target, evt } = state.pending;
    state.pending = null;
    state.pressed = true;
    // The tools read the pointer position: it is where the finger landed.
    stage.setPointersPositions(evt);
    fire(target, 'mousedown', evt);
  };

  stage.on(`touchstart${NAMESPACE}`, (e) => {
    // The finger draws: no page scroll and no made-up mouse events after it.
    if (e.evt.cancelable) e.evt.preventDefault();
    if (state.gesture || state.pressed) return;
    state.pending = { target: e.target, evt: e.evt as TouchEvent };
  });

  stage.on(`touchmove${NAMESPACE}`, (e) => {
    if (state.gesture) return;
    if (state.pending) {
      press();
      stage.setPointersPositions(e.evt);
    }
    if (state.pressed) fire(e.target, 'mousemove', e.evt as TouchEvent);
  });

  stage.on(`touchend${NAMESPACE}`, (e) => {
    if (state.pending) {
      press();
      stage.setPointersPositions(e.evt);
    }
    if (state.pressed) {
      state.pressed = false;
      fire(e.target, 'mouseup', e.evt as TouchEvent);

      // Code outside Konva waits for the window's mouseup too (the text box commits on it), and
      // the browser makes none up after a touch it was told to leave alone. Sent to the window
      // only, so Konva (listening on its own element) does not take it as a second release.
      const lifted = (e.evt as TouchEvent).changedTouches?.[0];
      window.dispatchEvent(
        new MouseEvent('mouseup', {
          clientX: lifted?.clientX ?? 0,
          clientY: lifted?.clientY ?? 0,
        }),
      );
    }
  });

  // A tap is a click. Konva has no `tap` listeners of the editor's to collide with.
  stage.on(`tap${NAMESPACE}`, (e) => {
    fire(e.target, 'click', e.evt as TouchEvent);
  });

  // A double tap is a double click, except on shapes that already listen to `dbltap` (text and
  // speech bubbles listen to both, and would open their editor twice).
  stage.on(`dbltap${NAMESPACE}`, (e) => {
    if (hasListeners(e.target, 'dbltap')) return;
    fire(e.target, 'dblclick', e.evt as TouchEvent);
  });

  return () => {
    stage.off(NAMESPACE);
    state.pending = null;
    state.pressed = false;
  };
};

const ZOOM_MIN = 25;
const ZOOM_MAX = 200;

const distance = (a: Touch, b: Touch) =>
  Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);

const clampZoom = (value: number) =>
  Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round(value / 5) * 5));

// Two fingers on the scrolling area around the stage: pinch to zoom (the same 25 to 200% as the
// zoom control), move to pan. Listens in the capture phase so the stage never sees the fingers of
// a pinch; the lift that ends it still reaches the stage when a tool was pressed before it began.
// One finger on a text box over the stage (the text tool's) is left to the browser, to place the
// caret: Konva would take it as a press on the stage, and the box would close.
export const attachPinchZoom = (
  container: HTMLElement,
  state: IPhoneTouchState,
  getZoom: () => number,
  setZoom: (zoom: number) => void,
): (() => void) => {
  let start: {
    distance: number;
    zoom: number;
    // The point between the fingers, as a share of the scrolled content.
    fx: number;
    fy: number;
  } | null = null;
  let inField = false;

  const isField = (target: EventTarget | null) =>
    target instanceof Element && !!target.closest('textarea, input');

  const centre = (touches: TouchList) => {
    const box = container.getBoundingClientRect();
    return {
      x: (touches[0].clientX + touches[1].clientX) / 2 - box.left,
      y: (touches[0].clientY + touches[1].clientY) / 2 - box.top,
    };
  };

  const begin = (touches: TouchList) => {
    const c = centre(touches);
    start = {
      distance: Math.max(1, distance(touches[0], touches[1])),
      zoom: getZoom(),
      fx: (container.scrollLeft + c.x) / Math.max(1, container.scrollWidth),
      fy: (container.scrollTop + c.y) / Math.max(1, container.scrollHeight),
    };
  };

  // Keeps the point that was between the fingers between them.
  const follow = (touches: TouchList) => {
    if (!start) return;
    const c = centre(touches);
    container.scrollLeft = start.fx * container.scrollWidth - c.x;
    container.scrollTop = start.fy * container.scrollHeight - c.y;
  };

  const onStart = (e: TouchEvent) => {
    if (e.touches.length === 1 && isField(e.target)) inField = true;
    if (inField && e.touches.length === 1) {
      e.stopPropagation();
      return;
    }
    if (e.touches.length >= 2) {
      inField = false;
      state.gesture = true;
      state.pending = null;
      begin(e.touches);
    }
    if (state.gesture) {
      if (e.cancelable) e.preventDefault();
      e.stopPropagation();
    }
  };

  const onMove = (e: TouchEvent) => {
    if (inField) {
      e.stopPropagation();
      return;
    }
    if (!state.gesture) return;
    if (e.cancelable) e.preventDefault();
    e.stopPropagation();
    if (e.touches.length < 2 || !start) return;

    const zoom = clampZoom(
      (start.zoom * distance(e.touches[0], e.touches[1])) / start.distance,
    );
    if (zoom !== getZoom()) setZoom(zoom);
    follow(e.touches);
    // The stage takes its new size after React renders: line the view up again then.
    const touches = e.touches;
    requestAnimationFrame(() => requestAnimationFrame(() => follow(touches)));
  };

  const onEnd = (e: TouchEvent) => {
    if (inField) {
      if (e.touches.length === 0) inField = false;
      e.stopPropagation();
      return;
    }
    if (!state.gesture) return;
    if (e.touches.length >= 2) {
      begin(e.touches);
      e.stopPropagation();
      return;
    }
    if (e.touches.length === 1) {
      // One finger is still down: wait for it to lift (or for another one to land).
      start = null;
      e.stopPropagation();
      return;
    }
    state.gesture = false;
    start = null;
    if (!state.pressed) e.stopPropagation();
  };

  const options = { capture: true, passive: false } as const;
  container.addEventListener('touchstart', onStart, options);
  container.addEventListener('touchmove', onMove, options);
  container.addEventListener('touchend', onEnd, options);
  container.addEventListener('touchcancel', onEnd, options);

  return () => {
    container.removeEventListener('touchstart', onStart, options);
    container.removeEventListener('touchmove', onMove, options);
    container.removeEventListener('touchend', onEnd, options);
    container.removeEventListener('touchcancel', onEnd, options);
    state.gesture = false;
  };
};

// The scale at which an image fills the width of the stage's container (its padding left out),
// never above its own size.
export const phoneFitScale = (
  container: HTMLElement,
  imageWidth: number,
): number => {
  const style = window.getComputedStyle(container);
  const room =
    container.clientWidth -
    (parseFloat(style.paddingLeft) || 0) -
    (parseFloat(style.paddingRight) || 0);

  if (!imageWidth || room <= 0) return 1;
  return Math.min(1, room / imageWidth);
};
