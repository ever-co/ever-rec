import { Controller, Delete, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/guards/auth.guard';
import { AdminService } from './admin.service';

@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @UseGuards(AuthGuard)
  @Delete('delete-all-folders')
  async deleteAllFolders(@Req() request) {
    const uid = request.user?.id;
    const email = request.user?.email;
    return this.adminService.deleteAllFolders(uid, email);
  }
}
