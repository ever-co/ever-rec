import { IDataResponse, ResStatusEnum } from '../../interfaces/IApiResponse';
import { errorHandler } from './errors';

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
