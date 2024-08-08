export interface LoggerEventModel {
  timestamp: number;
  ip?: string;
  userId?: string;
  message?: string;
  payload?: any;
}
