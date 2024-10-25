declare module '*.svg' {
  import React = require('react');
  export const ReactComponent: React.SFC<React.SVGProps<SVGSVGElement>>;
  const src: string;
  export default src;
}

declare module '*.module.scss' {
  const styles: {
    [className: string]: string;
  };
  export = styles;
}

declare module '@emoji-mart/react';
declare module 'howler';
