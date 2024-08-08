export type WatermarkPosition =
  | 'Top Left'
  | 'Top Right'
  | 'Bottom Left'
  | 'Bottom Right'
  | 'Center'
  | 'Top Center'
  | 'Bottom Center'
  | 'Left Center'
  | 'Right Center';

export interface IWatermarkOptions {
  imageBase64?: string;
  imageposition: WatermarkPosition;
  textposition: WatermarkPosition;
  size: number;
  fontsize: number;
  imageopacity: number;
  textopacity: number;
  rotation: number;
  text: string;
}
