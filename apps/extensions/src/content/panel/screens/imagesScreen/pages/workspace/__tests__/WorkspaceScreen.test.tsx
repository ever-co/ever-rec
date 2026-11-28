import { act } from 'react-dom/test-utils';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import userEvent from '@testing-library/user-event';
import { render } from '@/test/render';
import { createWorkspaceFolderAPI } from '@/app/services/api/workspace';
import {
  uploadWorkspaceImageFile,
  uploadWorkspaceVideoFile,
} from '@/app/services/workspace';
import { errorMessage } from '@/app/services/helpers/toastMessages';
import Workspace from '../WorkspaceScreen';

// The workspace screen covers itself with a spinner while it creates a folder or uploads an
// image or a video. A request that failed (403 when the parent folder is gone or the member
// lost write on it, 400, 500, no network) left the spinner on: for a 403 until the API client
// moved to another page, for any other error until the panel was reloaded, and without a word.

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

let mockState: any;
let mockFolderModal: {
  onCreateFolder: (name: string, color: string) => Promise<void>;
};
let mockUploadImageModal: {
  onDrop: (event: unknown) => Promise<void>;
};
const mockDispatch = jest.fn();
// One object for every render, as the router gives: the screen's effects depend on it.
const mockSearchParams = new URLSearchParams();

jest.mock('react-redux', () => ({
  useSelector: (selector: (state: any) => unknown) => selector(mockState),
  useDispatch: () => mockDispatch,
}));
jest.mock('react-router-dom', () => ({
  useSearchParams: () => [mockSearchParams, () => undefined],
}));
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
jest.mock('@/app/store/panel/actions/PanelAC', () => ({
  __esModule: true,
  default: {
    setActiveWorkspace: (payload: unknown) => ({
      type: 'SET_ACTIVE_WORKSPACE',
      payload,
    }),
    setCurrentWorkspaceFolder: (payload: unknown) => ({
      type: 'SET_CURRENT_WORKSPACE_FOLDER',
      payload,
    }),
  },
}));
jest.mock('@/app/services/api/workspace', () => ({
  createWorkspaceFolderAPI: jest.fn(),
}));
jest.mock('@/app/services/workspace', () => ({
  uploadWorkspaceImageFile: jest.fn(),
  uploadWorkspaceVideoFile: jest.fn(),
}));
jest.mock('@/app/services/screenshots', () => ({ uploadFile: jest.fn() }));
jest.mock('@/app/services/workspaceTeams', () => ({
  leaveWorkspaceTeam: jest.fn(),
}));
jest.mock('@/app/services/helpers/toastMessages', () => ({
  errorMessage: jest.fn(),
  infoMessage: jest.fn(),
  successMessage: jest.fn(),
  loadingMessage: jest.fn(),
  updateMessage: jest.fn(),
}));
jest.mock('@/content/panel/hooks/useWorkspaceItemsPermission', () => ({
  __esModule: true,
  default: () => ({
    canEdit: true,
    canViewItem: () => true,
    canEditItem: () => true,
  }),
}));
jest.mock(
  '@/content/panel/screens/imagesScreen/pages/shared/hooks/useFolderOrder',
  () => ({
    __esModule: true,
    default: () => ({
      folderData: [],
      handleFolderOrderByName: () => undefined,
      handleFolderOrderByDate: () => undefined,
    }),
  }),
);
jest.mock('../../shared/hooks/useItemOrder', () => ({
  __esModule: true,
  default: () => ({
    itemData: [],
    handleItemOrderByName: () => undefined,
    handleItemOrderByDate: () => undefined,
  }),
}));
jest.mock('@/content/panel/hooks/useItemsFilter', () => ({
  __esModule: true,
  default: () => ({
    filter: '',
    filterItemData: [],
    onFilterChange: () => undefined,
  }),
}));

