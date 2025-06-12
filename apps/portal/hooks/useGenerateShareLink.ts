import { useEffect, useMemo, useState } from 'react';
import { ItemType } from 'app/interfaces/ItemType';
import { deleteShareLinkAPI } from 'app/services/api/imageandvideo';
import { saveSegmentEvent } from 'app/services/general';
import { errorHandler } from 'app/services/helpers/errors';
import { successMessage } from 'app/services/helpers/toastMessages';
import { getShareLink } from 'app/services/screenshots';
import { getShareLinkVideo } from 'app/services/videos';
import {
  deleteShareLinkWorkspace,
  getShareLinkWorkspace,
} from 'app/services/workspace';
import { useTranslation } from 'react-i18next';

const useGenerateShareLink = (
  item: any,
  itemType: ItemType,
  workspaceId: string,
  updateItemState: (item) => void,
) => {
  const [sharedLink, setSharedLink] = useState<string | null>(null);
  const { t } = useTranslation();

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

    const generatedSharedLink = `${process.env.NEXT_PUBLIC_WEBSITE_URL}/${itemTypeString}/shared/${item.sharedLink}${sharedParam}`;

    setSharedLink(generatedSharedLink);
  }, [item, itemTypeString, sharedParam]);

  const copyLinkHandler = async () => {
    try {
      if (!sharedLink) throw new Error('No shared link for item');

      await window.navigator.clipboard.writeText(sharedLink);

      saveSegmentEvent(`${itemType} Shareable link copied`, {
        link: sharedLink,
      });
      successMessage(t('toasts.copied'));
      return true;
    } catch (e) {
      errorHandler(t('hooks.toasts.shareLinkCopyError'));
      return false;
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

      const generatedLink = `${process.env.NEXT_PUBLIC_WEBSITE_URL}/${itemTypeString}/shared/${sharedLink}${sharedParam}`;

      setSharedLink(generatedLink);

      await window.navigator.clipboard.writeText(generatedLink);

      successMessage(t('toasts.copied'));
    } catch (e) {
      errorHandler(t('hooks.toasts.shareLinkCopyError'));
      console.log(e);
    }
  };

  const deleteShareLink = async () => {
    const linkId = item?.sharedLink;
    if (!linkId) return errorHandler(t('hooks.toasts.noShareableLink'));

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
