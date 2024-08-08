import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { AuthGuard } from '../../auth/guards/auth.guard';
import { WhiteboardService } from '../services/whiteboards.service';
import {
  CreateWhiteboardValidator,
  UpdateWhiteboardValidator,
} from '../validators/validator.whiteboard';

@Controller('whiteboards')
export class WhiteboardController {
  constructor(private readonly whiteboardService: WhiteboardService) {}

  @UseGuards(AuthGuard)
  @Post('new')
  @UsePipes(ValidationPipe)
  async createNewWhiteboard(
    @Req() req,
    @Query() query: CreateWhiteboardValidator,
  ) {
    return this.whiteboardService.createNewWhiteboard(
      req.user?.id,
      req.user.name,
      req.user.email,
      query.name,
    );
  }

  @UseGuards(AuthGuard)
  @Get('all')
  async getUserWhiteboards(@Req() req) {
    return this.whiteboardService.getUserWhiteboards(req.user?.id);
  }

  @UseGuards(AuthGuard)
  @Delete(':whiteboardId/delete')
  async deleteWhiteboard(@Req() req, @Param() param) {
    return this.whiteboardService.deleteWhiteboard(
      req.user?.id,
      param.whiteboardId,
    );
  }

  @UseGuards(AuthGuard)
  @Put(':whiteboardId/update')
  @UsePipes(ValidationPipe)
  async updateWhiteboardData(
    @Req() req,
    @Param() param,
    @Body() body: UpdateWhiteboardValidator,
  ) {
    return await this.whiteboardService.updateWhiteboardData(
      req.user?.id,
      param.whiteboardId,
      body.trash,
      body.favorite,
      body.isPublic,
      body.name,
    );
  }

  @UseGuards(AuthGuard)
  @Get(':whiteboardId/get')
  async getWhiteboardById(@Req() req, @Param() param) {
    return await this.whiteboardService.getWhiteboardById(
      req.user?.id,
      param.whiteboardId,
    );
  }

  @Get(':whiteboardId/get-shared')
  async getWhiteboardByIdShared(@Param() param) {
    return await this.whiteboardService.getWhiteboardByIdShared(
      param.whiteboardId,
    );
  }
}
