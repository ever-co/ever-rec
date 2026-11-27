import React from 'react';
import { createRoot, Root } from 'react-dom/client';
import en from '../i18n/locales/en.json';

jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
jest.mock('app/services/ever-connect', () => ({ getMyExport: jest.fn() }));

import * as connect from 'app/services/ever-connect';
import DataExport, { exportFileName } from 'components/pagesComponents/everPlatform/DataExport';

const act: (callback: () => void | Promise<void>) => Promise<void> = (React as any).act;
const api = connect as jest.Mocked<typeof connect>;

let container: HTMLDivElement;
let root: Root;

const render = async (element: React.ReactElement) => {
  await act(async () => {
    root.render(element);
  });
  for (let i = 0; i < 4; i += 1) {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  }
};

const byTestId = (id: string) => container.querySelector(`[data-testid="${id}"]`);
const message = (key: string): unknown => key.split('.').reduce((node: any, part) => (node == null ? undefined : node[part]), en);

beforeAll(() => {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  window.matchMedia =
    window.matchMedia ||
    ((query: string) =>
      ({
        matches: false,
        media: query,
        addListener: () => undefined,
        removeListener: () => undefined,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
      }) as any);
});

beforeEach(() => {
  jest.clearAllMocks();
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});

describe('Settings → Your data export', () => {
  it('offers the export of the signed-in account as a JSON download', async () => {
    api.getMyExport.mockResolvedValue({ format: 'ever-rec.person-export.v1', profile: { displayName: 'Person' } });
    const created: Blob[] = [];
    (URL as any).createObjectURL = jest.fn((blob: Blob) => {
      created.push(blob);
      return 'blob:export';
    });
    (URL as any).revokeObjectURL = jest.fn();
    const click = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);

    await render(<DataExport job="01KJOB" uid="uid-1" />);

    expect(api.getMyExport).toHaveBeenCalledWith('01KJOB');
    // What the export holds, listed; the file the button saves, named next to it
    expect(container.querySelectorAll('li')).toHaveLength(4);
    expect(container.textContent).toContain('ever-rec-export-01KJOB.json');
    const button = byTestId('data-export-download') as HTMLButtonElement;
    expect(button).not.toBeNull();
    expect(button.tagName).toBe('BUTTON');
    await act(async () => button.click());
    expect(click).toHaveBeenCalledTimes(1);
    expect(created).toHaveLength(1);
    expect(created[0].type).toBe('application/json');
    click.mockRestore();
  });

  it('an export of another account, or an expired one, reads as not available', async () => {
    api.getMyExport.mockRejectedValue(Object.assign(new Error('404'), { response: { status: 404 } }));
    await render(<DataExport job="01KJOB" uid="uid-1" />);
    const unavailable = byTestId('data-export-unavailable');
    expect(unavailable).not.toBeNull();
    // Its own title, then the reasons
    expect(unavailable.textContent).toBe('page.dataExport.unavailableTitlepage.dataExport.unavailable');
    expect(container.querySelector('[role="status"]').contains(unavailable)).toBe(true);
    expect(byTestId('data-export-download')).toBeNull();
  });

  it('an address without a job reads as not available, and asks nothing', async () => {
    await render(<DataExport job="" uid="uid-1" />);
    expect(api.getMyExport).not.toHaveBeenCalled();
    expect(byTestId('data-export-unavailable')).not.toBeNull();
  });

  it('nothing is asked before the account is known', async () => {
    await render(<DataExport job="01KJOB" />);
    expect(api.getMyExport).not.toHaveBeenCalled();
  });

  it('the file name keeps the job id\'s safe characters only', () => {
    expect(exportFileName('01K/../x y')).toBe('ever-rec-export-01Kxy.json');
  });

  it('every message the page shows exists in English', () => {
    for (const key of [
      'title',
      'lead',
      'contents.profile',
      'contents.identities',
      'contents.workspaces',
      'contents.media',
      'access',
      'unavailableTitle',
      'unavailable',
      'download',
    ]) {
      expect(typeof message(`page.dataExport.${key}`)).toBe('string');
    }
    expect(typeof message('page.everPlatform.loading')).toBe('string');
  });
});
