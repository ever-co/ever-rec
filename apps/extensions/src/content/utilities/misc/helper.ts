export const parseCollectionToIdValueObj = (
  collection: Object | Array<any>,
) => {
  try {
    let result = collection;

    if (Array.isArray(collection)) {
      result = collection.filter((x) => x).every((x) => x.id)
        ? Object.fromEntries(collection.map((x) => [x.id, x]))
        : Object.fromEntries(
            collection.map((x, i) => (x.id ? [x.id, x] : [i, x])),
          );
    }

    return JSON.parse(JSON.stringify(result || {}));
  } catch (e) {
    console.log(e);
    return collection;
  }
};

export const parseCollectionToArray = (
  collection: Object | Array<any>,
  putKeyAsId?: boolean,
): any[] => {
  try {
    if (collection === null || collection === undefined) {
      return [];
    }

    if (Array.isArray(collection)) {
      return collection.filter((x) => x !== null || x !== undefined);
    }

    return Object.entries(collection).map(([key, value]) =>
      putKeyAsId ? { ...value, id: key } : value,
    );
  } catch (e) {
    console.log(e);
    return [];
  }
};
