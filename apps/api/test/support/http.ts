/** A small HTTP client for the test suites (Jest's Node environment has no global `fetch`). */
import * as http from 'node:http';

export interface HttpAnswer {
  status: number;
  body: string;
  json(): any;
}

export function httpRequest(
  method: string,
  url: string,
  options: { headers?: Record<string, string>; body?: string | Buffer } = {},
): Promise<HttpAnswer> {
  return new Promise((resolve, reject) => {
    const request = http.request(
      url,
      { method, headers: options.headers, agent: false },
      (response) => {
        const chunks: Buffer[] = [];
        response.on('data', (chunk) => chunks.push(chunk));
        response.on('end', () => {
          const body = Buffer.concat(chunks).toString('utf8');
          resolve({
            status: response.statusCode ?? 0,
            body,
            json: () => JSON.parse(body),
          });
        });
      },
    );
    request.on('error', reject);
    request.end(options.body);
  });
}
