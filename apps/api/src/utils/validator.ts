import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
  ValidateIf,
} from 'class-validator';

/**
 * @link https://stackoverflow.com/a/53786899
 */
export function IsNonPrimitiveArray(validationOptions?: ValidationOptions) {
  return (object: any, propertyName: string) => {
    registerDecorator({
      name: 'IsNonPrimitiveArray',
      target: object.constructor,
      propertyName,
      constraints: [],
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          return (
            Array.isArray(value) &&
            value.reduce(
              (a, b) => a && typeof b === 'object' && !Array.isArray(b),
              true,
            )
          );
        },
      },
    });
  };
}

// TODO consider creating IsNullable, IsUndefinable

/**
 * Checks if value is something and if so, ignores all validators.
 */
export function CanBe(
  val: any,
  validationOptions?: ValidationOptions,
): PropertyDecorator {
  return function CanBeDecorator(object: object, propertyName: string): void {
    ValidateIf((obj) => {
      return obj[propertyName] !== val;
    }, validationOptions)(object, propertyName);
  };
}

/**
 * Checks if value is in some values and if so, ignores all validators.
 */
export function CanBeIn(
  values: any[],
  validationOptions?: ValidationOptions,
): PropertyDecorator {
  return function CanBeInDecorator(object: object, propertyName: string): void {
    ValidateIf((obj) => !values.includes(obj[propertyName]), validationOptions)(
      object,
      propertyName,
    );
  };
}
