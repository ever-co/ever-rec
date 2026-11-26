import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from 'app/utilities/cn';

// The Ever button recipe: Ever Works' sizes (sm 32, default 36, lg 44) and its black-on-white /
// white-on-black primary, written as shadcn variants.
const buttonVariants = cva(
  'tw-inline-flex tw-shrink-0 tw-items-center tw-justify-center tw-gap-2 tw-whitespace-nowrap tw-rounded-md tw-text-sm tw-font-medium tw-transition-colors tw-duration-150 tw-outline-none focus-visible:tw-ring-2 focus-visible:tw-ring-ring focus-visible:tw-ring-offset-2 focus-visible:tw-ring-offset-background disabled:tw-pointer-events-none disabled:tw-opacity-50 [&_svg]:tw-pointer-events-none [&_svg]:tw-size-4 [&_svg]:tw-shrink-0',
  {
    variants: {
      variant: {
        default:
          'tw-bg-primary tw-text-primary-foreground hover:tw-bg-primary/90',
        destructive:
          'tw-bg-destructive tw-text-destructive-foreground hover:tw-bg-destructive/90',
        outline:
          'tw-border tw-border-solid tw-border-input tw-bg-transparent tw-text-foreground hover:tw-bg-accent hover:tw-text-accent-foreground',
        secondary:
          'tw-bg-secondary tw-text-secondary-foreground hover:tw-bg-accent',
        ghost:
          'tw-bg-transparent tw-text-foreground hover:tw-bg-accent hover:tw-text-accent-foreground',
        link: 'tw-bg-transparent tw-text-brand-text tw-underline-offset-4 hover:tw-underline',
      },
      size: {
        default: 'tw-h-9 tw-px-4 tw-text-sm',
        sm: 'tw-h-8 tw-px-3 tw-text-xs',
        lg: 'tw-h-11 tw-px-6 tw-text-base',
        icon: 'tw-size-9',
        'icon-sm': 'tw-size-8',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, type, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';

    return (
      <Comp
        ref={ref}
        type={asChild ? undefined : (type ?? 'button')}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      />
    );
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
