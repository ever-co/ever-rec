import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { is_image_filename } from '../validators/image-filename.validator';

@Injectable()
export class ValidateImageFilename implements PipeTransform<string> {
  transform(value: string): string {
    if (is_image_filename(value)) {
      return value;
    }
    throw new BadRequestException('Invalid image filename');
  }
}
