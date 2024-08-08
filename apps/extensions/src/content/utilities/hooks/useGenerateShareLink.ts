import { useEffect, useMemo, useState } from 'react';
import { ItemType } from '@/app/interfaces/ItemTypes';
import { deleteShareLinkAPI } from '@/app/services/api/imageandvideo';
import { saveSegmentEvent } from '@/app/services/general';
import { errorHandler } from '@/app/services/helpers/errors';
import { successMessage } from '@/app/services/helpers/toastMessages';
import { getShareLink } from '@/app/services/screenshots';
import { getShareLinkVideo } from '@/app/services/videos';
import {
  getShareLinkWorkspace,
  deleteShareLinkWorkspace,
} from '@/app/services/workspace';

const useGenerateShareLink = (
  item: any,
  itemType: ItemType,
  workspaceId: string,
  updateItemState: (item: any) => void,
) => {
  const [sharedLink, setSharedLink] = useState<string | null>(null);

  const itemTypeString = useMemo(
    () => (itemType === 'image' ? 'image' : 'video'),
    [itemType],
  );
  const sharedParam = useMemo(
    () => (workspaceId ? '?ws=1' : ''),
    [workspaceId],
  );

  useEffect(() => {
    if (!item?.sharedLink) return;

    const generatedSharedLink = `${process.env.WEBSITE_URL}/${itemTypeString}/shared/${item.sharedLink}${sharedParam}`;

    setSharedLink(generatedSharedLink);
  }, [item, itemTypeString, sharedParam]);

  const copyLinkHandler = async () => {
    try {
      if (!sharedLink) throw new Error('No shared link for item');

      await window.navigator.clipboard.writeText(sharedLink);

      saveSegmentEvent(`${itemType} Shareable link copied`, {
        link: sharedLink,
      });
      successMessage('Copied');
    } catch (e) {
      errorHandler({ message: 'Could not copy the share link...' });
    }
  };

  const getShareableLinkHandler = async () => {
    try {
      const { id: itemId } = item.dbData;
      if (!itemId) throw new Error(`No image id for ${item}`);

      let sharedLink: string | null = null;
      if (workspaceId) {
        sharedLink = await getShareLinkWorkspace(workspaceId, itemId);
      } else {
        sharedLink =
          itemType === 'image'
            ? await getShareLink(itemId)
            : await getShareLinkVideo(itemId);
      }

      if (!sharedLink)
        throw new Error(`Server did not provide shared link for ${item}`);

      const updatedItem = { ...item, sharedLink };

      updateItemState(updatedItem);

      const generatedLink = `${process.env.WEBSITE_URL}/${itemTypeString}/shared/${sharedLink}${sharedParam}`;

      setSharedLink(generatedLink);

      await window.navigator.clipboard.writeText(
        `${process.env.WEBSITE_URL}/${itemTypeString}/shared/${sharedLink}${sharedParam}`,
      );

      successMessage('Copied');
    } catch (e) {
      errorHandler('Could not copy the shareable link...');
      console.log(e);
    }
  };

  const deleteShareLink = async () => {
    const linkId = item?.sharedLink;
    if (!linkId)
      return errorHandler('There is no shareable link for this item');

    workspaceId
      ? await deleteShareLinkWorkspace(workspaceId, linkId)
      : await deleteShareLinkAPI(linkId, itemType);

    const updatedItem = { ...item, sharedLink: null };
    updateItemState(updatedItem);
    setSharedLink(null);
  };

  return {
    sharedLink,
    copyLinkHandler,
    getShareableLinkHandler,
    deleteShareLink,
  };
};

export default useGenerateShareLink;
