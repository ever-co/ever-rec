import classNames from 'classnames';
import React from 'react';

export interface IAppHeaderProps {
  part1: string;
  part2: string;
  title?: string;
  className?: string;
  spacing?: boolean;
  textSize?: 'xl' | '2xl' | '4xl' | '5xl';
}

// Whole class names, so Tailwind finds them (a class built as `tw-text-${size}` is never
// generated). A page title is 24px in the Ever shell; the two larger sizes are one step up.
const SIZE_CLASS: Record<NonNullable<IAppHeaderProps['textSize']>, string> = {
  xl: 'tw-text-xl',
  '2xl': 'tw-text-2xl',
  '4xl': 'tw-text-2xl',
  '5xl': 'tw-text-3xl',
};

const AppHeader: React.FC<IAppHeaderProps> = ({
  part1,
  part2,
  title,
  spacing = true,
  className,
  textSize = '4xl',
}) => {
  return title ? (
    <h1
      className={classNames(
        'tw-text-foreground',
        className,
        `tw-text-2xl`,
        '!tw-mb-6',
      )}
    >
      {title}
    </h1>
  ) : (
    <h1
      className={classNames(
        'tw-font-semibold tw-text-foreground',
        className,
        SIZE_CLASS[textSize],
      )}
    >
      <span className={classNames({ 'tw-mr-2': spacing })}>{part1}</span>
      <span>{part2}</span>
    </h1>
  );
};

export default AppHeader;
