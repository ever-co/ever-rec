import { IDbFolderData } from 'app/interfaces/IEditorImage';
import { ItemType, MixedItemType } from 'app/interfaces/ItemType';
import store from 'app/store/panel';
import PanelAC from 'app/store/panel/actions/PanelAC';
import { changeFolderItemsAPI } from '../api/image';
import { changeVideoFolderItemsAPI } from '../api/video';
import { iDataResponseParser } from './iDataResponseParser';

// The server applies the change atomically, so concurrent changes can't
// overwrite each other or the folder's other fields. Returns the new count.
const sendFolderItemsChange = async (
  folderId: string,
  type: ItemType,
  change: number,
): Promise<number | null> => {
  const response =
    type == 'image'
      ? await changeFolderItemsAPI(folderId, change)
      : await changeVideoFolderItemsAPI(folderId, change);

  return iDataResponseParser<typeof response.data>(response)?.items ?? null;
};

// Changes to the same folder are sent one at a time, so their responses (and
// the counts shown in the explorer) arrive in the order the server applied them.
const pendingChanges = new Map<string, Promise<number | null>>();

const changeFolderItems = (
  folderId: string,
  type: ItemType,
  change: number,
): Promise<number | null> => {
  const previous = pendingChanges.get(folderId) ?? Promise.resolve(null);
  const request = previous
    .catch(() => null)
    .then(() => sendFolderItemsChange(folderId, type, change));

  pendingChanges.set(folderId, request);
  const cleanUp = () => {
    if (pendingChanges.get(folderId) === request)
      pendingChanges.delete(folderId);
  };
  request.then(cleanUp, cleanUp);

  return request;
};

// Updates only the count, so a newer name or color in the explorer is kept.
const updateFolderItemsInExplorer = (
  folderId: string,
  items: number,
  type: ItemType,
) => {
  const folder = { id: folderId, items };
  store.dispatch(
    type == 'image'
      ? PanelAC.updateExplorerFolderData({ folder })
      : PanelAC.updateExplorerVideoFolderData({ folder }),
  );
};

const increaseFolderItems = async (
  folderData: IDbFolderData,
  type: ItemType,
  index: number,
) => {
  const items = await changeFolderItems(folderData.id, type, index);
  if (items !== null) updateFolderItemsInExplorer(folderData.id, items, type);
};

const decreaseFolderItems = async (
  folderData: IDbFolderData,
  type: MixedItemType,
  index: number,
) => {
  if (type == 'mixed') return;

  const items = await changeFolderItems(folderData.id, type, -index);
  if (items !== null) updateFolderItemsInExplorer(folderData.id, items, type);
};

// For callers that only have the folder id; they reload the explorer anyway.
const adjustImageFolderItems = async (folderId: string, change: number) => {
  await changeFolderItems(folderId, 'image', change);
};

export { increaseFolderItems, decreaseFolderItems, adjustImageFolderItems };
