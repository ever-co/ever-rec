import { IsNumber, IsString } from 'class-validator';

export class LikeDto {
  @IsString()
  uid: string;

  @IsNumber()
  timestamp: number;
}
