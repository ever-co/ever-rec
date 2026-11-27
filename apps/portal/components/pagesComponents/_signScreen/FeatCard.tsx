import Image from 'next/legacy/image';
import AppSvg from 'components/elements/AppSvg';
import { useTranslation } from 'react-i18next';

export interface IFeatureCard {
  pageTitle?: string;
  imgPath: string;
  title: string;
  date: string;
  description: string;
  rightImgPath: string;
  buttonText: string;
  id?: string;
  priority?: boolean;
}
export const useFeatures = () => {
  // Initialize the translation function
  const { t } = useTranslation();

  // Define the 'features' array using translation keys
  const features: IFeatureCard[] = [
    {
      pageTitle: t('page.whatsNew.sectionTitle'),
      imgPath: '/images/box.svg',
      title: t('page.whatsNew.features.pinToolbar.title'),
      date: 'Dec 7, 2022',
      description: t('page.whatsNew.features.pinToolbar.description'),
      rightImgPath: '/images/dock-tool.svg',
      buttonText: t('page.whatsNew.features.chromeExtension.title'),
    },
    {
      pageTitle: t('page.whatsNew.sectionTitle'),
      imgPath: '/images/browser.svg',
      title: t('page.whatsNew.features.chromeExtension.subtitle'),
      date: 'Dec 7, 2022',
      description: t('page.whatsNew.features.chromeExtension.description'),
      rightImgPath: '/images/collaborate.svg',
      buttonText: t('page.whatsNew.ctaReadMore'),
    },
    {
      pageTitle: t('page.whatsNew.sectionTitle'),
      imgPath: '/images/lightning.svg',
      title: t('page.whatsNew.features.trimbox.title'),
      date: 'Dec 7, 2022',
      description: t('page.whatsNew.features.trimbox.description'),
      rightImgPath: '/images/trim.svg',
      buttonText: t('page.whatsNew.ctaFindOutMore'),
      id: 'last-child',
    },
  ];

  // Define the 'newFeatures' array using translation keys
  const newFeatures: IFeatureCard[] = [
    {
      pageTitle: t('page.whatsNew.sectionTitle'), // Mapped "What's New"
      imgPath: '/images/new-sticker.svg',
      title: t('page.whatsNew.features.videoSave.title'),
      date: 'May 15, 2022', // Date kept as is
      description: t('page.whatsNew.features.videoSave.description'), // Description updated to match JSON
      rightImgPath: '/images/GIF-light.svg',
      buttonText: t('page.whatsNew.features.chromeExtension.title'),
    },
    {
      pageTitle: '', // Mapped "What's New"
      imgPath: '/images/star-sticker.svg',
      title: t('page.whatsNew.features.newToolFeatures.title'),
      date: 'May 15, 2022', // Date kept as is
      description: t('page.whatsNew.features.newToolFeatures.description'), // Description updated to match JSON
      rightImgPath: '/images/typetool.svg',
      buttonText: t('page.whatsNew.ctaFindOutMore'),
    },
    {
      pageTitle: '', // Mapped "What's New"
      imgPath: '/images/dark-light-sticker.svg',
      title: t('page.whatsNew.features.folderOrganization.title'),
      date: 'May 15, 2022', // Date kept as is
      description: t('page.whatsNew.features.folderOrganization.description'),
      rightImgPath: '/images/move_to-light.svg',
      buttonText: t('page.whatsNew.ctaReadMore'),
      id: 'last-child',
    },
  ];

  // Return the arrays of features
  return {
    features,
    newFeatures,
  };
};
// TODO: replace when available
// const extensionLink = 'https://chrome.google.com/webstore/detail/rec-%E2%80%94-screen-captu/gneepehahiglangakfifnpdlppijdkck'
const extensionLink = 'https://rec.so';

const FeatCard: React.FC<IFeatureCard> = ({
  imgPath,
  title,
  date,
  description,
  rightImgPath,
  buttonText,
  id,
  priority,
}) => {
  return (
    <div
      id={id}
      className="tw-flex tw-items-center tw-gap-6 tw-rounded-lg tw-border tw-border-solid tw-border-border tw-bg-card tw-p-5"
    >
      <div className="tw-flex tw-min-w-0 tw-flex-1">
        <div className="tw-flex tw-flex-col">
          <div className="tw-flex tw-items-start tw-text-foreground">
            <AppSvg className="tw-shrink-0" path={imgPath} size="30" />
            <div className="tw-ml-3 tw-flex tw-flex-col">
              <h4 className="tw-m-0 tw-text-base tw-font-semibold tw-text-foreground">
                {title}
              </h4>
              <p className="tw-m-0 tw-text-xs tw-text-muted-foreground">
                {date}
              </p>
            </div>
          </div>
          <p className="tw-m-0 tw-my-3 tw-text-sm tw-text-muted-foreground">
            {description}
          </p>
          {/* The link is the only interactive element: it is styled like a button (the outline
              button of the shared set) instead of nesting a focusable AppButton (two tab stops, a
              button inside a link). Only colours animate, so the focus ring shows at once. */}
          <a
            href={extensionLink}
            target="_blank"
            rel="noopener noreferrer"
            className="tw-flex tw-h-8 tw-w-max tw-cursor-pointer tw-select-none tw-items-center tw-rounded-md tw-border tw-border-solid tw-border-input tw-bg-transparent tw-px-3 tw-text-xs tw-font-medium tw-text-foreground tw-transition-colors tw-duration-150 hover:tw-bg-accent hover:tw-text-accent-foreground focus:tw-text-foreground focus-visible:tw-outline focus-visible:tw-outline-2 focus-visible:tw-outline-offset-2 focus-visible:tw-outline-ring"
          >
            {buttonText}
          </a>
        </div>
      </div>
      <div className="tw-relative tw-h-32 tw-w-36 tw-shrink-0 mx-xl:tw-hidden">
        <Image
          src={rightImgPath}
          priority={priority}
          alt="image"
          layout="fill"
        />
      </div>
    </div>
  );
};

export default FeatCard;
