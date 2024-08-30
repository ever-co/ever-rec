import {
  Controller,
  Get,
  Param,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { WorkspacePublicService } from '../../services/public/public.service';
import { ValidateId } from '../../pipes/validate-id.pipe';

@Controller('workspace')
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class WorkspacePublicController {
  constructor(private readonly publicService: WorkspacePublicService) {
    // left blank intentionally
  }

  @Get('/invite/:workspaceInviteId')
  async getWorkspaceInviteData(
    @Param('workspaceInviteId', ValidateId) workspaceInviteId: string
  ) {
    return this.publicService.getWorkspaceInviteData(workspaceInviteId);
  }
}
