import { IDataResponse } from '../../../../interfaces/_types';

export interface PasswordResetEmailStrategy {
  execute(email: string): Promise<IDataResponse>;
}

export const PASSWORD_RESET_EMAIL_STRATEGY = Symbol('PASSWORD_RESET_EMAIL_STRATEGY');
