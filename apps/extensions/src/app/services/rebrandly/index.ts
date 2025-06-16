import axios from 'axios';
import {} from '../helpers/errors';

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
    // changed from `errorHandler(e)` to `console.log(e)` because errorHandler is used as hook now
    // also this getShortenerLink is not used anywhere so we don't need to use this.
    console.log(e);
  }
};
