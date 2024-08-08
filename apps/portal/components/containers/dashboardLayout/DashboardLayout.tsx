import { FC, ReactNode } from 'react';
import styles from './DashboardLayout.module.scss';
import classNames from 'classnames';
import { Col, Row } from 'antd';
import useGetXXL from 'hooks/useGetXXL';
import Sidebar from './Sidebar/Sidebar';

interface IProps {
  children?: ReactNode;
  isProfilePage?: boolean;
  isWorkspaceSettingsPage?: boolean;
}

const DashboardLayout: FC<IProps> = ({
  children,
  isProfilePage = false,
  isWorkspaceSettingsPage = false,
}) => {
  const { dimensionsDashboard } = useGetXXL();

  return (
    <div className={classNames(styles.dashboardLayoutWrapper, 'scroll-div')}>
      <Row
        gutter={20}
        className="tw-bg-blue-grey tw-w-full"
        style={{
          margin: '0',
          padding: '0 !important',
          height: '100%',
        }}
      >
        <Col
          span={24}
          sm={24}
          md={10}
          lg={8}
          xl={6}
          xxl={dimensionsDashboard.sidebar}
          style={{ position: 'relative', paddingLeft: 0, paddingRight: 0 }}
        >
          <Sidebar
            isProfilePage={isProfilePage}
            isWorkspaceSettingsPage={isWorkspaceSettingsPage}
          />
        </Col>

        <Col
          span={24}
          sm={24}
          md={14}
          lg={16}
          xl={18}
          xxl={dimensionsDashboard.items}
          style={{ height: '100%', paddingLeft: 0, paddingRight: 0 }}
        >
          {children}
        </Col>
      </Row>
    </div>
  );
};

export default DashboardLayout;
