import axios, { AxiosInstance } from 'axios';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GoogleApis {
  private api: AxiosInstance;

  constructor(private readonly configService: ConfigService) {
    this.api = axios.create({
      baseURL: 'https://securetoken.googleapis.com',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
  }

  async refreshToken(token: string) {
    const data = new URLSearchParams();
    data.append('grant_type', 'refresh_token');
    data.append('refresh_token', token);

    return this.api.post('/v1/token', data, {
      params: {
        key: this.configService.get<string>('FIREBASE_API_KEY'),
      },
    });
  }
}
