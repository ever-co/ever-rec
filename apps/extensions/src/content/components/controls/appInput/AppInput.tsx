import classNames from 'classnames';
import React, { MutableRefObject } from 'react';

export type onChangeInputType = ({
  value,
  errors,
}: {
  value: string;
  errors?: string[];
}) => void;

interface AppInputProps {
  value: string;
  placeholder?: string;
  maxLength?: number;
  type?: 'text' | 'number' | 'password';
  rules?: ((v: any) => boolean | string)[];
  errors?: string[];
  className?: string;
  inputContainerClass?: string;
  inputClass?: string;
  labelClass?: string;
  errorClass?: string;
  label?: string;
  dense?: boolean;
  inputRef?: MutableRefObject<any>;
  onChange: onChangeInputType;
}

const AppInput: React.FC<AppInputProps> = ({
  label,
  type,
  value,
  placeholder,
  rules,
  onChange,
  errors,
  inputContainerClass,
  inputClass,
  labelClass,
  dense,
  className,
  inputRef,
  maxLength,
  errorClass,
}) => {
  const inputChangeHandler = (val: string) => {
    const errArr: string[] = [];
    if (rules?.length) {
      rules.forEach((rule) => {
        const res: boolean | string = rule(val);
        res !== true && typeof res === 'string' && errArr.push(res);
      });
    }
    const payload: { value: string; errors?: string[] } = { value: val };
    if (rules?.length) {
      payload.errors = errArr;
    }
    onChange(payload);
  };

  const renderErrors = () => {
    if (errors?.length) {
      return (
        <div
          className={classNames(
            'tw-p-1 tw-text-danger tw-w-full tw-text-xs tw-leading-2 tw-absolute tw-z-10',
            errorClass,
          )}
        >
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
        <input
          ref={inputRef}
          name={label}
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={(e) => inputChangeHandler(e.target.value)}
          className={classNames(
            'tw-py-2 tw-px-1 tw-w-full tw-text-base tw-border-b tw-border-black tw-bg-transparent tw-placeholder-black',
            inputClass,
          )}
          maxLength={maxLength}
        />
        {renderErrors()}
      </div>
    </div>
  );
};

export default AppInput;
