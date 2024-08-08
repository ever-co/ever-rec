import { useCallback, useEffect, useState } from 'react';

const useItemsFilter = (itemData: any[] | null) => {
  const [filter, setFilter] = useState('');
  const [filterItemData, setFilterItemData] = useState<any[] | null>(null);

  const onFilterChange = useCallback(
    (filterValue: string) => {
      setFilter(filterValue);

      let results = null;
      if (Array.isArray(itemData) && filterValue) {
        results = itemData.filter((item) => {
          return item.dbData.title
            .toLowerCase()
            .includes(filterValue.toLowerCase());
        });
      }

      setFilterItemData(results);
    },
    [itemData],
  );

  // Effect to reapply filter to new itemData
  useEffect(() => {
    onFilterChange(filter);

    // Redundant to activate this effect on "filter" change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onFilterChange]);

  return { filter, filterItemData, onFilterChange };
};

export default useItemsFilter;

/*
 This code makes sure we use only one .map in jsx
 */
export const getItemsToMapByReference = (
  itemData: any[] | null,
  filterItemData: any[] | null,
): any[] | null => {
  let itemsToMap = itemData;
  if (filterItemData) {
    if (filterItemData.length) itemsToMap = filterItemData;
    else itemsToMap = null;
  }

  return itemsToMap;
};
