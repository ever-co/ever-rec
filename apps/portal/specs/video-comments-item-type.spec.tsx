import React from 'react';
import { createRoot, Root } from 'react-dom/client';

// The comment box under a single image and a single video is the same component. The API only
// accepts a comment on an item that exists in the owner's collection of that type, so the image
// page must read and post comments as an image, not as a video.

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
jest.mock('app/services/helpers/toastMessages', () => ({
  errorMessage: jest.fn(),
  infoMessage: jest.fn(),
}));
jest.mock('components/controls/AppButton2', () => ({
  __esModule: true,
  default: ({ onClick, children }: any) => (
    <button data-testid="add" onClick={onClick}>
      {children}
    </button>
  ),
}));
jest.mock(
  'components/pagesComponents/_videoEditorScreen/comments/CommentElement/CommentElement',
  () => ({
    __esModule: true,
    default: ({ comment }: any) => <p>{comment.content}</p>,
  }),
);
jest.mock('app/services/api/imageandvideo', () => ({
  getUpdatedComments: jest.fn(),
  addComment: jest.fn(),
  updateComment: jest.fn(),
  deleteComment: jest.fn(),
}));

import { addComment, getUpdatedComments } from 'app/services/api/imageandvideo';
import VideoComments from '../components/pagesComponents/_videoEditorScreen/comments/VideoComments/VideoComments';

// React 18.3 exports `act`; the pinned type definitions do not declare it yet.
const act: (callback: () => void | Promise<void>) => Promise<void> = (
  React as any
).act;

const mockGetUpdatedComments = getUpdatedComments as jest.Mock;
const mockAddComment = addComment as jest.Mock;

let container: HTMLDivElement;
let root: Root;

const render = (props: Record<string, unknown> = {}) =>
  act(async () => {
    root.render(
      <VideoComments userId="u1" itemOwnerId="u1" itemId="i1" {...props} />,
    );
  });

const typeAndPost = async (text: string) => {
  const input = container.querySelector('input') as HTMLInputElement;
  await act(async () => {
    const setValue = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      'value',
    )?.set;
    setValue?.call(input, text);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await act(async () => {
    (container.querySelector('[data-testid="add"]') as HTMLElement).click();
  });
};

beforeAll(() => {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
});

beforeEach(() => {
  jest.clearAllMocks();
  mockGetUpdatedComments.mockResolvedValue({ comments: [] });
  mockAddComment.mockResolvedValue({ data: { id: 'c1', content: 'hi' } });
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});

describe('comment box item type', () => {
  it('reads and posts the comments of an image as an image', async () => {
    await render({ itemType: 'image' });
    await typeAndPost('hi');

    expect(mockGetUpdatedComments).toHaveBeenCalledWith(
      'image',
      'i1',
      false,
      'u1',
    );
    expect(mockAddComment).toHaveBeenCalledWith(
      'image',
      'u1',
      'i1',
      'hi',
      false,
    );
  });

  // Workspace items have no comment storage: the box is not shown and asks the API for nothing.
  it('shows no comment box and requests nothing for a workspace item', async () => {
    await render({ itemType: 'image', isWorkspace: true });

    expect(container.querySelector('input')).toBeNull();
    expect(container.textContent).toBe('');
    expect(mockGetUpdatedComments).not.toHaveBeenCalled();
    expect(mockAddComment).not.toHaveBeenCalled();
  });

  it('keeps treating the item as a video by default', async () => {
    await render();
    await typeAndPost('hi');

    expect(mockGetUpdatedComments).toHaveBeenCalledWith(
      'video',
      'i1',
      false,
      'u1',
    );
    expect(mockAddComment).toHaveBeenCalledWith(
      'video',
      'u1',
      'i1',
      'hi',
      false,
    );
  });
});
