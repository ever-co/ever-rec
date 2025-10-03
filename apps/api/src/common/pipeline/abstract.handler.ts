import { Logger } from '@nestjs/common';
import { IHandler, IRequestCtx } from './handler.interface';
import { PipelineType } from './types';

export abstract class AbstractHandler<TCtx, TResult>
  implements IHandler<TCtx, TResult>
{
  private readonly logger = new Logger(AbstractHandler.name);
  /** Populated by the explorer from @PipelineHandler metadata */
  public pipelineType!: PipelineType;
  public providerId!: string;
  public order!: number;

  private next?: AbstractHandler<TCtx, TResult>;

  /** Link to next in chain */
  public setNext(handler: AbstractHandler<TCtx, TResult>) {
    this.next = handler;
    return handler;
  }

  /** Template Method: orchestrates canHandle→process→chain */
  public async handle(
    req: IRequestCtx<TCtx>,
    storage: Map<string, TResult>,
  ): Promise<void> {
    if (await this.canHandle(req.context)) {
      this.logger.log(`Executing ${this.pipelineType} → ${this.providerId}`);

      const out = await this.process(req.context);
      storage.set(this.providerId, out);

      this.logger.log(`Done for ${this.providerId}`);
    }
    if (this.next) {
      await this.next.handle(req, storage);
    }
  }

  public abstract canHandle(ctx: TCtx): Promise<boolean>;
  public abstract process(ctx: TCtx): Promise<TResult>;
}
