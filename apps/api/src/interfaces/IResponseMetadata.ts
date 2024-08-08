import { ResStatusEnum } from '../enums/ResStatusEnum';

export interface IResponseMetadata {
  status: ResStatusEnum;
  message: string;
  error: Error | null;
}
