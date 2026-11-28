import React, { useReducer } from 'react';
import { createRoot, Root } from 'react-dom/client';

// The hook that loads the list of workspaces and the open workspace. Its two requests must not
// depend on which answer, or which piece of the page's state, arrives first: a workspace page
// used to stay on its spinner, or the workspace switcher stayed empty, when the order was unlucky.

interface IDeferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
}
const deferred = <T,>(): IDeferred<T> => {
  let resolve: (value: T) => void = () => undefined;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
};

let mockState: any;
let mockRouter: { isReady: boolean; query: Record<string, string> };
let mockNotify: () => void = () => undefined;
let mockList: IDeferred<any>;
let mockWorkspace: IDeferred<any>;

const mockGetList = jest.fn(() => mockList.promise);
const mockGetWorkspace = jest.fn(
  (..._args: unknown[]) => mockWorkspace.promise,
);

jest.mock('next/router', () => ({
  useRouter: () => mockRouter,
}));
jest.mock('react-redux', () => ({
  useSelector: (selector: (state: any) => unknown) => selector(mockState),
  useDispatch: () => (action: { type: string; payload?: unknown }) => {
    const panel = { ...mockState.panel };
    if (action.type === 'SET_WORKSPACES') panel.workspaces = action.payload;
    if (action.type === 'SET_ACTIVE_WORKSPACE')
      panel.activeWorkspace = action.payload;
    if (action.type === 'SET_WORKSPACE_LOADED')
      panel.workspaceLoaded = action.payload;
    if (action.type === 'SET_WORKSPACE_FETCHED')
      panel.workspaceFetched = action.payload;
    mockState = { ...mockState, panel };
    mockNotify();
  },
}));
jest.mock('app/services/api/workspace', () => ({
  getUserWorkspacesAPI: () => mockGetList(),
  getFullWorkspaceDataAPI: (...args: unknown[]) => mockGetWorkspace(...args),
}));
jest.mock('app/services/helpers/iDataResponseParser', () => ({
  iDataResponseParser: (response: { data: unknown }) => response.data,
}));
jest.mock('app/services/helpers/errors', () => ({
  errorHandler: jest.fn(),
}));

import useFetchWorkspacesData from 'hooks/useFetchWorkspacesData';

// React 18.3 exports `act`; the pinned type definitions do not declare it yet.
const act: (callback: () => void | Promise<void>) => Promise<void> = (
  React as any
).act;

const ADA = { id: 'u1', displayName: 'Ada Lovelace', email: 'ada@example.com' };
const LIST = [{ id: 'ws-1', name: 'Acme Robotics' }];
const WORKSPACE = { id: 'ws-1', name: 'Acme Robotics', favFolders: [] };

const Host = () => {
  const [, force] = useReducer((count: number) => count + 1, 0);
  mockNotify = force;
  useFetchWorkspacesData();
  return null;
};

let container: HTMLDivElement;
let root: Root;

const settle = () =>
  act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

const mount = async () => {
  await act(async () => {
    root.render(<Host />);
  });
};

/** Something on the page changed (the person became known, the router got its query…). */
const change = async (apply: () => void) => {
  await act(async () => {
    apply();
    mockNotify();
  });
  await settle();
};

const answerList = async () => {
  await act(async () => {
    mockList.resolve({ status: 'success', data: LIST });
  });
  await settle();
};

const answerWorkspace = async () => {
  await act(async () => {
    mockWorkspace.resolve({ status: 'success', data: WORKSPACE });
  });
  await settle();
};

beforeAll(() => {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  jest.spyOn(console, 'log').mockImplementation(() => undefined);
});

beforeEach(() => {
  mockState = {
    auth: { user: null },
    panel: {
      workspaces: [],
      workspaceFetched: false,
      workspaceLoaded: false,
      activeWorkspace: null,
    },
  };
  mockRouter = { isReady: false, query: {} };
  mockList = deferred();
  mockWorkspace = deferred();
  mockGetList.mockClear();
  mockGetWorkspace.mockClear();
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});

describe('useFetchWorkspacesData', () => {
  it('the usual order: one request for the list, one for the open workspace', async () => {
    mockState.auth.user = ADA;
    mockRouter = { isReady: true, query: { workspaceId: 'ws-1' } };
    await mount();

    expect(mockGetList).toHaveBeenCalledTimes(1);
    expect(mockGetWorkspace).toHaveBeenCalledTimes(1);
    expect(mockGetWorkspace).toHaveBeenCalledWith('ws-1', undefined);

    await answerWorkspace();
    await answerList();

    expect(mockState.panel.activeWorkspace).toEqual(WORKSPACE);
    expect(mockState.panel.workspaces).toEqual(LIST);
    expect(mockState.panel.workspaceLoaded).toBe(true);
    expect(mockGetList).toHaveBeenCalledTimes(1);
    expect(mockGetWorkspace).toHaveBeenCalledTimes(1);
  });

  it('still asks for the workspace when the list came back before the router had its id', async () => {
    mockState.auth.user = ADA;
    await mount();
    expect(mockGetList).toHaveBeenCalledTimes(1);

    await answerList();
    expect(mockState.panel.workspaceFetched).toBe(true);

    await change(() => {
      mockRouter = { isReady: true, query: { workspaceId: 'ws-1' } };
    });
    expect(mockGetWorkspace).toHaveBeenCalledTimes(1);

    await answerWorkspace();
    expect(mockState.panel.activeWorkspace).toEqual(WORKSPACE);
    expect(mockState.panel.workspaceLoaded).toBe(true);
  });

  it('still asks for the list when the workspace came back before the person was known', async () => {
    mockRouter = { isReady: true, query: { workspaceId: 'ws-1' } };
    await mount();
    expect(mockGetWorkspace).toHaveBeenCalledTimes(1);
    expect(mockGetList).not.toHaveBeenCalled();

    await answerWorkspace();
    expect(mockState.panel.workspaceFetched).toBe(true);

    await change(() => {
      mockState = { ...mockState, auth: { user: ADA } };
    });
    expect(mockGetList).toHaveBeenCalledTimes(1);

    await answerList();
    expect(mockState.panel.workspaces).toEqual(LIST);
    expect(mockGetWorkspace).toHaveBeenCalledTimes(1);
  });

  it('does not ask twice while an answer is on its way', async () => {
    mockState.auth.user = ADA;
    mockRouter = { isReady: true, query: { workspaceId: 'ws-1' } };
    await mount();

    // The page's state changes again before either answer is in.
    await change(() => {
      mockRouter = { isReady: true, query: { workspaceId: 'ws-1' } };
    });
    await change(() => {
      mockState = { ...mockState, auth: { user: { ...ADA } } };
    });

    expect(mockGetList).toHaveBeenCalledTimes(1);
    expect(mockGetWorkspace).toHaveBeenCalledTimes(1);
  });

  it('asks for nothing more once both are in', async () => {
    mockState.auth.user = ADA;
    mockRouter = { isReady: true, query: { workspaceId: 'ws-1' } };
    await mount();
    await answerList();
    await answerWorkspace();

    await change(() => {
      mockRouter = { isReady: true, query: { workspaceId: 'ws-1' } };
    });

    expect(mockGetList).toHaveBeenCalledTimes(1);
    expect(mockGetWorkspace).toHaveBeenCalledTimes(1);
  });

  it('asks for a folder of the open workspace', async () => {
    mockState.auth.user = ADA;
    mockRouter = {
      isReady: true,
      query: { workspaceId: 'ws-1', folder: 'f-7' },
    };
    await mount();

    expect(mockGetWorkspace).toHaveBeenCalledWith('ws-1', 'f-7');
  });
});
