import { Controller, Get, Param, Post, Redirect, Req, UseGuards } from '@nestjs/common';
import { MessagesService } from './messages.service';
import { AuthGuard } from '../auth/guards/auth.guard';

@Controller('messages')
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) { }

  @UseGuards(AuthGuard)
  @Post('send-whats-app-message')
  async sendWhatsAppMessage(@Req() req) {
    return this.messagesService.sendWhatsAppMessage(req);
  }
}
