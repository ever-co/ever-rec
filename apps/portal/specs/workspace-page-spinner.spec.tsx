import React from 'react';
import { createRoot, Root } from 'react-dom/client';

// The workspace page covers itself with a full-page spinner while it creates a folder or uploads
// a file. A request that failed (403 when the parent folder is gone or the member lost write on
// it, 400, 500, no network) left the spinner on until a reload, and only a 403 said why.

interface IDeferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (error: unknown) => void;
}
const deferred = <T,>(): IDeferred<T> => {
  let resolve: (value: T) => void = () => undefined;
  let reject: (error: unknown) => void = () => undefined;
  const promise = new Promise<T>((done, fail) => {
    resolve = done;
    reject = fail;
  });
  return { promise, resolve, reject };
};

const WORKSPACE = {
  id: 'ws-1',
  name: 'Acme Robotics',
  admin: 'u1',
  folders: [],
  screenshots: [],
  videos: [],
  teams: [],
  members: [],
};

let mockState: any;
let mockFolderModal: {
  onCreateFolder: (name: string, color: string) => Promise<void>;
};
let mockUploadModal: { onDrop: (event: unknown) => Promise<void> };
const mockDispatch = jest.fn();
const mockRouter = { query: { workspaceId: 'ws-1' }, push: jest.fn() };

jest.mock('next/router', () => ({ useRouter: () => mockRouter }));
jest.mock('react-redux', () => ({
  useSelector: (selector: (state: any) => unknown) => selector(mockState),
  useDispatch: () => mockDispatch,
}));
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
jest.mock('app/services/api/workspace', () => ({
  createWorkspaceFolderAPI: jest.fn(),
}));
jest.mock('app/services/workspace', () => ({
  uploadWorkspaceImageFile: jest.fn(),
  uploadWorkspaceVideoFile: jest.fn(),
}));
jest.mock('app/services/workspaceTeams', () => ({
  leaveWorkspaceTeam: jest.fn(),
}));
jest.mock('app/services/helpers/toastMessages', () => ({
  errorMessage: jest.fn(),
  infoMessage: jest.fn(),
  successMessage: jest.fn(),
  loadingMessage: jest.fn(),
  updateMessage: jest.fn(),
}));
jest.mock('hooks/useAuthenticateUser', () => ({
  __esModule: true,
  default: () => ({ id: 'u1', photoURL: '' }),
}));
jest.mock('hooks/useWorkspaceItemsPermission', () => ({
  __esModule: true,
  default: () => ({
    canEdit: true,
    canViewItem: () => true,
    canEditItem: () => true,
  }),
}));
jest.mock('hooks/useFolderOrder', () => ({
  __esModule: true,
  default: () => ({
    folderData: [],
    handleFolderOrderByName: jest.fn(),
    handleFolderOrderByDate: jest.fn(),
  }),
}));
jest.mock('hooks/useItemOrder', () => ({
  __esModule: true,
  default: () => ({
    itemData: [],
    handleItemOrderByName: jest.fn(),
    handleItemOrderByDate: jest.fn(),
  }),
}));
jest.mock('hooks/useItemsFilter', () => ({
  __esModule: true,
  default: () => ({
    filter: '',
    filterItemData: [],
    onFilterChange: jest.fn(),
  }),
}));

