import { PipeTransform, ArgumentMetadata } from '@nestjs/common';

export class CanBePipe<T extends R, R> implements PipeTransform<T, R> {
  constructor(private value: T, private pipe: PipeTransform<T, R>) {
    // left blank intentionally
  }

  transform(value: T, metadata: ArgumentMetadata): R {
    // Optional casting into ObjectId if wanted!
    if (value === this.value) {
      return this.value;
    }
    return this.pipe.transform(value, metadata);
  }
}

export class OptionalPipe<T extends R | undefined, R> extends CanBePipe<T, R> {
  constructor(pipe: PipeTransform<T, R>) {
    super(undefined, pipe);
  }
}
