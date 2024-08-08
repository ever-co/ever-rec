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
    <div className="tw-h-60px tw-bg-light-grey2 tw-border-b tw-border-iron-grey tw-flex tw-items-center tw-justify-start tw-pl-280px">
      <div className="tw-bg-white tw-w-280px tw-h-60px tw-flex tw-items-center tw-justify-between tw-border-b tw-border-iron-grey tw-absolute tw-left-0 ">
        <Dropdown overlayClassName="tw-w-220px" overlay={menu}>
          <a onClick={(e) => e.preventDefault()}>
            <div className="tw-flex tw-items-center tw-justify-between ">
              <div className="tw-flex tw-items-center tw-justify-center tw-gap-2 ">
                <img src={recIcon.src} width={40} />
                <div className="tw-leading-4 tw-text-grey tw-opacity-75 tw-w-200px ">
                  <p className="!tw-text-xs">MOTE Inc.</p>
                  <p className="!tw-text-xs">Sussan Duttan</p>
                </div>
              </div>

              <DownOutlined />
            </div>
          </a>
        </Dropdown>
      </div>
      <div className="tw-w-full tw-h-full tw-flex tw-items-center tw-justify-between">
        <div className="tw-w-300px tw-border tw-rounded-lg tw-flex tw-items-center tw-justify-center tw-opacity-25 tw-bg-gray tw-h-40px tw-mx-5">
          Search
        </div>
        <div className="tw-w-300px tw-border tw-rounded-lg tw-flex tw-items-center tw-justify-center tw-opacity-25 tw-h-40px tw-mx-5">
          Profile
        </div>
      </div>
    </div>
  );
};
export default WhiteboardsTopbar;
