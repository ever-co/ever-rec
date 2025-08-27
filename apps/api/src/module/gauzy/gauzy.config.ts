import { registerAs } from '@nestjs/config';

export default registerAs('gauzy', () => ({
  apiUrl: process.env.GAUZY_API_URL ?? 'http://localhost:3001/api',
}));
