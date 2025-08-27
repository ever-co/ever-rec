import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from 'nestjs-http-promise';


@Injectable()
export class GauzyRestService {
  private readonly apiUrl: string;
  private readonly logger = new Logger(GauzyRestService.name);

  constructor(
    private readonly httpService: HttpService,
    configService: ConfigService,
  ) {
    this.apiUrl = configService.get<string>('gauzy.apiUrl');
  }

  private url(path: string) {
    return `${this.apiUrl}/${path}`;
  }

  public async post<U = any, T = any>(
    path: string,
    data: U,
    config?: any
  ): Promise<{ data: T }> {
    try {
      return this.httpService.post<T>(this.url(path), data, config);
    } catch (error) {
      this.logger.error(
        `Gauzy REST API error: ${error.message}`,
        error.stack,
      );

      throw error;
    }
  }

  public async put<U = any, T = any>(
    path: string,
    data: U,
    config?: any
  ): Promise<{ data: T }> {
    try {
      return this.httpService.put<T>(this.url(path), data, config);
    } catch (error) {
      this.logger.error(
        `Gauzy REST API error: ${error.message}`,
        error.stack,
      );

      throw error;
    }
  }

  public async get<T = any>(path: string, config?: any): Promise<{ data: T }> {
    try {
      return this.httpService.get<T>(this.url(path), config);
    } catch (error) {
      this.logger.error(
        `Gauzy REST API error: ${error.message}`,
        error.stack,
      );

      throw error;
    }
  }

  public async delete<T = any>(path: string, config?: any): Promise<{ data: T }> {
    try {
      return this.httpService.delete<T>(this.url(path), config);
    } catch (error) {
      this.logger.error(
        `Gauzy REST API error: ${error.message}`,
        error.stack,
      );

      throw error;
    }
  }

  public async patch<U = any, T = any>(
    path: string,
    data: U,
    config?: any
  ): Promise<{ data: T }> {
    try {
      return this.httpService.patch<T>(this.url(path), data, config);
    } catch (error) {
      this.logger.error(
        `Gauzy REST API error: ${error.message}`,
        error.stack,
      );

      throw error;
    }
  }
}
