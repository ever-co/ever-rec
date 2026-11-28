/**
 * PUT /image/folder and /video/folder answer 404 for a folder that is not stored (one deleted in
 * another tab) and 400 for a new parent. The api client rejects such an answer. A rename then ends
 * with the rename-error toast instead of a loading toast that never closes, and a color change
 * clears the page's loading state.
 */
import React from 'react';
import { createRoot, Root } from 'react-dom/client';

import FolderItem from '../components/pagesComponents/_imagesScreen/components/folderItem/FolderItem';
import { updateFolderData } from 'app/services/screenshots';
import { updateVideoFolderData } from 'app/services/videos';
import {
  loadingMessage,
  updateMessage,
} from 'app/services/helpers/toastMessages';

// React 18.3 exports `act`; the pinned type definitions do not declare it yet.
const act: (callback: () => void | Promise<void>) => Promise<void> = (
  React as any
).act;

jest.mock('app/services/screenshots', () => ({
  updateFolderData: jest.fn(),
  deleteImageFolders: jest.fn(),
}));
jest.mock('app/services/videos', () => ({
  updateVideoFolderData: jest.fn(),
  deleteVideoFolders: jest.fn(),
}));
jest.mock('app/services/workspace', () => ({
  updateWorkspaceFolderData: jest.fn(),
}));
jest.mock('app/services/api/workspace', () => ({
  addWorkspaceFolderToFavsAPI: jest.fn(),
  deleteWorkspaceFolderAPI: jest.fn(),
}));
jest.mock('app/services/api/image', () => ({
  addImageFolderToFavsAPI: jest.fn(),
}));
jest.mock('app/services/api/video', () => ({
  addVideoFolderToFavsAPI: jest.fn(),
}));
jest.mock('app/services/helpers/toastMessages', () => ({
  loadingMessage: jest.fn(() => 'toast-1'),
  updateMessage: jest.fn(),
  errorMessage: jest.fn(),
  infoMessage: jest.fn(),
  successMessage: jest.fn(),
}));
jest.mock('react-redux', () => ({
  useDispatch: () => jest.fn(),
  useSelector: (select: (state: any) => any) =>
    select({
      auth: { user: { id: 'uid-owner' } },
      panel: { currentWorkspaceFolder: null, favoriteFolders: {} },
    }),
}));
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
jest.mock('antd', () => {
  const Menu: any = function Menu({ children }: any) {
    return <div>{children}</div>;
  };
  Menu.Item = function MenuItem({ children }: any) {
    return <div>{children}</div>;
  };
  return { Menu };
});
jest.mock('components/elements/AppSvg', () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock(
  'components/pagesComponents/_imagesScreen/components/PermissionsModal/PermissionsModal',
  () => ({
    __esModule: true,
    default: () => null,
  }),
);
jest.mock(
  'components/pagesComponents/_imagesScreen/components/DeleteFolderModal',
  () => ({
    __esModule: true,
    default: () => null,
  }),
);
jest.mock(
  'components/pagesComponents/_imagesScreen/components/EditFolderModal',
  () => ({
    __esModule: true,
    default: ({ onEditFolder }: any) => (
      <button data-testid="rename" onClick={() => onEditFolder('New name')} />
    ),
  }),
);
jest.mock(
  'components/pagesComponents/_imagesScreen/components/ColorElement',
  () => ({
    __esModule: true,
    default: ({ colorId, handleColor }: any) => (
      <button
        data-testid={`color-${colorId}`}
        onClick={() => handleColor(colorId)}
      />
    ),
  }),
);
jest.mock(
  'components/pagesComponents/_imagesScreen/components/folderItem/FolderHeader',
  () => ({
    __esModule: true,
    default: ({ moreMenu }: any) => <div>{moreMenu}</div>,
  }),
);
jest.mock(
  'components/pagesComponents/_imagesScreen/components/folderItem/FolderInfo',
  () => ({
    __esModule: true,
    default: () => null,
  }),
);

const notFound = Object.assign(
  new Error('Request failed with status code 404'),
  {
    response: {
      status: 404,
      data: { statusCode: 404, message: 'Folder not found' },
    },
  },
);

const folder: any = {
  id: 'gone',
  name: 'Gone',
  parentId: false,
  color: '#fff',
  items: 0,
  nestLevel: 0,
};

let container: HTMLDivElement;
let root: Root;

const render = (forVideos: boolean, setLoading: jest.Mock) =>
  act(async () => {
    root.render(
      <FolderItem
        folder={folder}
        canEdit
        isFavorite={false}
        forVideos={forVideos}
        setLoading={setLoading}
        onClick={() => undefined}
        onDrop={() => undefined}
      />,
    );
  });

const click = (testId: string) =>
  act(async () => {
    (
      container.querySelector(`[data-testid="${testId}"]`) as HTMLButtonElement
    ).click();
  });

beforeAll(() => {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
});

beforeEach(() => {
  jest.spyOn(console, 'error').mockImplementation(() => undefined);
  (updateFolderData as jest.Mock).mockReset().mockRejectedValue(notFound);
  (updateVideoFolderData as jest.Mock).mockReset().mockRejectedValue(notFound);
  (loadingMessage as jest.Mock).mockClear();
  (updateMessage as jest.Mock).mockClear();
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  jest.restoreAllMocks();
});

describe.each([
  ['image', false, () => updateFolderData],
  ['video', true, () => updateVideoFolderData],
])(
  'FolderItem (%s) when the folder update is refused',
  (_type, forVideos, update) => {
    it('replaces the renaming toast with the rename error', async () => {
      await render(forVideos, jest.fn());
      await click('rename');

      expect(update()).toHaveBeenCalledWith(
        { ...folder, name: 'New name' },
        false,
      );
      expect(loadingMessage).toHaveBeenCalledWith('toasts.renamingFolder');
      expect(updateMessage).toHaveBeenCalledWith(
        'toast-1',
        'toasts.folderRenameError',
        'error',
      );
    });

    it('clears the loading state after a refused color change', async () => {
      const setLoading = jest.fn();
      await render(forVideos, setLoading);
      // One button per palette color; any of them sends the update.
      const colorButton = container.querySelector(
        '[data-testid^="color-"]',
      ) as HTMLButtonElement;
      await act(async () => colorButton.click());

      expect(update()).toHaveBeenCalledTimes(1);
      expect(setLoading.mock.calls).toEqual([[true], [false]]);
    });
  },
);
