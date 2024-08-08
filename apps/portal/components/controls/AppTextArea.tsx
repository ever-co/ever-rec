import classNames from 'classnames';
import React from 'react';

export type AppInputType = { value: string; errors?: string[] };

interface AppTextAreaProps {
  value: string;
  label?: string;
  placeholder?: string;
  rules?: ((v: any) => boolean | string)[];
  errors?: string[];
  inputContainerClass?: string;
  inputClass?: string;
  labelClass?: string;
  dense?: boolean;
  className?: string;
  canResize?: boolean;
  onChange: ({ value, errors }: AppInputType) => void;
}

const AppTextArea: React.FC<AppTextAreaProps> = ({
  value,
  label,
  placeholder,
  rules,
  errors,
  inputContainerClass,
  inputClass,
  labelClass,
  dense,
  className,
  canResize = true,
  onChange,
}) => {
  const inputChangeHandler = (val: string) => {
    const errArr: string[] = [];
    if (rules?.length) {
      rules.forEach((rule) => {
        const res: boolean | string = rule(val);
        res !== true && typeof res === 'string' && errArr.push(res);
      });
    }
    const payload: AppInputType = { value: val };
    if (rules?.length) {
      payload.errors = errArr;
    }
    onChange(payload);
  };

  const renderErrors = () => {
    if (errors?.length) {
      return (
        <div className="tw-p-1 tw-text-danger tw-w-full tw-text-xs tw-leading-2 tw-relative tw-z-10">
          {errors[0]}
        </div>
      );
    }
  };

  return (
    <div
      className={classNames(
        `tw-flex tw-items-center`,
        { 'tw-h-14': !dense },
        className,
      )}
    >
      {!!label && (
        <div className={classNames('tw-mr-3 tw-mt-1', labelClass)}>
          <label htmlFor={label}>{label}</label>
        </div>
      )}
      <div className={classNames(inputContainerClass, 'tw-w-full')}>
        <textarea
          value={value}
          name={label}
          placeholder={placeholder}
          className={classNames(
            'tw-py-2 tw-px-1 tw-w-full tw-text-base tw-border-b tw-border-black tw-bg-transparent tw-placeholder-black',
            inputClass,
          )}
          onChange={(e) => inputChangeHandler(e.target.value)}
          style={{ resize: canResize ? undefined : 'none' }}
        />
        {renderErrors()}
      </div>
    </div>
  );
};

export default AppTextArea;