// The screen around the spinner is not under test.
jest.mock('@/content/components/containers/appSpinner/AppSpinner', () => ({
  __esModule: true,
  default: ({ show }: { show: boolean }) =>
    show ? <div data-testid="app-spinner" /> : null,
}));
jest.mock(
  '@/content/panel/screens/imagesScreen/components/createFolderModal/CreateFolderModal',
  () => ({
    __esModule: true,
    default: (props: any) => {
      mockFolderModal = props;
      return null;
    },
  }),
);
jest.mock(
  '@/content/panel/components/containers/dashboardLayout/elements/DashboardCard',
  () => ({
    __esModule: true,
    default: ({ children }: any) => <div>{children}</div>,
  }),
);
jest.mock(
  '@/content/panel/screens/imagesScreen/components/sortingDropDown/SortingDropDown',
  () => ({ __esModule: true, default: () => null }),
);
jest.mock(
  '@/content/panel/screens/imagesScreen/components/folderItem/FolderItem',
  () => ({ __esModule: true, default: () => null }),
);
jest.mock(
  '@/content/panel/screens/imagesScreen/pages/workspace/WorkspaceItemsContainer',
  () => ({ __esModule: true, default: () => null }),
);
jest.mock(
  '@/content/panel/screens/imagesScreen/pages/workspace/WorkspaceFolderHistory',
  () => ({ __esModule: true, default: () => null }),
);
jest.mock('../workspaceTeamsModal/WorkspaceTeamsModal', () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock('../../workspaces/WorkspaceTeamMembers', () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock('../../shared/components/LibraryActions', () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock('../../../components/uploadImageModal/UploadImageModal', () => ({
  __esModule: true,
  default: (props: any) => {
    mockUploadImageModal = props;
    return null;
  },
}));
jest.mock('@/content/panel/shared/SCHeader/SCHeader', () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock('../InviteMembersModal/InviteMembersModal', () => ({
  __esModule: true,
  default: () => null,
}));

const mockCreateFolder = createWorkspaceFolderAPI as unknown as jest.Mock<
  (...args: unknown[]) => Promise<unknown>
>;
const mockUploadImage = uploadWorkspaceImageFile as unknown as jest.Mock<
  (...args: unknown[]) => Promise<unknown>
>;
const mockUploadVideo = uploadWorkspaceVideoFile as unknown as jest.Mock<
  (...args: unknown[]) => Promise<unknown>
>;
const mockErrorMessage = errorMessage as unknown as jest.Mock;

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

/** An error as the API client rejects it: axios' error, after the response interceptor ran. */
const httpError = (status: number, message: string) =>
  Object.assign(new Error(`Request failed with status code ${status}`), {
    response: { status, data: { statusCode: status, message } },
  });
const networkError = () => new Error('Network Error');

let container: HTMLElement;

const spinnerShown = () =>
  container.querySelector('[data-testid="app-spinner"]') !== null;

/**
 * Creates a folder from the modal and lets the request fail or succeed. Says whether the
 * handler itself rejected: an event handler's rejection reaches nobody.
 */
const createFolder = async (answer: (request: IDeferred<unknown>) => void) => {
  const request = deferred<unknown>();
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

beforeEach(() => {
  jest.clearAllMocks();
  mockState = {
    auth: { user: { id: 'u1', photoURL: '' } },
    panel: {
      activeWorkspace: WORKSPACE,
      currentWorkspaceFolder: null,
      workspaceFolderOrder: 'date',
      workspaceItemOrder: 'date',
      workspaceLoaded: true,
      favoriteFolders: {},
    },
  };
  container = render(<Workspace />);
  expect(spinnerShown()).toBe(false);
  // What the screen dispatched while it opened.
  mockDispatch.mockClear();
});

describe('workspace screen: creating a folder', () => {
  it('a 403 clears the spinner without a second toast: the API client shows one', async () => {
    const outcome = await createFolder((request) =>
      request.reject(httpError(403, 'Forbidden resource')),
    );

    expect(spinnerShown()).toBe(false);
    expect(outcome).toBe('resolved');
    expect(mockErrorMessage).not.toHaveBeenCalled();
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
    expect(mockErrorMessage).toHaveBeenCalledTimes(1);
    expect(mockErrorMessage).toHaveBeenCalledWith(message);
  });

  it('a created folder clears the spinner and lists the folders', async () => {
    const folders = [{ id: 'f1', name: 'Designs', parentId: false }];
    const outcome = await createFolder((request) =>
      request.resolve({ status: 'success', data: folders }),
    );

    expect(spinnerShown()).toBe(false);
    expect(outcome).toBe('resolved');
    expect(mockErrorMessage).not.toHaveBeenCalled();
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'SET_ACTIVE_WORKSPACE',
      payload: { activeWorkspace: expect.objectContaining({ folders }) },
    });
  });
});

const IMAGE_FILE = new File(['png'], 'shot.png', { type: 'image/png' });
const VIDEO_FILE = new File(['mp4'], 'clip.mp4', { type: 'video/mp4' });
const IMAGE = { dbData: { id: 'img-1', parentId: false }, url: 'shot.png' };
const VIDEO = { dbData: { id: 'vid-1', parentId: false }, url: 'clip.mp4' };

const fileInput = (accept: 'image' | 'video') => {
  const input = container.querySelector<HTMLInputElement>(
    `input[type="file"][accept^="${accept}/"]`,
  );
  if (!input) throw new Error(`no ${accept} file input`);
  return input;
};

interface IUploadWay {
  service: typeof mockUploadImage;
  file: File;
  /** Where the uploaded item goes in the active workspace. */
  list: 'screenshots' | 'videos';
  item: unknown;
  /**
   * Starts the upload as the member does. Gives the handler's promise when the test can reach
   * it; the file inputs call theirs from a DOM event, so a rejection there is unhandled and Jest
   * fails the test on it.
   */
  start: () => Promise<{ handled?: Promise<void> }>;
}

const UPLOAD_WAYS: [string, () => IUploadWay][] = [
  [
    'dropping an image on the upload modal',
    () => ({
      service: mockUploadImage,
      file: IMAGE_FILE,
      list: 'screenshots',
      item: IMAGE,
      start: async () => {
        let handled: Promise<void> | undefined;
        await act(async () => {
          handled = mockUploadImageModal.onDrop({
            preventDefault: () => undefined,
            dataTransfer: { files: [IMAGE_FILE] },
          });
        });
        return { handled };
      },
    }),
  ],
  [
    'picking an image',
    () => ({
      service: mockUploadImage,
      file: IMAGE_FILE,
      list: 'screenshots',
      item: IMAGE,
      start: async () => {
        await userEvent.setup().upload(fileInput('image'), IMAGE_FILE);
        return {};
      },
    }),
  ],
  [
    'picking a video',
    () => ({
      service: mockUploadVideo,
      file: VIDEO_FILE,
      list: 'videos',
      item: VIDEO,
      start: async () => {
        await userEvent.setup().upload(fileInput('video'), VIDEO_FILE);
        return {};
      },
    }),
  ],
];

/** Starts an upload, checks the spinner covers the panel, then lets the request settle. */
const upload = async (
  way: IUploadWay,
  answer: (request: IDeferred<unknown>) => void,
) => {
  const request = deferred<unknown>();
  way.service.mockReturnValue(request.promise);

  const { handled } = await way.start();
  expect(way.service).toHaveBeenCalledTimes(1);
  const [, file, workspaceId] = way.service.mock.calls[0];
  expect(file).toBe(way.file);
  expect(workspaceId).toBe(WORKSPACE.id);
  expect(spinnerShown()).toBe(true);

  const outcome = handled?.then(
    () => 'resolved' as const,
    () => 'rejected' as const,
  );
  await act(async () => {
    answer(request);
    await (outcome ?? new Promise((done) => setTimeout(done, 0)));
  });
  if (outcome) expect(await outcome).toBe('resolved');
};

describe.each(UPLOAD_WAYS)('workspace screen: %s', (_name, way) => {
  it('a 403 clears the spinner without a second toast: the API client shows one', async () => {
    await upload(way(), (request) =>
      request.reject(httpError(403, 'Forbidden resource')),
    );

    expect(spinnerShown()).toBe(false);
    expect(mockErrorMessage).not.toHaveBeenCalled();
    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it.each([
    [
      'a 500',
      () => httpError(500, 'Internal server error'),
      'Internal server error',
    ],
    ['no network', networkError, 'Network Error'],
  ])('%s clears the spinner and says why', async (_error, error, message) => {
    await upload(way(), (request) => request.reject(error()));

    expect(spinnerShown()).toBe(false);
    expect(mockErrorMessage).toHaveBeenCalledTimes(1);
    expect(mockErrorMessage).toHaveBeenCalledWith(message);
    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it('an uploaded file clears the spinner and is added to the workspace', async () => {
    const uploadWay = way();
    await upload(uploadWay, (request) => request.resolve(uploadWay.item));

    expect(spinnerShown()).toBe(false);
    expect(mockErrorMessage).not.toHaveBeenCalled();
    expect(mockDispatch).toHaveBeenCalledTimes(1);
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'SET_ACTIVE_WORKSPACE',
      payload: {
        activeWorkspace: expect.objectContaining({
          [uploadWay.list]: [uploadWay.item],
        }),
      },
    });
  });
});
