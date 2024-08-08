import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { is_video_filename } from '../validators/video-filename.validator';

@Injectable()
export class ValidateVideoFilename implements PipeTransform<string> {
  transform(value: string): string {
    if (is_video_filename(value)) {
      return value;
    }
    throw new BadRequestException('Invalid video filename');
  }
}
