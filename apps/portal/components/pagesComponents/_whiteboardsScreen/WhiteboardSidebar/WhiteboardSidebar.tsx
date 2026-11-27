import { Menu } from 'antd';
import MenuItem from 'antd/lib/menu/MenuItem';
import AppButton from 'components/controls/AppButton';
import plusIcon from 'public/assets/svg/whiteboard-tools-panel/Plus.svg';
import bin from 'public/whiteboards/bin.svg';
import AppSvg from 'components/elements/AppSvg';
import useWindowSize from 'hooks/useWindowSize';
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

// The drawings carry their own violet ink: they take the text colour instead, quiet at rest and
// the row's colour when the row is hovered or selected.
const iconClass =
  'tw-text-muted-foreground tw-transition-colors tw-duration-150 [&_path]:tw-fill-current [.ant-menu-item:hover_&]:tw-text-foreground [.ant-menu-item-selected_&]:tw-text-foreground';

const items = [
  {
    key: 1,
    icon: <AppSvg path={recent.src} size="18px" className={iconClass} />,
    label: 'Recent',
  },
  {
    key: 2,
    icon: <AppSvg path={shared.src} size="18px" className={iconClass} />,
    label: 'Shared with me',
  },
  {
    key: 3,
    icon: <AppSvg path={starred.src} size="18px" className={iconClass} />,
    label: 'Starred',
  },
  {
    key: 4,
    icon: <AppSvg path={ios.src} size="18px" className={iconClass} />,
    label: 'IOS Engineers',
  },
  {
    key: 5,
    icon: <AppSvg path={frog.src} size="18px" className={iconClass} />,
    label: 'Frog agency',
  },
  {
    key: 6,
    icon: <AppSvg path={desing.src} size="18px" className={iconClass} />,
    label: 'Design',
  },
  {
    key: 7,
    icon: <AppSvg path={bin.src} size="18px" className={iconClass} />,
    label: 'Bin',
  },
];

const WhiteboardsSidebar: React.FC<IProps> = ({
  addNew,
  setCurrentTab,
  currentTab,
}) => {
  // Below 768px the column becomes a bar: "New", then the tabs side by side (the ones that do not
  // fit go under the menu's own "more").
  const { width } = useWindowSize();
  const narrow = width > 0 && width < 768;

  return (
    <div className="tw-absolute tw-left-0 tw-top-60px tw-h-93p tw-w-280px tw-border-r tw-border-border tw-bg-card mx-md:tw-static mx-md:tw-flex mx-md:tw-h-auto mx-md:tw-w-full mx-md:tw-shrink-0 mx-md:tw-items-center mx-md:tw-border-b mx-md:tw-border-r-0">
      <div className="tw-flex tw-h-16 tw-w-full tw-items-center tw-justify-center tw-border-b tw-border-border mx-md:tw-h-12 mx-md:tw-w-auto mx-md:tw-shrink-0 mx-md:tw-border-b-0 mx-md:tw-px-3">
        <AppButton
          onClick={() => {
            addNew(true);
          }}
        >
          <AppSvg
            path={plusIcon.src}
            size={'16px'}
            className="[&_path]:tw-fill-current"
          ></AppSvg>
          New
        </AppButton>
      </div>

      {/* The menu sits on the column's ground; the column draws the one hairline on the right. */}
      <Menu
        selectedKeys={[currentTab]}
        items={items}
        mode={narrow ? 'horizontal' : 'inline'}
        className="mx-md:tw-min-w-0 mx-md:tw-flex-1"
        style={{ background: 'transparent', borderRight: 0 }}
        onClick={(key) => setCurrentTab(key.key)}
      ></Menu>
    </div>
  );
};

export default WhiteboardsSidebar;
