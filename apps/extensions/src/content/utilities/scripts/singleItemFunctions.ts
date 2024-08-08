import IEditorImage from '@/app/interfaces/IEditorImage';
import {
  infoMessage,
  successMessage,
} from '@/app/services/helpers/toastMessages';

export const copySourceURL = async (image: IEditorImage) => {
  const sourceUrl = image.dbData?.sourceUrl;

  if (sourceUrl && !!sourceUrl) {
    await navigator.clipboard.writeText(sourceUrl);
    successMessage('Copied to clipboard');
    window.open(sourceUrl, '_blank');
  } else {
    infoMessage("This image doesn't have a Source URL");
  }
};