// The page around the spinner is not under test.
jest.mock('../pages/media/index', () => ({
  __esModule: true,
  default: ({ children }: any) => <div>{children}</div>,
}));
jest.mock('components/containers/appSpinner/AppSpinner', () => ({
  __esModule: true,
  default: ({ show }: { show: boolean }) =>
    show ? <div data-testid="app-spinner" /> : null,
}));
jest.mock(
  'components/pagesComponents/_imagesScreen/components/CreateFolderModal',
  () => ({
    __esModule: true,
    default: (props: any) => {
      mockFolderModal = props;
      return null;
    },
  }),
);
jest.mock('components/shared/UploadImageModal', () => ({
  __esModule: true,
  default: (props: any) => {
    mockUploadModal = props;
    return null;
  },
}));
jest.mock(
  'components/containers/dashboardLayout/elements/DashboardCard',
  () => ({
    __esModule: true,
    default: ({ children }: any) => <div>{children}</div>,
  }),
);
jest.mock(
  'components/pagesComponents/_imagesScreen/pages/workspace/WorkspaceItemsContainer',
  () => ({ __esModule: true, default: () => null }),
);
jest.mock(
  'components/pagesComponents/_imagesScreen/components/SortingDropDown',
  () => ({ __esModule: true, default: () => null }),
);
jest.mock(
  'components/pagesComponents/_imagesScreen/components/folderItem/FolderItem',
  () => ({ __esModule: true, default: () => null }),
);
jest.mock(
  'components/pagesComponents/_workspaceScreen/WorkspaceFolderHistory',
  () => ({ __esModule: true, default: () => null }),
);
jest.mock(
  'components/pagesComponents/_imagesScreen/pages/workspace/workspaceTeamsModal/WorkspaceTeamsModal',
  () => ({ __esModule: true, default: () => null }),
);
jest.mock(
  'components/pagesComponents/_workspacesScreen/WorkspaceTeamMembers',
  () => ({ __esModule: true, default: () => null }),
);
jest.mock(
  'components/pagesComponents/_imagesScreen/pages/myVideos/LibraryActions',
  () => ({ __esModule: true, default: () => null }),
);
jest.mock('components/shared/SCHeader/SCHeader', () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock(
  'components/pagesComponents/_imagesScreen/pages/workspace/InviteMembersModal/InviteMembersModal',
  () => ({ __esModule: true, default: () => null }),
);

import { createWorkspaceFolderAPI } from 'app/services/api/workspace';
import {
  uploadWorkspaceImageFile,
  uploadWorkspaceVideoFile,
} from 'app/services/workspace';
import { errorMessage } from 'app/services/helpers/toastMessages';
import Workspace from '../pages/media/workspace/[workspaceId]/index';

const mockCreateFolder = createWorkspaceFolderAPI as jest.Mock;
const mockUploadImage = uploadWorkspaceImageFile as jest.Mock;
const mockUploadVideo = uploadWorkspaceVideoFile as jest.Mock;

// React 18.3 exports `act`; the pinned type definitions do not declare it yet.
const act: (callback: () => void | Promise<void>) => Promise<void> = (
  React as any
).act;

/** An error as the API client rejects it: axios' error, after the response interceptor ran. */
const httpError = (status: number, message: string) =>
  Object.assign(new Error(`Request failed with status code ${status}`), {
    response: { status, data: { statusCode: status, message } },
  });
const networkError = () => new Error('Network Error');

let container: HTMLDivElement;
let root: Root;

const spinnerShown = () =>
  container.querySelector('[data-testid="app-spinner"]') !== null;

const settle = () =>
  act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

/**
 * Creates a folder from the modal and lets the request fail or succeed. Says whether the
 * handler itself rejected: an event handler's rejection reaches nobody.
 */
const createFolder = async (answer: (request: IDeferred<any>) => void) => {
  const request = deferred<any>();
  mockCreateFolder.mockReturnValue(request.promise);

  let outcome!: Promise<'resolved' | 'rejected'>;
  await act(async () => {
    outcome = mockFolderModal.onCreateFolder('Designs', '#2f80ed').then(
      () => 'resolved' as const,
      () => 'rejected' as const,
    );
  });
  expect(spinnerShown()).toBe(true);

  await act(async () => {
    answer(request);
    await outcome;
  });
  return outcome;
};

const fileInput = (accept: RegExp) => {
  const input = Array.from(
    container.querySelectorAll<HTMLInputElement>('input[type="file"]'),
  ).find((element) => accept.test(element.accept));
  if (!input) throw new Error(`no file input accepting ${accept}`);
  return input;
};

/** Picks a file in one of the page's hidden file inputs, as the browser does. */
const pickFile = async (input: HTMLInputElement, file: File) => {
  Object.defineProperty(input, 'files', {
    configurable: true,
    value: [file],
  });
  Object.defineProperty(input, 'value', {
    configurable: true,
    get: () => `C:\\fakepath\\${file.name}`,
  });
  await act(async () => {
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
};

beforeAll(() => {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
});

beforeEach(async () => {
  jest.clearAllMocks();
  mockState = {
    panel: {
      activeWorkspace: WORKSPACE,
      currentWorkspaceFolder: null,
      workspaceFolderOrder: 'date',
      workspaceItemOrder: 'date',
      workspaceLoaded: true,
      favoriteFolders: {},
    },
  };
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root.render(<Workspace />);
  });
  expect(spinnerShown()).toBe(false);
  // What the page dispatched while it opened.
  mockDispatch.mockClear();
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});

describe('workspace page: creating a folder', () => {
  it('a 403 clears the spinner without a second toast: the API client shows one', async () => {
    const outcome = await createFolder((request) =>
      request.reject(httpError(403, 'Forbidden resource')),
    );

    expect(spinnerShown()).toBe(false);
    expect(outcome).toBe('resolved');
    expect(errorMessage).not.toHaveBeenCalled();
    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it.each([
    [
      'a 500',
      () => httpError(500, 'Internal server error'),
      'Internal server error',
    ],
    [
      'a 400',
      () => httpError(400, 'name must be a string'),
      'name must be a string',
    ],
    ['no network', networkError, 'Network Error'],
  ])('%s clears the spinner and says why', async (_name, error, message) => {
    const outcome = await createFolder((request) => request.reject(error()));

    expect(spinnerShown()).toBe(false);
    expect(outcome).toBe('resolved');
    expect(errorMessage).toHaveBeenCalledTimes(1);
    expect(errorMessage).toHaveBeenCalledWith(message);
  });

  it('a created folder clears the spinner and lists the folders', async () => {
    const folders = [{ id: 'f1', name: 'Designs', parentId: false }];
    const outcome = await createFolder((request) =>
      request.resolve({ status: 'success', data: folders }),
    );

    expect(spinnerShown()).toBe(false);
    expect(outcome).toBe('resolved');
    expect(errorMessage).not.toHaveBeenCalled();
    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.objectContaining({ id: 'ws-1', folders }),
      }),
    );
  });
});

