import { removeStorageItems } from '@/app/services/localStorage';
import hideController from '@/content/utilities/scripts/hideController';

const clearStorage = async (): Promise<void> => {
  await hideController();

  await removeStorageItems('activeTabId');
  await removeStorageItems('recordStatus');
  await removeStorageItems('pausedTime');
  await removeStorageItems('recordedWinId');
  await removeStorageItems('recordStatus');
  await removeStorageItems('winId');
  await removeStorageItems('videoEditorTabId');
};

export default clearStorage;
