import * as React from 'react';
import * as AvatarPrimitive from '@radix-ui/react-avatar';
import { cn } from 'app/utilities/cn';

const Avatar = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Root
    ref={ref}
    className={cn(
      'tw-relative tw-flex tw-size-8 tw-shrink-0 tw-overflow-hidden tw-rounded-full',
      className,
    )}
    {...props}
  />
));
Avatar.displayName = 'Avatar';

const AvatarImage = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Image>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Image
    ref={ref}
    className={cn('tw-aspect-square tw-size-full tw-object-cover', className)}
    {...props}
  />
));
AvatarImage.displayName = 'AvatarImage';

const AvatarFallback = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Fallback>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Fallback
    ref={ref}
    className={cn(
      'tw-flex tw-size-full tw-items-center tw-justify-center tw-rounded-[inherit] tw-bg-accent tw-text-xs tw-font-medium tw-text-accent-foreground',
      className,
    )}
    {...props}
  />
));
AvatarFallback.displayName = 'AvatarFallback';

/** Up to two initials of a name ("Ada Lovelace" → "AL", "acme" → "A"). */
const initialsOf = (name?: string | null): string => {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  const first = Array.from(parts[0])[0] ?? '';
  const last =
    parts.length > 1 ? (Array.from(parts[parts.length - 1])[0] ?? '') : '';

  return (first + last).toUpperCase();
};

export { Avatar, AvatarImage, AvatarFallback, initialsOf };
