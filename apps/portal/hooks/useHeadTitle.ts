import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import IPageMenuItems from 'app/interfaces/IPageMenuItems';

/** Dynamically create a string that can be concatinated to the head title of a page based on provided menu items */
const useHeadTitle = (pageMenuItems: IPageMenuItems[]) => {
  const router = useRouter();
  const [activeRouteTitle, setActiveRouteTitle] = useState<string | null>(null);

  useEffect(() => {
    const activeRouteTitle = pageMenuItems.find((item) =>
      router.pathname.includes(item.type),
    )?.title;

    setActiveRouteTitle(activeRouteTitle || null);
  }, [pageMenuItems, router.pathname]);

  let headTitle = '';
  if (activeRouteTitle) {
    headTitle = ` - ${activeRouteTitle}`;
  }

  return headTitle;
};

export default useHeadTitle;
