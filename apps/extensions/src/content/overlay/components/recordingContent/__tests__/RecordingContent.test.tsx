import path from 'path';
import { compile } from 'sass';
import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, screen } from '@testing-library/dom';
import userEvent, { UserEvent } from '@testing-library/user-event';
import { act } from 'react-dom/test-utils';
import { render } from '@/test/render';
import '@/test/i18n';
import RecordingContent from '../RecordingContent';

// jsdom has no canvas, and the drawing layer is not under test here.
jest.mock('react-canvas-draw', () => () => null);
// ControllerSlider imports the content script for its side effects.
jest.mock('@/content/content', () => ({}));

const HEX_NAME = /^#[0-9a-f]{6}$/i;

const renderBar = () =>
  render(
    <div className="rec">
      <RecordingContent
        fromEditor={false}
        recordingTime="00:05"
        recordStatus="play"
        microphoneMuted={false}
        microphoneEnabled
        muteOrUnmute={() => undefined}
        onStopRecording={() => undefined}
        onPauseRecording={() => undefined}
        onResumeRecording={() => undefined}
        onCancelRecording={() => undefined}
      />
    </div>,
  );

const tabTo = async (user: UserEvent, element: HTMLElement) => {
  for (let i = 0; i < 20 && document.activeElement !== element; i++) {
    await user.tab();
  }
  expect(element).toHaveFocus();
};

const swatchButton = () =>
  screen.getByRole('button', { name: 'Choose pen color' });

describe('recording bar colour swatch', () => {
  it('is a collapsed, named button that Tab reaches', async () => {
    const user = userEvent.setup();
    renderBar();

    const swatch = swatchButton();
    expect(swatch).toHaveAttribute('tabindex', '0');
    expect(swatch).toHaveAttribute('aria-expanded', 'false');
    await tabTo(user, swatch);
  });

  it('opens with Enter or Space and closes with Escape, keeping focus on the swatch', async () => {
    const user = userEvent.setup();
    renderBar();
    const swatch = swatchButton();
    await tabTo(user, swatch);

    await user.keyboard('{Enter}');
    expect(swatch).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getAllByRole('button', { name: HEX_NAME })).toHaveLength(21);

    await user.keyboard('{Escape}');
    expect(swatch).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryAllByRole('button', { name: HEX_NAME })).toHaveLength(0);
    expect(swatch).toHaveFocus();

    await user.keyboard(' ');
    expect(swatch).toHaveAttribute('aria-expanded', 'true');

    // Escape from inside the picker also closes it and returns focus.
    await user.tab();
    expect(screen.getAllByRole('button', { name: HEX_NAME })[0]).toHaveFocus();
    await user.keyboard('{Escape}');
    expect(swatch).toHaveAttribute('aria-expanded', 'false');
    expect(swatch).toHaveFocus();
  });

  it('lets Tab reach every colour, names it, and picks it with Enter', async () => {
    const user = userEvent.setup();
    renderBar();
    const swatch = swatchButton();
    await tabTo(user, swatch);
    await user.keyboard('{Enter}');

    const colours = screen.getAllByRole('button', { name: HEX_NAME });
    for (const colour of colours) {
      await user.tab();
      expect(colour).toHaveFocus();
    }

    const last = colours[colours.length - 1];
    const picked = last.getAttribute('title') as string;
    expect(last).toHaveAccessibleName(picked);
    // react-color reads the legacy keyCode, which browsers set and user-event
    // does not.
    fireEvent.keyDown(last, { key: 'Enter', keyCode: 13 });

    expect(swatch).toHaveAttribute('aria-expanded', 'false');
    expect(swatch).toHaveStyle({ background: picked });
    // The picked colour is gone, so focus goes back to the swatch.
    expect(swatch).toHaveFocus();
  });

  it('picks a colour with Space too', async () => {
    const user = userEvent.setup();
    renderBar();
    const swatch = swatchButton();
    await tabTo(user, swatch);
    await user.keyboard('{Enter}');
    await user.tab();

    await user.keyboard(' ');

    expect(swatch).toHaveAttribute('aria-expanded', 'false');
    expect(swatch).toHaveStyle({ background: '#B80000' });
    expect(swatch).toHaveFocus();
  });

  it('keeps the mouse behaviour: click opens, a clicked colour is picked, leaving the bar closes', async () => {
    // user-event moves the pointer with a null relatedTarget, which React reads
    // as leaving the bar, so click without the move.
    const user = userEvent.setup({ skipHover: true });
    const container = renderBar();
    const picker = container.querySelector('.colorPicker') as HTMLElement;
    const isOpen = () => !!container.querySelector('.color-picker-github');

    await user.click(picker);
    expect(isOpen()).toBe(true);
    await user.click(screen.getByTitle('#008B02'));
    expect(isOpen()).toBe(false);
    expect(container.querySelector('.colorPicker-icon')).toHaveStyle({
      background: '#008B02',
    });

    await user.click(picker);
    expect(isOpen()).toBe(true);
    await user.hover(picker);
    await user.unhover(picker);
    expect(isOpen()).toBe(false);
  });
});

describe('recording bar brush-size slider', () => {
  // The real stylesheet decides whether the slider shows. Add it after the
  // role queries: jsdom has no :hover or :focus-within, so with it the pen
  // tools read as hidden, and hidden elements have no accessible name.
  const style = document.createElement('style');
  style.textContent = compile(
    path.resolve(__dirname, '../recording-content.scss'),
  ).css;

  const withStyles = () => document.head.appendChild(style);

  afterEach(() => {
    style.remove();
    jest.restoreAllMocks();
  });

  it('has an accessible name', () => {
    renderBar();

    expect(
      screen.getByRole('slider', { name: 'Brush size' }),
    ).toBeInTheDocument();
  });

  it('shows while the pen button or the slider has keyboard focus', async () => {
    const user = userEvent.setup();
    renderBar();
    const pen = screen.getByRole('button', { name: 'Draw on screen' });
    const slider = screen.getByRole('slider', { name: 'Brush size' });
    withStyles();
    expect(slider).not.toBeVisible();

    act(() => pen.focus());
    expect(slider).toBeVisible();

    // A browser drops focus on an element that is hidden by the time it gets
    // focus, so the pen button's blur must not hide the slider it moves to.
    fireEvent.focusOut(pen, { relatedTarget: slider });
    expect(slider).toBeVisible();

    // The slider follows the pen button in the Tab order.
    await user.tab();
    expect(slider).toHaveFocus();
    expect(slider).toBeVisible();

    await user.tab();
    expect(slider).not.toHaveFocus();
    expect(slider).not.toBeVisible();
  });

  it('keeps the mouse behaviour: hover shows it, a click does not pin it open', async () => {
    // jsdom counts every focus as :focus-visible; a real mouse click does not.
    const matches = Element.prototype.matches;
    jest
      .spyOn(Element.prototype, 'matches')
      .mockImplementation(function (this: Element, selector: string) {
        return selector === ':focus-visible'
          ? false
          : matches.call(this, selector);
      });
    const user = userEvent.setup();
    const container = renderBar();
    const pen = container.querySelector('.penButton') as HTMLElement;
    const slider = container.querySelector(
      '.penSlider input',
    ) as HTMLInputElement;
    withStyles();

    await user.hover(pen);
    expect(slider).toBeVisible();
    await user.unhover(pen);
    expect(slider).not.toBeVisible();

    await user.click(pen);
    await user.unhover(pen);
    expect(slider).not.toBeVisible();
  });
});
