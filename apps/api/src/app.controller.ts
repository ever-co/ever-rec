import { Controller, Get, Render } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('hello')
  async getHello(): Promise<string> {
    return await this.appService.getHello();
  }

  @Get('404')
  @Render('404')
  async notFound() {
    return;
  }
}
