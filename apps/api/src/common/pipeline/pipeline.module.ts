import { Module, Global } from '@nestjs/common';
import { DiscoveryModule, Reflector } from '@nestjs/core';
import { PipelineExplorer } from './pipeline.explorer';
import { HandlerFactory } from './factory';
import { PipelineService } from './pipeline.service';

@Global()
@Module({
  imports: [DiscoveryModule],
  providers: [Reflector, PipelineExplorer, HandlerFactory, PipelineService],
  exports: [PipelineService],
})
export class PipelineModule {}
