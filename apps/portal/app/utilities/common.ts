export const webAppBaseUrl = 'https://rec.so';
export const appDateFormat = 'MMM DD, YYYY';
export const newAppDateFormat = 'DD MMMM, YY';
export const MENU_ID_VIDEO = 'menu-id_video';
export const MENU_ID_IMAGE = 'menu-id_image';

export const waiter = (miliseconds?: number) => {
  return new Promise((resolve) => {
    setTimeout(() => resolve(true), miliseconds);
  });
};

export const splitFilename = (
  filename: string,
): { name: string; ext: string } => {
  const fileArr = filename.split('.');
  const ext = fileArr.pop();
  return {
    name: fileArr.join(),
    ext: ext || '',
  };
};

export const sortbyDate = (firstElement: any, secondElement: any) => {
  return (
    new Date(secondElement.dbData.created).getTime() -
    new Date(firstElement.dbData.created).getTime()
  );
};

export const sortbyName = (firstElement: any, secondElement: any) => {
  return firstElement.dbData.title.localeCompare(secondElement.dbData.title);
};

export const sortFoldersbyName = (firstElement: any, secondElement: any) => {
  return firstElement.name.localeCompare(secondElement.name);
};

export const sortFoldersByDate = (firstElement: any, secondElement: any) => {
  return (
    new Date(secondElement?.created).getTime() -
    new Date(firstElement?.created).getTime()
  );
};
