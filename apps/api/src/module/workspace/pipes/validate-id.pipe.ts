import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { is_id } from '../validators/id.validator';

@Injectable()
export class ValidateId implements PipeTransform<string> {
  transform(value: string): string {
    if (is_id(value)) {
      return value;
    }
    throw new BadRequestException('Invalid folder id');
  }
}

@Injectable()
export class ParseOptionalId implements PipeTransform<string, string | false> {
  transform(value: string): string | false {
    if (value === 'false') {
      return false;
    }
    if (is_id(value)) {
      return value;
    }
    throw new BadRequestException('Invalid folder id');
  }
}