describe('workspace page: uploading a file', () => {
  const image = () => new File(['png'], 'shot.png', { type: 'image/png' });
  const video = () => new File(['mp4'], 'clip.mp4', { type: 'video/mp4' });

  it('a dropped image the API refuses clears the spinner and says why', async () => {
    mockUploadImage.mockRejectedValue(httpError(500, 'Upload failed'));

    let outcome!: Promise<'resolved' | 'rejected'>;
    await act(async () => {
      outcome = mockUploadModal
        .onDrop({
          preventDefault: () => undefined,
          dataTransfer: { files: [image()] },
        })
        .then(
          () => 'resolved' as const,
          () => 'rejected' as const,
        );
      await outcome;
    });
    await settle();

    expect(spinnerShown()).toBe(false);
    expect(await outcome).toBe('resolved');
    expect(errorMessage).toHaveBeenCalledWith('Upload failed');
  });

  it('a picked image the API refuses clears the spinner and says why', async () => {
    mockUploadImage.mockRejectedValue(httpError(500, 'Upload failed'));

    await pickFile(fileInput(/image\//), image());
    await settle();

    expect(mockUploadImage).toHaveBeenCalledTimes(1);
    expect(spinnerShown()).toBe(false);
    expect(errorMessage).toHaveBeenCalledWith('Upload failed');
  });

  it('a picked video the API refuses clears the spinner and says why', async () => {
    mockUploadVideo.mockRejectedValue(networkError());

    await pickFile(fileInput(/video\//), video());
    await settle();

    expect(mockUploadVideo).toHaveBeenCalledTimes(1);
    expect(spinnerShown()).toBe(false);
    expect(errorMessage).toHaveBeenCalledWith('Network Error');
  });
});
