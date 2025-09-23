import { Injectable, OnModuleInit } from '@nestjs/common';
import { DiscoveryService, Reflector } from '@nestjs/core';
import { HandlerFactory } from './factory';
import {
  PIPELINE_HANDLER_METADATA,
  PipelineHandlerMetadata,
} from './pipeline.decorator';
import { AbstractHandler } from './abstract.handler';

@Injectable()
export class PipelineExplorer implements OnModuleInit {
  constructor(
    private readonly discovery: DiscoveryService,
    private readonly reflector: Reflector,
    private readonly handlerFactory: HandlerFactory,
  ) {}

  onModuleInit() {
    const providers = this.discovery.getProviders();
    for (const wrapper of providers) {
      const { instance, metatype } = wrapper;
      if (!instance || !metatype) continue;

      const meta = this.reflector.get<PipelineHandlerMetadata>(
        PIPELINE_HANDLER_METADATA,
        metatype,
      );
      if (!meta) continue;

      // stamp metadata onto the handler instance
      (instance as AbstractHandler<any, any>).pipelineType = meta.pipelineType;
      (instance as AbstractHandler<any, any>).providerId = meta.provider;
      (instance as AbstractHandler<any, any>).order = meta.order ?? 0;

      this.handlerFactory.register(instance);
    }
  }
}
