import { ResStatusEnum } from 'src/enums/ResStatusEnum';
import { IDataResponse } from 'src/interfaces/_types';

export const sendResponse = <T>(data: T): IDataResponse<T> => {
  return {
    status: ResStatusEnum.success,
    message: 'Success!',
    error: null,
    data: data,
  };
};

export const sendError = (
  message: string,
  error?: any
): IDataResponse<null> => {
  return {
    status: ResStatusEnum.error,
    message: message,
    error: error || null,
    data: null,
  };
};
