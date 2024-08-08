import { isChrome, isEdge, isOpera } from 'react-device-detect';
export const isBrowserCompatible = isChrome || isEdge || isOpera;
