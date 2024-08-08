import React from 'react';


interface ISavePathProps {
  value: string;
  onChange: (value: string) => void;
}

const SavePathInput: React.FC<ISavePathProps> = ({ value, onChange }) => {
  return (<div className="tw-flex tw-border tw-border-solid tw-border-app-grey tw-rounded-5">
    <div className="tw-flex tw-items-center tw-justify-center tw-w-">
      <div className="tw-font-semibold tw-bg-app-grey tw-bg-opacity-10 tw-px-3 tw-py-1 tw-border-r tw-border-solid tw-border-app-grey">
        Downloads/</div>
    </div>
    <input
    type="text"
    className="tw-px-3"
    placeholder="e.g., Rec"
    value={value}
    onChange={(e) => onChange(e.target.value)}
    />
  </div>);
};

export default SavePathInput;
