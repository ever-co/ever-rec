export type ImageExtention = 'png' | 'jpg';

export default interface IPreferences { 
    imageExt: ImageExtention;
    showSharedGDriveLink: boolean;
    defaultSave: boolean;
    defaultSavePath: string;
    addInfoOnTop: boolean;
}