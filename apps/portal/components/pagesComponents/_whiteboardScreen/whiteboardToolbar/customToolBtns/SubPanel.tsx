import React from 'react';

interface IToolSubPanelProp {
  children?: React.ReactNode;
}

const SubPanel: React.FC<IToolSubPanelProp> = ({ children }) => {
  return (
    <div className=" tw-text-black tw-bg-white tw-rounded ">
      {children}
    </div>
  );
};

export default SubPanel;
