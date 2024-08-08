import React, { ReactNode } from 'react';
import HorizontalDivider from '../../components/containers/dashboardLayout/elements/HorizontalDivider';


interface IPreferencesPartitionProps {
  children: ReactNode,
  hasUpperDivider?: boolean,
}

const PreferencePartition: React.FC<IPreferencesPartitionProps> = ({ children, hasUpperDivider = true }) => {
  return (
    <div>
      { hasUpperDivider && <HorizontalDivider /> }
      <div className="tw-py-5">
        {children}
      </div>
    </div>
  );
}

export default PreferencePartition;