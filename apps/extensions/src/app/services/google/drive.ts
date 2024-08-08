import axios from 'axios';
import { errorHandler } from '../helpers/errors';
import { getDriveToken, setDriveToken } from './auth';
import store from '@/app/store/panel';
import AuthAC from '@/app/store/auth/actions/AuthAC';
import { appLogger } from '@/app/AppLogger';
import browser from '@/app/utilities/browser';
import api from '../api/api';
import { IDataResponse } from '@/app/interfaces/IDataResponse';
import { IDriveDbData } from '@/app/interfaces/IDriveDbData';

//TODO: This file is for moving into the API, but we don't use Drive yet, so when someone starts fixing it,
// these must be transferred to the API.

export interface DriveFile {
  id: string;
  kind: string;
  mimeType: string;
  name: string;
}

// const api = axios.create({
//   baseURL: 'https://www.googleapis.com',
//   responseType: 'json',
// });

// api.interceptors.request.use(
//   async (config: any) => {
//     const driveToken = await getDriveToken();
//     console.log(driveToken);

//     if (!driveToken) {
//       await browser.tabs.create({
//         url: `${process.env.WEBSITE_URL}/auth/google-auth`,
//       });
//     }

//     if (driveToken) {
//       config.headers['Authorization'] = 'Bearer ' + driveToken;
//     }

//     return config;
//   },
//   (  error: any) => {
//     Promise.reject(error);
//   }
// );

// api.interceptors.response.use(
//   (  response: { data: any; }) => {
//     return response.data;
//   },
//   async (error: { config: any; response: { status: number; }; }) => {
//     const originalRequest = error.config;
//     if (error.response.status === 401 && !originalRequest._retry) {
//       appLogger.add({eventType: 'UserDisconnectedTheirGDrive'});
//       store.dispatch(AuthAC.setDriveUser({driveUser: null}));
//       originalRequest._retry = true;
//       await browser.tabs.create({
//         url: `${process.env.WEBSITE_URL}/auth/google-auth`,
//       });
//       return api(originalRequest);
//     }
//     return Promise.reject(error);
//   }
// );

export async function driveUploadFile(
  name: string,
  blob: Blob,
  itemId: any,
  itemType: string,
): Promise<IDataResponse<{ fileId: string; drivesData: IDriveDbData[] }>> {
  const formData = new FormData();
  const fileExtensions: any = {
    'video/mp4': '.mp4',
    'video/webm': '.webm',
  };
  const mappedName = fileExtensions[blob.type]
    ? `${name}${fileExtensions[blob.type]}`
    : name;
  const metadata = { name: mappedName, mimeType: blob.type };

  formData.append('blob', blob);
  formData.append('metadata', JSON.stringify(metadata));

  return api.post(
    `/api/v1/drive/upload/file?itemId=${itemId}&itemType=${itemType}`,
    formData,
  );
}

// export const driveUploadFile = async (
//   name: string,
//   blob: Blob,
// ): Promise<string> => {
//   let imageId = '';
//   const workingFolder: DriveFile | null = store.getState().drive.workingFolder;
//   const metadata = {
//     name,
//     mimeType: blob.type,
//   };
//   workingFolder && Object.assign(metadata, { parents: [workingFolder.id] });
//   const form = new FormData();
//   form.append(
//     'metadata',
//     new Blob([JSON.stringify(metadata)], { type: 'application/json' }),
//   );
//   form.append('file', blob);
//   try {
//     const res: any = await api.post(
//       '/upload/drive/v3/files?uploadType=multipart&fields=id',
//       form,
//     );
//     imageId = res?.id;
//     // const preferences = await getPreferences();
//     // && preferences?.showSharedGDriveLink
//     imageId && driveСreatePermission(imageId, 'commenter', 'anyone');
//   } catch (e: any) {
//     errorHandler(e);
//   }
//   return imageId;
// };

export const driveСreatePermission = async (
  fileId: string,
  role: string,
  type: string,
): Promise<boolean> => {
  let uploaded = false;
  try {
    await api.post(`/drive/v3/files/${fileId}/permissions`, {
      role,
      type,
    });
    uploaded = true;
  } catch (e: any) {
    errorHandler(e);
  }
  return uploaded;
};

export const deleteDriveItem = (
  itemId: string,
  itemType: string,
): Promise<IDataResponse<IDriveDbData[]>> => {
  return api.delete(`/api/v1/drive/file?itemId=${itemId}&itemType=${itemType}`);
};

export const getDriveData = async (): Promise<any> => {
  // let folders: DriveFile[] = [];
  // try {
  //   const query = querystring({
  //     q: "mimeType='application/vnd.google-apps.folder' and trashed=false",
  //   });
  //   const res: any = await api.get('/drive/v3/files?'+ query);
  //   folders = res.files?.length > 0 ? res.files as DriveFile[] : [];
  // } catch (e: any) {
  //   errorHandler(e);
  // }
  // store.dispatch(DriveAC.setFolders({ folders }));
  // await getWorkingFolder(folders);
  // return folders;
};

export const updateWorkingFolder = async (
  workingFolder: DriveFile | null,
): Promise<void> => {
  // const uid: string|undefined = firebaseAuth.currentUser?.uid;
  // if(uid) {
  //   try {
  //     const userRef: DatabaseReference = dbRef(firebaseDb, `users/${uid}`);
  //     const workingFolderId = workingFolder?.id || null;
  //     await update(userRef, {
  //       workingFolderId,
  //     });
  //     store.dispatch(DriveAC.setWorkingFolder({ workingFolder }));
  //   } catch (e: any) {
  //     errorHandler(e);
  //   }
  // }
};

export const getWorkingFolder = async (folders: DriveFile[]): Promise<void> => {
  // const uid: string|undefined = firebaseAuth.currentUser?.uid;
  // if(uid) {
  //   try {
  //     const userRef: DatabaseReference = dbRef(firebaseDb, `users/${uid}`);
  //     const snapshot: DataSnapshot = await get(userRef);
  //     const workingFolderId = snapshot.val().workingFolderId;
  //     const folder = workingFolderId ? folders.find((folder: DriveFile) => folder.id === workingFolderId) : null;
  //     store.dispatch(DriveAC.setWorkingFolder({ workingFolder: folder || null }));
  //   } catch (e: any) {
  //     errorHandler(e);
  //   }
  // }
};

const driveFolderId = async (): Promise<any> => {
  // try {
  //   const query = querystring({
  //     q: "mimeType='application/vnd.google-apps.folder' and name='Rec' and trashed=false",
  //   });
  //   const res: any = await api.get('/drive/v3/files?'+ query);
  //   const folder:DriveFile|null= res.files?.length > 0 ? res.files[0] as DriveFile : null;
  //   return folder ? folder.id : await createAppFolder();
  // } catch (e: any) {
  //   errorHandler(e);
  // }
  // return undefined;
};

const createAppFolder = async (): Promise<string | undefined> => {
  const metadata = {
    name: 'Rec',
    mimeType: 'application/vnd.google-apps.folder',
  };
  const form = new FormData();
  form.append(
    'metadata',
    new Blob([JSON.stringify(metadata)], { type: 'application/json' }),
  );
  try {
    const res: any = await api.post('/upload/drive/v3/files?&fields=id', form);
    return res.id;
  } catch (e: any) {
    errorHandler(e.message);
  }
};
