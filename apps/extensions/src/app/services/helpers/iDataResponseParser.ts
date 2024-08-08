import { IDataResponse, ResStatusEnum } from '@/app/interfaces/IDataResponse';
import { errorHandler } from '@/app/services/helpers/errors';

export const iDataResponseParser = <T>(
  response: IDataResponse<T>,
  showNotification = true,
): null | typeof response.data => {
  if (response.status === ResStatusEnum.error) {
    window && showNotification && errorHandler(response);
    return null;
  } else {
    return response.data as T;
  }
};
