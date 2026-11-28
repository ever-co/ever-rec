import React from 'react';
import { useTranslation } from 'react-i18next';

interface ISavePathProps {
  value: string;
  onChange: (value: string) => void;
}

const SavePathInput: React.FC<ISavePathProps> = ({ value, onChange }) => {
  const { t } = useTranslation();
  return (
    <div className="tw-flex tw-h-9 tw-overflow-hidden tw-rounded-md tw-border tw-border-solid tw-border-input tw-transition-[border-color,box-shadow] tw-duration-150 focus-within:tw-border-ring focus-within:tw-ring-2 focus-within:tw-ring-ring/20">
      <div className="tw-flex tw-items-center tw-justify-center">
        <div className="tw-flex tw-h-full tw-items-center tw-border-0 tw-border-e tw-border-solid tw-border-input tw-bg-muted tw-px-3 tw-text-sm tw-font-medium tw-text-muted-foreground">
          {t('page.install.downloadSlash')}
        </div>
      </div>
      <input
        type="text"
        className="tw-min-w-0 tw-flex-1 tw-bg-transparent tw-px-3 tw-text-sm tw-text-foreground tw-outline-none placeholder:tw-text-muted-foreground"
        placeholder={t('page.install.egRec')}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
};

export default SavePathInput;
