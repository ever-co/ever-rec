import { FC, ReactNode } from 'react';
import { Col, Row } from 'antd';
import Sidebar from './elements/Sidebar/Sidebar';
import styles from './DashboardLayout.module.scss';

interface IDashboardLayoutProps {
  children?: ReactNode;
  isProfilePage?: boolean;
}

const DashboardLayout: FC<IDashboardLayoutProps> = ({
  children,
  isProfilePage = false,
}) => {
  return (
    <div className={styles.dashboardLayoutWrapper}>
      <Row
        gutter={20}
        className="tw-bg-blue-grey tw-w-full"
        style={{
          margin: '0',
          padding: '0 !important',
          height: '100%',
          overflow: 'hidden',
        }}
      >
        <Col
          span={24}
          sm={24}
          md={10}
          lg={8}
          xl={6}
          xxl={5}
          style={{ position: 'relative', paddingLeft: 0, paddingRight: 0 }}
        >
          <Sidebar isProfilePage={isProfilePage} />
        </Col>

        <Col
          span={24}
          sm={24}
          md={14}
          lg={16}
          xl={18}
          xxl={19}
          style={{ height: '100%', paddingLeft: 0, paddingRight: 0 }}
        >
          {children}
        </Col>
      </Row>
    </div>
  );
};

export default DashboardLayout;
