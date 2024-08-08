import { Menu } from 'antd';
import MenuItem from 'antd/lib/menu/MenuItem';
import AppButton from 'components/controls/AppButton';
import plusIcon from 'public/assets/svg/whiteboard-tools-panel/Plus.svg';
import bin from 'public/whiteboards/bin.svg';
import AppSvg from 'components/elements/AppSvg';
import recent from 'public/whiteboards/recent.svg';
import shared from 'public/whiteboards/share.svg';
import frog from 'public/whiteboards/frog.svg';
import desing from 'public/whiteboards/design.svg';
import starred from 'public/whiteboards/starred.svg';
import ios from 'public/whiteboards/iosengineers.svg';

interface IProps {
  addNew: (visibility: boolean) => void;
  setCurrentTab: (tab: string) => void;
  currentTab: string;
}

const items = [
  {
    key: 1,
    icon: <AppSvg path={recent.src} />,
    label: 'Recent',
  },
  {
    key: 2,
    icon: <AppSvg path={shared.src} />,
    label: 'Shared with me',
  },
  {
    key: 3,
    icon: <AppSvg path={starred.src} />,
    label: 'Starred',
  },
  {
    key: 4,
    icon: <AppSvg path={ios.src} />,
    label: 'IOS Engineers',
  },
  {
    key: 5,
    icon: <AppSvg path={frog.src} />,
    label: 'Frog agency',
  },
  {
    key: 6,
    icon: <AppSvg path={desing.src} />,
    label: 'Design',
  },
  {
    key: 7,
    icon: <AppSvg path={bin.src} />,
    label: 'Bin',
  },
];

const WhiteboardsSidebar: React.FC<IProps> = ({
  addNew,
  setCurrentTab,
  currentTab,
}) => {
  return (
    <div className="tw-border-r tw-border-1px tw-border-iron-grey tw-h-93p  tw-w-280px tw-absolute tw-top-60px tw-left-0 tw-bg-white">
      <div className="tw-w-full tw-h-90px tw-flex tw-items-center tw-justify-center tw-border-b tw-border-1px tw-border-iron-grey">
        <AppButton
          className="!tw-px-25px !tw-py-5px tw-rounded-full"
          onClick={() => {
            addNew(true);
          }}
        >
          <AppSvg path={plusIcon.src} size={'34px'}></AppSvg>New
        </AppButton>
      </div>

      <Menu
        selectedKeys={[currentTab]}
        items={items}
        mode="inline"
        onClick={(key) => setCurrentTab(key.key)}
      ></Menu>
    </div>
  );
};

export default WhiteboardsSidebar;
