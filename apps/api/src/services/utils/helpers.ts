import { PermissionAccessEnum } from '../../module/workspace/Interfaces/Workspace';
import { database } from 'firebase-admin';
import { Reference } from 'firebase-admin/database';

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

export const parseCollectionToArray = <T = any>(
  collection: Object | Array<any>,
  putKeyAsId?: boolean,
): T[] => {
  try {
    if (collection === null || collection === undefined) {
      return [];
    }

    if (Array.isArray(collection)) {
      return collection;
    }

    return Object.entries(collection).map(([key, value]) =>
      putKeyAsId ? { ...value, id: key } : value,
    );
  } catch (e) {
    console.log(e);
    return [];
  }
};

export const evaluateAccessType = (
  givenAccess: PermissionAccessEnum,
  requiredAccess: PermissionAccessEnum,
) => {
  if (givenAccess === PermissionAccessEnum.NONE) {
    return false;
  }
  switch (requiredAccess) {
    case PermissionAccessEnum.READ:
      return (
        givenAccess === PermissionAccessEnum.READ || PermissionAccessEnum.WRITE
      );
    case PermissionAccessEnum.WRITE:
      return givenAccess === PermissionAccessEnum.WRITE;
    case PermissionAccessEnum.ADMIN:
      return givenAccess === PermissionAccessEnum.ADMIN;
    default:
      console.log(
        'Got into default case when evaluating access. File src/services/helpers.ts. Probably a wrong passed SetMetadata on some controller',
      );
      return false;
  }
};

export const formatDataToArray = (data: any) => {
  let result: any[] = [];

  if (Array.isArray(data)) {
    result = data.slice();
  } else if (typeof data === 'object' && data === Object(data)) {
    // tslint:disable-next-line: forin
    for (const key in data as object) {
      result[key] = data[key];
    }
  }

  result = result.filter(Boolean);
  return result;
};

export const promiseAllSettled = async <T>(promises: Promise<T>[]) => {
  return Promise.allSettled(promises).then((results) => {
    const allValues: T[] = (
      results.filter(
        (c) => c.status === 'fulfilled',
      ) as PromiseFulfilledResult<any>[]
    ).map((c) => c.value);

    const failedResults = (
      results.filter((c) => c.status === 'rejected') as PromiseRejectedResult[]
    ).map((c) => c.reason);

    failedResults.length > 0 && console.log(failedResults);

    return allValues;
  });
};

export const getDataFromDB = async <T = any>(
  path: string,
): Promise<{ ref: Reference; value: T }> => {
  const ref = database().ref(path);
  const snap = await ref.get();
  const value = snap.val();

  if (value === null) {
    return { ref, value: null };
  }

  return { ref, value };
};
