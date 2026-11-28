import { FC } from 'react';
import { ToastContainer } from 'react-toastify';
import { useDirection } from 'i18n/direction';
import useResolvedTheme from './useResolvedTheme';

/** The app's toast container, drawn in the theme on screen and in the page's direction. */
const ThemedToastContainer: FC = () => {
  const theme = useResolvedTheme();
  const direction = useDirection();

  return <ToastContainer theme={theme ?? 'light'} rtl={direction === 'rtl'} />;
};

export default ThemedToastContainer;
