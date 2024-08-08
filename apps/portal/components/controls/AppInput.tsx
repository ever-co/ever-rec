import classNames from 'classnames';
import React, { MutableRefObject } from 'react';

export type onChangeInputType = ({
  value,
  errors,
}: {
  value: string;
  errors?: string[];
}) => void;

export type AppInputType = { value: string; errors?: string[] };

interface AppInputProps {
  value: string;
  placeholder?: string;
  type?: 'text' | 'number' | 'password';
  autoComplete?: 'new-password';
  maxLength?: number;
  rules?: ((v: any) => boolean | string)[];
  errors?: string[];
  className?: string;
  inputContainerClass?: string;
  inputClass?: string;
  labelClass?: string;
  errorClass?: string;
  dense?: boolean;
  label?: string;
  inputRef?: MutableRefObject<any>;
  onChange: ({ value, errors }: AppInputType) => void;
  onKeyDown?: (event: React.KeyboardEvent<HTMLInputElement>) => void;
}

const AppInput: React.FC<AppInputProps> = ({
  value,
  placeholder,
  type,
  autoComplete,
  maxLength,
  rules,
  errors,
  className,
  inputContainerClass,
  inputClass,
  labelClass,
  errorClass,
  dense,
  label,
  inputRef,
  onChange,
  onKeyDown,
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
          value={value}
          name={label}
          type={type}
          placeholder={placeholder}
          maxLength={maxLength}
          autoComplete={autoComplete}
          className={classNames(
            'tw-py-2 tw-px-1 tw-w-full tw-text-base tw-border-b tw-border-black tw-bg-transparent tw-placeholder-black',
            inputClass,
          )}
          onChange={(e) => inputChangeHandler(e.target.value)}
          onKeyDown={onKeyDown}
        />
        {renderErrors()}
      </div>
    </div>
  );
};

export default AppInput;
