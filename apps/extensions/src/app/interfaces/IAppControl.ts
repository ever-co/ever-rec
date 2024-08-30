export default interface IAppControl {
  value: string;
  errors: string[];
  touched: boolean;
}

export interface IAppControlData {
  value: string;
  errors?: string[] | undefined;
}
