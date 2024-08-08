import classNames from 'classnames';
import React from 'react';

export type AppSelectType = { value: string; errors?: string[] };

interface AppSelectProps {
  label?: string;
  type?: 'text' | 'number' | 'password';
  value: string;
  placeholder?: string;
  onChange: any;
  rules?: ((v: any) => boolean | string)[];
  errors?: string[];
  options?: any[];
  inputContainerClass?: string;
  inputClass?: string;
  labelClass?: string;
  dense?: boolean;
  className?: string;
}

const AppSelect: React.FC<AppSelectProps> = ({
  label,
  placeholder,
  onChange,
  errors,
  inputContainerClass,
  inputClass,
  labelClass,
  dense,
  className,
  options,
  value,
}) => {
  const renderErrors = () => {
    if (errors?.length) {
      return (
        <div className="tw-p-1 tw-text-danger tw-w-full tw-text-xs tw-leading-2">
          {errors[0]}
        </div>
      );
    }
  };

  return (
    <div
      className={classNames(
        'tw-flex tw-items-center tw-grid',
        { 'tw-h-14': !dense },
        className,
      )}
    >
      {!!label && (
        <div className={classNames('tw-grid-rows-12', labelClass)}>
          <label htmlFor={label}>{label}</label>
        </div>
      )}
      <div
        className={classNames(
          inputContainerClass,
          'tw-w-full tw-mt-1 tw-mb-2 tw-grid-rows-12',
        )}
      >
        <select
          name={label}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          value={value}
          className={classNames(
            `tw-py-2 tw-px-1 tw-w-full tw-text-base tw-border-b tw-border-black tw-form-select tw-form-select-sm text-gray-700
                        tw-bg-white tw-bg-clip-padding tw-bg-no-repeat
                        tw-border tw-border-solid tw-border-gray-300 tw-rounded
                        tw-focus:bg-white tw-transition tw-ease-in-out tw-0
                        tw-focus:outline-none tw-bg-transparent`,
            inputClass,
          )}
        >
          <option value={''}>Please select option</option>
          {options &&
            options.length > 0 &&
            options.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
        </select>
        {renderErrors()}
      </div>
    </div>
  );
};

export default AppSelect;
