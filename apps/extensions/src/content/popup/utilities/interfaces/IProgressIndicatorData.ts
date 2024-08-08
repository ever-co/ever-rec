export enum ProgressTypeEnum {
  FLC = 'Full Page Capture',
  GIF = 'GIF Animation',
}

export interface IProgressIndicatorData {
  value: number;
  maxValue: number;
  progressType: ProgressTypeEnum;
}
