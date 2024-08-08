import axios from 'axios';
import { errorHandler } from '../helpers/errors';
import store from 'app/store/panel';
import AuthAC from 'app/store/auth/actions/AuthAC';
import DriveAC from 'app/store/drive/actions/DriveAC';
import { getPreferences } from '../auth';
import api from '../api/api';
import { IDataResponse } from '../../interfaces/IApiResponse';
import { IDriveDbData } from '../../interfaces/IDriveDbData';

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
//     let driveToken = await getDriveToken();
//
//     if (!driveToken) {
//       driveToken = await googleAuthentication();
//     }
//
//     if (driveToken?.access_token) {
//       config.headers['Authorization'] = 'Bearer ' + driveToken?.access_token;
//     }
//
//     return config;
//   },
//   (error: any) => {
//     Promise.reject(error);
//   },
// );
//
// api.interceptors.response.use(
//   (response: { data: any }) => {
//     return response.data;
//   },
//   async (error: { config: any; response: { status: number } }) => {
//     const originalRequest = error.config;
//     if (error.response?.status === 401 && !originalRequest._retry) {
//       appLogger.add({ eventType: 'UserDisconnectedTheirGDrive' });
//       store.dispatch(AuthAC.setDriveUser({ driveUser: null }));
//       originalRequest._retry = true;
//       const driveToken = await googleAuthentication();
//       if (driveToken) {
//         appLogger.add({ eventType: 'UserConnectedTheirGDrive' });
//         await setDriveToken(driveToken);
//       }
//       api.defaults.headers.common['Authorization'] =
//         'Bearer ' + driveToken.access_token;
//       return api(originalRequest);
//     }
//     return Promise.reject(error);
//   },
// );

export async function driveUploadFile(
  name: string,
  blob: Blob,
  itemId: string,
  itemType: string,
): Promise<IDataResponse<{ fileId: string; drivesData: IDriveDbData[] }>> {
  const formData = new FormData();
  const fileExtensions = {
    'video/mp4': '.mp4',
    'application/x-mpegurl': '.mpeg4',
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

export const deleteDriveItem = (
  itemId: string,
  itemType: string,
): Promise<IDataResponse<IDriveDbData[]>> => {
  return api.delete(`/api/v1/drive/file?itemId=${itemId}&itemType=${itemType}`);
};

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

export const getDriveData = async (): Promise<any> => {
  // TODO: this is to be moved to the API
  // let folders: DriveFile[] = [];
  // try {
  //   const query = querystring({
  //     q: "mimeType='application/vnd.google-apps.folder' and trashed=false",
  //   });
  //   const res: any = await api.get('/drive/v3/files?' + query);
  //   folders = res.files?.length > 0 ? (res.files as DriveFile[]) : [];
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
  // TODO: this is to be moved to the API
  // const uid: string | undefined = firebaseAuth.currentUser?.uid;
  // if (uid) {
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
  // TODO: this is to be moved to the API
  // const uid: string | undefined = firebaseAuth.currentUser?.uid;
  // if (uid) {
  //   try {
  //     const userRef: DatabaseReference = dbRef(firebaseDb, `users/${uid}`);
  //     const snapshot: DataSnapshot = await get(userRef);
  //     const workingFolderId = snapshot.val().workingFolderId;
  //     const folder = workingFolderId
  //       ? folders.find((folder: DriveFile) => folder.id === workingFolderId)
  //       : null;
  //     store.dispatch(
  //       DriveAC.setWorkingFolder({ workingFolder: folder || null }),
  //     );
  //   } catch (e: any) {
  //     errorHandler(e);
  //   }
  // }
};

const driveFolderId = async (): Promise<any> => {
  // TODO: this is to be moved to the API
  // try {
  //   const query = querystring({
  //     q: "mimeType='application/vnd.google-apps.folder' and name='Rec' and trashed=false",
  //   });
  //   const res: any = await api.get('/drive/v3/files?' + query);
  //   const folder: DriveFile | null =
  //     res.files?.length > 0 ? (res.files[0] as DriveFile) : null;
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
