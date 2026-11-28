import recIcon from 'public/icons/128.png';
import { DownOutlined, SmileOutlined } from '@ant-design/icons';
import { Dropdown, Menu, Space } from 'antd';

const menu = (
  <Menu
    items={[
      {
        key: '1',
        label: (
          <a
            target="_blank"
            rel="noopener noreferrer"
            href="https://www.antgroup.com"
          >
            option1
          </a>
        ),
      },
      {
        key: '2',
        label: (
          <a
            target="_blank"
            rel="noopener noreferrer"
            href="https://www.aliyun.com"
          >
            option2
          </a>
        ),

        disabled: true,
      },
      {
        key: '3',
        label: (
          <a
            target="_blank"
            rel="noopener noreferrer"
            href="https://www.luohanacademy.com"
          >
            option3
          </a>
        ),
        disabled: true,
      },
      {
        key: '4',
        danger: true,
        label: 'delete',
      },
    ]}
  />
);

const WhiteboardsTopbar = () => {
  return (
    <div className="tw-flex tw-h-60px tw-items-center tw-justify-start tw-border-b tw-border-border tw-bg-card tw-pl-280px mx-md:tw-h-auto mx-md:tw-shrink-0 mx-md:tw-flex-col mx-md:tw-items-stretch mx-md:tw-pl-0">
      <div className="tw-absolute tw-left-0 tw-flex tw-h-60px tw-w-280px tw-items-center tw-justify-between tw-border-b tw-border-r tw-border-border tw-bg-card mx-md:tw-static mx-md:tw-w-full mx-md:tw-border-r-0">
        <Dropdown overlayClassName="tw-w-220px" overlay={menu}>
          <a
            onClick={(e) => e.preventDefault()}
            className="tw-text-muted-foreground"
          >
            <div className="tw-flex tw-items-center tw-justify-between ">
              <div className="tw-flex tw-items-center tw-justify-center tw-gap-2 ">
                <img src={recIcon.src} width={40} />
                <div className="tw-w-200px ">
                  <p className="tw-m-0 tw-truncate tw-text-sm tw-font-medium tw-leading-5 tw-text-foreground">
                    MOTE Inc.
                  </p>
                  <p className="tw-m-0 tw-truncate tw-text-xs tw-leading-4 tw-text-muted-foreground">
                    Sussan Duttan
                  </p>
                </div>
              </div>

              <DownOutlined />
            </div>
          </a>
        </Dropdown>
      </div>
      <div className="tw-flex tw-h-full tw-w-full tw-items-center tw-justify-between mx-md:tw-h-12">
        <div className="tw-mx-5 tw-flex tw-h-9 tw-w-300px tw-items-center tw-justify-center tw-rounded-md tw-border tw-border-border tw-text-sm tw-text-muted-foreground tw-opacity-50 mx-md:tw-mx-2 mx-md:tw-w-auto mx-md:tw-flex-1">
          Search
        </div>
        <div className="tw-mx-5 tw-flex tw-h-9 tw-w-300px tw-items-center tw-justify-center tw-rounded-md tw-border tw-border-border tw-text-sm tw-text-muted-foreground tw-opacity-50 mx-md:tw-mx-2 mx-md:tw-w-auto mx-md:tw-flex-1">
          Profile
        </div>
      </div>
    </div>
  );
};
export default WhiteboardsTopbar;
