// Define allowed media types
export enum GauzyUploadType {
  PHOTO = 'camshots',
  IMAGE = 'screenshots',
  AUDIO = 'soundshots',
  VIDEO = 'videos',
}

// Base metadata common to all uploads
export interface IUploadBase {
  tenantId: string;
  organizationId: string;
  recordedAt: Date | string; // use Date for better handling, but allow string for serialization
  pathname?: string;         // optional, since not all uploads use it
  timeSlotId?: string;
  size?: number;             // generic for files with measurable size
  duration?: number;         // generic for time-based media
  file: Express.Multer.File;
}

// Video-specific metadata
export interface IUploadVideo extends IUploadBase {
  title: string;
  description?: string;
  resolution?: `${number}x${number}`; // e.g., "1920x1080"
  codec?: string;                     // e.g., "H.264", "VP9"
  frameRate?: number;                 // FPS
}

// Camshot-specific metadata
export interface IUploadCamShot extends IUploadBase {
  pathname: string;
  timeSlotId: string;
}

// Soundshot-specific metadata
export interface IUploadSoundShot extends IUploadBase {
  rate: number;       // Hz, e.g., 44100
  channels: number;   // 1 = mono, 2 = stereo
  name: string;
  pathname: string;
  timeSlotId: string;
}

// Screenshot-specific metadata
export interface IUploadScreenshot extends IUploadBase {
  pathname: string;
  timeSlotId: string;
}
