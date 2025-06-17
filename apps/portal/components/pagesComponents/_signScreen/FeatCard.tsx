import Image from 'next/legacy/image';
import AppSvg from 'components/elements/AppSvg';
import AppButton from 'components/controls/AppButton';
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
    <div id={id} className="tw-flex tw-mt-30px">
      <div className="tw-w-6/12 tw-flex tw-border-b tw-border-1px tw-border-solid tw-border-[#2A292F] ">
        <div className="tw-flex tw-flex-col">
          <div className="tw-flex">
            <AppSvg className="tw-mt-1" path={imgPath} size="30" />
            <div className="tw-flex tw-flex-col tw-ml-4">
              <h4 className="tw-font-bold tw-text-xl">{title}</h4>
              <p className="tw-text-app-grey-darker">{date}</p>
            </div>
          </div>
          <p className="tw-my-4">{description}</p>
          <a href={extensionLink} target="_blank" rel="noopener noreferrer">
            <AppButton
              twTextColor="tw-text-black hover:!tw-text-primary-purple tw-font-extralight !tw-text-base  tw-transition-all tw-duration-300"
              className="!tw-border-primary-purple tw-mb-6 tw-bg-white"
              onClick={() => void 0}
            >
              {buttonText}
            </AppButton>
          </a>
        </div>
      </div>
      <div className="tw-relative tw-w-60 tw-h-56 tw-ml-12">
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
