import IEditorImage from '@/app/interfaces/IEditorImage';
import {
  infoMessage,
  successMessage,
} from '@/app/services/helpers/toastMessages';
import { useTranslation } from 'react-i18next';

export const useCopySourceURL = () => {
  const { t } = useTranslation();
  const copySourceURL = async (image: IEditorImage) => {
    const sourceUrl = image.dbData?.sourceUrl;

    if (sourceUrl && !!sourceUrl) {
      await navigator.clipboard.writeText(sourceUrl);
      successMessage(t('page.image.copyToClipboard'));
      window.open(sourceUrl, '_blank');
    } else {
      infoMessage(t('hooks.toasts.noSourceURL'));
    }
  };
  return {
    copySourceURL,
  };
};
