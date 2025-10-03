import { Injectable } from '@nestjs/common';
import { AbstractHandler } from './abstract.handler';
import { PipelineType } from './types';

@Injectable()
export class HandlerFactory {
  private readonly registry = new Map<
    PipelineType,
    AbstractHandler<any, any>[]
  >();

  /** Called by the explorer to register every decorated handler */
  public register(handler: AbstractHandler<any, any>) {
    const key = handler.pipelineType;
    let list = this.registry.get(key) || [];
    list.push(handler);
    // sort by order ascending (lower order → run earlier)
    list.sort((a, b) => a.order - b.order);
    this.registry.set(key, list);
  }

  /** Build the chain (first handler) for a given pipeline */
  public getChainFor<TCtx, TResult>(
    pipelineType: PipelineType,
  ): AbstractHandler<TCtx, TResult> {
    let list = this.registry.get(pipelineType) || [];
    if (!list.length) {
      throw new Error(`No handlers registered for pipeline ${pipelineType}`);
    }
    for (let i = 0; i < list.length - 1; i++) {
      list[i].setNext(list[i + 1]);
    }
    return list[0] as AbstractHandler<TCtx, TResult>;
  }
}
