import { Injectable, PipeTransform } from '@nestjs/common';

@Injectable()
export class ParseOnFalse implements PipeTransform<string, string | false> {
  transform(value: string): string | false {
    if (value === 'false') {
      return false;
    }
    return value;
  }
}
