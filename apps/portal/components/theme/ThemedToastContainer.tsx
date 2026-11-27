import { FC } from 'react';
import { ToastContainer } from 'react-toastify';
import useResolvedTheme from './useResolvedTheme';

/** The app's toast container, drawn in the theme on screen. */
const ThemedToastContainer: FC = () => {
  const theme = useResolvedTheme();

  return <ToastContainer theme={theme ?? 'light'} />;
};

export default ThemedToastContainer;
