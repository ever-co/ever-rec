import { FC, ReactNode, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ConfigProvider, message } from 'antd';
import { DirectionContext, useDocumentDirection } from 'i18n/direction';

/**
 * Lays the app out right to left for Arabic and Hebrew: `<html lang/dir>` follow i18next (the
 * Tailwind `rtl:` variants and logical classes key off `dir`), antd's components get the direction
 * through `ConfigProvider`, and code that picks a physical side reads it with `useDirection()`.
 */
const DirectionProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const { i18n } = useTranslation();
  const direction = useDocumentDirection(i18n);

  useEffect(() => {
    // antd's `message` renders outside the provider tree.
    message.config({ rtl: direction === 'rtl' });
  }, [direction]);

  return (
    <DirectionContext.Provider value={direction}>
      <ConfigProvider direction={direction}>{children}</ConfigProvider>
    </DirectionContext.Provider>
  );
};

export default DirectionProvider;
