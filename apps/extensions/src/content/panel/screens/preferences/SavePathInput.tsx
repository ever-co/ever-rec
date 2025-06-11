import React from 'react';
import { useTranslation } from 'react-i18next';

interface ISavePathProps {
  value: string;
  onChange: (value: string) => void;
}

const SavePathInput: React.FC<ISavePathProps> = ({ value, onChange }) => {
  const { t } = useTranslation();
  return (
    <div className="tw-flex tw-border tw-border-solid tw-border-app-grey tw-rounded-5">
      <div className="tw-flex tw-items-center tw-justify-center">
        <div className="tw-font-semibold tw-bg-app-grey tw-bg-opacity-10 tw-px-3 tw-py-1 tw-border-r tw-border-solid tw-border-app-grey">
          {t('page.install.downloadSlash')}
        </div>
      </div>
      <input
        type="text"
        className="tw-px-3"
        placeholder={t('page.install.egRec')}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
};

export default SavePathInput;
