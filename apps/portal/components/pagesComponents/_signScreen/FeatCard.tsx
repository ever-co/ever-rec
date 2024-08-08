import Image from 'next/image';
import AppSvg from 'components/elements/AppSvg';
import AppButton from 'components/controls/AppButton';

interface IFeatureCard {
  pageTitle?: string;
  imgPath: string;
  title: string;
  date: string;
  description: string;
  rightImgPath: string;
  buttonText: string;
  id?: string;
}

export const features: IFeatureCard[] = [
  {
    pageTitle: 'Features',
    imgPath: '/images/box.svg',
    title: 'Pin Toolbar',
    date: 'Dec 7, 2022',
    description:
      'Dock our moveable toolbar on either side of the screen, or float it around any area of the screen.',
    rightImgPath: '/images/dock-tool.svg',
    buttonText: 'Add to Chrome',
  },
  {
    imgPath: '/images/browser.svg',
    title: 'Save and Collaborate',
    date: 'Dec 7, 2022',
    description:
      'Save the files to your preferred format and platform. Share with a single click.',
    rightImgPath: '/images/collaborate.svg',
    buttonText: 'Read more',
  },
  {
    imgPath: '/images/lightning.svg',
    title: 'Trimbox',
    date: 'Dec 7, 2022',
    description: 'Allows you to easily trim and cut your recording.',
    rightImgPath: '/images/trim.svg',
    buttonText: 'Find out more',
    id: 'last-child',
  },
];

export const newFeatures: IFeatureCard[] = [
  {
    pageTitle: "What's New",
    imgPath: '/images/new-sticker.svg',
    title: 'See New Features',
    date: 'May 15, 2022',
    description:
      'You can now save videos as GIF animations. Create funny memes to share with friends.',
    rightImgPath: '/images/GIF-light.svg',
    buttonText: 'Add to Chrome',
  },
  {
    imgPath: '/images/star-sticker.svg',
    title: 'We Added New Tool Features',
    date: 'May 15, 2022',
    description:
      'You can now easily add text to your images, change border colors, adjust text alignment, and more!',
    rightImgPath: '/images/typetool.svg',
    buttonText: 'Find out more',
  },
  {
    imgPath: '/images/dark-light-sticker.svg',
    title: 'Move to Folder',
    date: 'May 15, 2022',
    description:
      'You can now organize your screenshot images into folders for easy access later. ',
    rightImgPath: '/images/move_to-light.svg',
    buttonText: 'Read more',
    id: 'last-child',
  },
];

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
}) => {
  return (
    <div id={id} className="tw-flex tw-mt-30px">
      <div className="tw-w-6/12 tw-flex tw-border-b tw-border-1px tw-border-solid tw-border-black ">
        <div className="tw-flex tw-flex-col">
          <div className="tw-flex">
            <AppSvg className="tw-mt-1" path={imgPath} size="22px" />
            <div className="tw-flex tw-flex-col tw-ml-20px">
              <h4 className="tw-font-bold tw-text-xl">{title}</h4>
              <p className="tw-text-app-grey-darker">{date}</p>
            </div>
          </div>
          <p className="tw-my-20px">{description}</p>
          <a href={extensionLink} target="_blank" rel="noopener noreferrer">
            <AppButton
              twTextColor="tw-text-black"
              className="tw-border-primary-purple tw-mb-20px tw-bg-white"
              onClick={() => void 0}
            >
              {buttonText}
            </AppButton>
          </a>
        </div>
      </div>
      <div className="tw-relative tw-w-60 tw-h-56 tw-ml-12">
        <Image src={rightImgPath} alt="image" layout="fill" />
      </div>
    </div>
  );
};

export default FeatCard;
