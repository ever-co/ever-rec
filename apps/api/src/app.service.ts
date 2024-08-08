import { Injectable } from '@nestjs/common';
import * as fs from 'fs';

@Injectable()
export class AppService {
  async getHello(): Promise<string> {
    // let res = '[';

    // const prom = new Promise(resolve => {
    //   fs.readdir(__dirname + '/../public/images/emoji', (err, files) => {
    //     let txt = '';
    //     files.forEach( file => {
    //         txt += `'${file}', `;
    //     });
    //     resolve(txt);
    //   });
    // });

    // res += await prom;
    // res +=   ']';
    return 'Hello world';
  }
}
