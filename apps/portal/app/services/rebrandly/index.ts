import axios from 'axios';
import { errorHandler } from '../helpers/errors';

const api = axios.create({
  baseURL: 'https://api.rebrandly.com',
  headers: {
    'Content-Type': 'application/json',
    apikey: process.env.REBRANDLY_API_KEY || '',
  },
});

export const getShortenerLink = async (
  url: string,
): Promise<string | undefined> => {
  const linkRequest = {
    destination: url,
    domain: { fullName: 'rebrand.ly' },
  };
  try {
    const res = await api.post('/v1/links', JSON.stringify(linkRequest));
    return res.data?.shortUrl;
  } catch (e: any) {
    errorHandler(e);
  }
};
