import IAppControl, { IAppControlData } from '@/app/interfaces/IAppControl';
import { emailRule, requiredRule } from '@/app/rules';
import { signinUserWithCreds } from '@/app/services/auth';
import AppButton from '@/content/components/controls/appButton/AppButton';
import AppInput from '@/content/components/controls/appInput/AppInput';
import React, { useEffect, useState } from 'react';


const PanelLogin: React.FC = () => {

  const initialControl = ():IAppControl => ({
    value: '',
    errors: [],
    touched: false,
  });

  const [email, setEmail] = useState<IAppControl>(initialControl());
  const [password, setPassword] = useState<IAppControl>(initialControl());
  const [valid, setValid] = useState<boolean>(false);

  const emailRules: ((v: string) => boolean|string)[] = [
    requiredRule('Please enter email'),
    emailRule('Email is incorrect'),
  ];

  const passwordRules: ((v: string) => boolean|string)[] = [
    requiredRule('Please enter pasword'),
  ];

  useEffect(() => {
    setValid([email, password].every(control => control.touched && !control.errors.length));
  }, [email, password]);

  const emailChangeHandler = ({ value, errors }:IAppControlData) => {
    setEmail({
      value,
      errors: errors || [],
      touched: true,
    })
  }

  const passwordChangeHandler = ({ value, errors }:IAppControlData) => {
    setPassword({
      value,
      errors: errors || [],
      touched: true,
    })
  }

  const login = ():void => {
    valid && signinUserWithCreds({email: email.value, password: password.value});
    setEmail(initialControl());
    setPassword(initialControl());
  }

  return (
    <div>
      <AppInput
      placeholder="Email Address"
      value={email.value} 
      errors={email.errors}
      onChange={emailChangeHandler} 
      rules={emailRules}
      />
      
      <AppInput
      placeholder="Password"
      type="password"
      value={password.value} 
      errors={password.errors}
      onChange={passwordChangeHandler} 
      rules={passwordRules}
      />
      
      <AppButton 
      onClick={login} 
      full
      disabled={!valid}
      className="tw-mt-8"
      >Login</AppButton>
    </div>

  );
}

export default PanelLogin;