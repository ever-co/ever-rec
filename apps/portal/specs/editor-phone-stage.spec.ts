import {
  attachPinchZoom,
  bridgeTouchToMouse,
  createPhoneTouchState,
  phoneFitScale,
} from 'components/pagesComponents/_editorScreen/editorHelpers/phoneStage';

// The image editor at phone width: one finger is the drawing tools' mouse, two fingers pinch and
// pan the stage, and the stage starts fitted to the width of the screen.

type Handler = (e: any) => void;

// Just enough of a Konva stage and node: named listeners, `fire` with bubbling to the stage.
const makeStage = () => {
  const listeners: { name: string; ns: string; handler: Handler }[] = [];
  const fired: { type: string; target: string; pointer: unknown }[] = [];
  let pointer: unknown = null;

  const stage: any = {
    on(names: string, handler: Handler) {
      names.split(' ').forEach((full) => {
        const [name, ns = ''] = full.split('.');
        listeners.push({ name, ns, handler });
      });
    },
    off(names: string) {
      const [name, ns = ''] = names.split('.');
      for (let i = listeners.length - 1; i >= 0; i--) {
        if (
          (!name || listeners[i].name === name) &&
          (!ns || listeners[i].ns === ns)
        ) {
          listeners.splice(i, 1);
        }
      }
    },
    setPointersPositions(evt: any) {
      pointer = evt.at;
    },
    emit(name: string, target: any, evt: any) {
      listeners
        .filter((l) => l.name === name)
        .forEach((l) => l.handler({ type: name, target, evt }));
    },
  };

  const node = (id: string, own: Record<string, unknown[]> = {}): any => ({
    id,
    eventListeners: own,
    fire(type: string) {
      fired.push({ type, target: id, pointer });
    },
  });

  return { stage, node, fired, listenerCount: () => listeners.length };
};

const touchEvent = (at: string) => ({
  at,
  cancelable: true,
  preventDefault: jest.fn(),
  changedTouches: [{ clientX: 10, clientY: 20 }],
});

describe('bridgeTouchToMouse', () => {
  it('hands a one-finger drag to the tools as mousedown, mousemove, mouseup', () => {
    const { stage, node, fired } = makeStage();
    const state = createPhoneTouchState();
    bridgeTouchToMouse(stage, state);
    const main = node('main');
    const windowUps = jest.fn();
    window.addEventListener('mouseup', windowUps);

    const start = touchEvent('landed');
    stage.emit('touchstart', main, start);
    expect(start.preventDefault).toHaveBeenCalled();
    // Nothing yet: the finger may be the first of a pinch.
    expect(fired).toEqual([]);

    stage.emit('touchmove', main, touchEvent('moved'));
    stage.emit('touchend', main, touchEvent('lifted'));

    expect(fired.map((f) => f.type)).toEqual([
      'mousedown',
      'mousemove',
      'mouseup',
    ]);
    // The press is where the finger landed, the move where it went.
    expect(fired[0].pointer).toBe('landed');
    expect(fired[1].pointer).toBe('moved');
    // Code outside Konva (the text box) hears the release on the window.
    expect(windowUps).toHaveBeenCalledTimes(1);
    window.removeEventListener('mouseup', windowUps);
  });

  it('turns a tap into a press and a release on the lift, and `tap` into `click`', () => {
    const { stage, node, fired } = makeStage();
    bridgeTouchToMouse(stage, createPhoneTouchState());
    const main = node('main');

    stage.emit('touchstart', main, touchEvent('here'));
    stage.emit('touchend', main, touchEvent('here'));
    stage.emit('tap', main, touchEvent('here'));

    expect(fired.map((f) => f.type)).toEqual(['mousedown', 'mouseup', 'click']);
  });

  it('gives no press to the first finger of a pinch', () => {
    const { stage, node, fired } = makeStage();
    const state = createPhoneTouchState();
    bridgeTouchToMouse(stage, state);
    const main = node('main');

    stage.emit('touchstart', main, touchEvent('first finger'));
    // attachPinchZoom marks the gesture when the second finger lands.
    state.gesture = true;
    state.pending = null;
    stage.emit('touchmove', main, touchEvent('pinching'));
    state.gesture = false;
    stage.emit('touchend', main, touchEvent('lifted'));

    expect(fired).toEqual([]);
  });

  it('makes a double tap a double click, except on shapes that listen to dbltap', () => {
    const { stage, node, fired } = makeStage();
    bridgeTouchToMouse(stage, createPhoneTouchState());

    stage.emit('dbltap', node('marker'), touchEvent('x'));
    stage.emit('dbltap', node('text', { dbltap: [{}] }), touchEvent('x'));

    expect(fired).toEqual([
      { type: 'dblclick', target: 'marker', pointer: null },
    ]);
  });

  it('removes only its own listeners', () => {
    const { stage, listenerCount } = makeStage();
    stage.on('mousedown', jest.fn());
    const detach = bridgeTouchToMouse(stage, createPhoneTouchState());
    expect(listenerCount()).toBe(6);

    detach();
    expect(listenerCount()).toBe(1);
  });
});

