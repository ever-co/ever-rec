import { useState } from 'react';

const ITEMS_PER_PAGE = 9;

const useInfiniteScroll = (toLoad?: number) => {
  const [itemsToLoad, setItemsToLoad] = useState(toLoad ?? ITEMS_PER_PAGE);

  const loadMoreItems = () => {
    setItemsToLoad((prevNumber) => prevNumber + (toLoad ?? ITEMS_PER_PAGE));
  };

  return { itemsToLoad, loadMoreItems };
};

export default useInfiniteScroll;
