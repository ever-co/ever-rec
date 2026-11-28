import clsx, { ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

// The portal's Tailwind classes carry the `tw-` prefix; without it tailwind-merge treats every
// class as unknown and never resolves a conflict (`tw-px-2 tw-px-4` would keep both).
const twMerge = extendTailwindMerge({ prefix: 'tw-' });

/** Merge classes with tailwind-merge with clsx full feature */
export function cn(...classes: ClassValue[]) {
  return twMerge(clsx(...classes));
}
