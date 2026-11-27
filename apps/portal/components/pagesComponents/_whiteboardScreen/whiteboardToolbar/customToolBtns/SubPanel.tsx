import React from 'react';

interface IToolSubPanelProp {
  children?: React.ReactNode;
}

// The floating panel of a tool. A tool that passes an empty element (the comments tool) has
// nothing to show, so the panel's frame is hidden for it.
const SubPanel: React.FC<IToolSubPanelProp> = ({ children }) => {
  return (
    <div className="tw-rounded-lg tw-border tw-border-border tw-bg-popover tw-text-popover-foreground tw-shadow-[var(--shadow-float)] [&:has(>:only-child:empty)]:tw-hidden">
      {children}
    </div>
  );
};

export default SubPanel;
