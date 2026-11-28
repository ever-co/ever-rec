import React from 'react';

const PanelSplitter: React.FC = () => {
  return (
    <div
      style={{
        height: '0.75rem',
        width: '100%',

        borderTop: '1px solid hsl(var(--border))',
      }}
    ></div>
  );
};

export default PanelSplitter;
