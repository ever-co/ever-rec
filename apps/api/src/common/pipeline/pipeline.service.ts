// src/common/pipeline/pipeline.service.ts
import { Injectable } from '@nestjs/common';
import { HandlerFactory } from './factory';
import { IRequestCtx } from './handler.interface';
import { PipelineType } from './types';

@Injectable()
export class PipelineService {
  constructor(private readonly factory: HandlerFactory) {}

  /**
   * Run the chain for pipelineType/providerId.
   * Returns the TResult produced by that provider—or undefined.
   */
  public async execute<TCtx, TResult>(
    pipelineType: PipelineType,
    providerId: string,
    req: IRequestCtx<TCtx>,
  ): Promise<TResult | undefined> {
    const chain = this.factory.getChainFor<TCtx, TResult>(pipelineType);
    const storage = new Map<string, TResult>();
    await chain.handle(req, storage);
    return storage.get(providerId);
  }
}
