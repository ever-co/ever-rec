import { IDataResponse, ResStatusEnum } from '../../interfaces/IApiResponse';

// TODO: there is a lot simpler function that handles IDataResponse here. Check if this can be removed and use the other.
export const responseDataParser = (
  response: IDataResponse,
  checkMessage?: string,
): any => {
  if (checkMessage) {
    if (
      response.status === ResStatusEnum.error &&
      response.message === checkMessage
    ) {
      throw response;
    } else if (
      response.status === ResStatusEnum.error &&
      response.message !== checkMessage
    ) {
      return response;
    }
  } else if (response.status === ResStatusEnum.error) {
    throw response;
  }

  return response.data;
};