describe('attachPinchZoom', () => {
  const touches = (...points: [number, number][]) =>
    points.map(([clientX, clientY]) => ({ clientX, clientY }));

  const dispatch = (el: HTMLElement, type: string, list: unknown[]) => {
    const event = new Event(type, { bubbles: true, cancelable: true });
    Object.defineProperty(event, 'touches', { value: list });
    el.dispatchEvent(event);
    return event;
  };

  it('zooms with two fingers, within 25 to 200%, and keeps them from the stage', () => {
    const container = document.createElement('div');
    const canvas = document.createElement('canvas');
    container.appendChild(canvas);
    document.body.appendChild(container);

    const state = createPhoneTouchState();
    let zoom = 100;
    const setZoom = jest.fn((value: number) => (zoom = value));
    const detach = attachPinchZoom(container, state, () => zoom, setZoom);
    const reachedStage = jest.fn();
    canvas.addEventListener('touchmove', reachedStage);

    dispatch(canvas, 'touchstart', touches([100, 100], [140, 100]));
    expect(state.gesture).toBe(true);

    // The fingers move three times as far apart: 300%, held at the 200% ceiling.
    const move = dispatch(canvas, 'touchmove', touches([60, 100], [180, 100]));
    expect(move.defaultPrevented).toBe(true);
    expect(setZoom).toHaveBeenLastCalledWith(200);
    expect(reachedStage).not.toHaveBeenCalled();

    dispatch(canvas, 'touchend', []);
    expect(state.gesture).toBe(false);

    detach();
    container.remove();
  });

  it('leaves one finger alone', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const state = createPhoneTouchState();
    const setZoom = jest.fn();
    const detach = attachPinchZoom(container, state, () => 100, setZoom);

    const start = dispatch(container, 'touchstart', touches([10, 10]));
    const move = dispatch(container, 'touchmove', touches([30, 30]));

    expect(state.gesture).toBe(false);
    expect(start.defaultPrevented).toBe(false);
    expect(move.defaultPrevented).toBe(false);
    expect(setZoom).not.toHaveBeenCalled();

    detach();
    container.remove();
  });
});

describe('attachPinchZoom with a text box over the stage', () => {
  it('leaves a finger on the text box to the browser, out of the stage', () => {
    const container = document.createElement('div');
    const content = document.createElement('div');
    const textarea = document.createElement('textarea');
    content.appendChild(textarea);
    container.appendChild(content);
    document.body.appendChild(container);
    const state = createPhoneTouchState();
    const detach = attachPinchZoom(container, state, () => 100, jest.fn());
    // Konva listens on its content element.
    const reachedStage = jest.fn();
    ['touchstart', 'touchmove', 'touchend'].forEach((type) =>
      content.addEventListener(type, reachedStage),
    );

    const touch = (type: string, count: number) => {
      const event = new Event(type, { bubbles: true, cancelable: true });
      Object.defineProperty(event, 'touches', {
        value: Array.from({ length: count }, () => ({
          clientX: 5,
          clientY: 5,
        })),
      });
      textarea.dispatchEvent(event);
      return event;
    };
    const start = touch('touchstart', 1);
    touch('touchmove', 1);
    touch('touchend', 0);

    expect(reachedStage).not.toHaveBeenCalled();
    // Not prevented: the browser places the caret.
    expect(start.defaultPrevented).toBe(false);
    expect(state.gesture).toBe(false);

    detach();
    container.remove();
  });
});

describe('phoneFitScale', () => {
  const box = (width: number, padding: number) => {
    const el = document.createElement('div');
    el.style.paddingLeft = `${padding}px`;
    el.style.paddingRight = `${padding}px`;
    Object.defineProperty(el, 'clientWidth', { value: width });
    return el;
  };

  it('fits a wide image to the room inside the padding', () => {
    expect(phoneFitScale(box(390, 12), 1280)).toBeCloseTo(366 / 1280);
  });

  it('never enlarges a small image', () => {
    expect(phoneFitScale(box(390, 12), 200)).toBe(1);
  });
});
