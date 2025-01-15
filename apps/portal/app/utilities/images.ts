import jsPDF from 'jspdf';
import moment from 'moment';
import IEditorImage from '../interfaces/IEditorImage';
import IPreferences, { ImageExtention } from '../interfaces/IPreferences';
// import { getPreferences } from '../services/auth';
import { errorHandler } from '../services/helpers/errors';
import { appDateFormat } from './common';
import { saveAs } from 'file-saver';
import { successMessage } from 'app/services/helpers/toastMessages';

export const defaultPreferences: IPreferences = {
  imageExt: 'png',
  showSharedGDriveLink: false,
  defaultSave: true,
  defaultSavePath: '',
  addInfoOnTop: false,
};

export const pdfFromImageUrl = async (url: string): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    try {
      const image = new Image();
      image.onload = function () {
        const width = image.width;
        const height = image.height;
        const orientation = width > height ? 'l' : 'p';
        const pdf = new jsPDF(orientation, 'px', [width, height]);
        pdf.addImage(image, 0, 0, width, height);
        const blob: Blob = pdf.output('blob');
        resolve(blob);
      };
      image.src = url;
    } catch (e: any) {
      reject(e.message);
    }
  });
};

export const getBlobfromUrl = async (url: string): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    try {
      const image = new Image();
      image.crossOrigin = 'Anonymous';
      image.onload = function () {
        const width = image.width;
        const height = image.height;
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d')?.drawImage(image, 0, 0);
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            throw new Error('No blob');
          }
        });
      };
      image.src = url;
    } catch (e: any) {
      reject(e.message);
    }
  });
};

export const blobToDataURL = (blob: Blob): Promise<string> => {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (_e) => resolve(reader.result as string);
    reader.onerror = (_e) => reject(reader.error);
    reader.onabort = (_e) => reject(new Error('Read aborted'));
    reader.readAsDataURL(blob);
  });
};

export const fileGetBase64 = (file: File) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
  });
};

export const imageFromUrl = (src: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = (error) => reject(error);
    image.src = src;
  });
};

export const dataURLSetFormat = (data: string, to: ImageExtention): string => {
  const from: ImageExtention = to === 'jpg' ? 'png' : 'jpg';
  return data.replaceAll(`image/${from}`, `image/${to}`);
};

export const handleFilename = (filename: string) =>
  filename.replace(/[^a-z0-9]/gi, '_').toLowerCase();

export const localSave = async (image: IEditorImage) => {
  try {
    const blob = await fetch(image.url as string).then((res) => res.blob());
    const title = handleFilename(image.dbData?.title as any) + '.jpg';

    saveAs(blob, title);
    return true;
  } catch (e) {
    errorHandler(e);
    return false;
  }
};
