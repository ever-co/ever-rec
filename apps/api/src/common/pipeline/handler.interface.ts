/**
 * Wrap whatever context you need (token, DTO, metadata…).
 */
export interface IRequestCtx<TCtx> {
  context: TCtx;
}

/** Handlers implement canHandle/process on that context. */
export interface IHandler<TCtx, TResult> {
  canHandle(ctx: TCtx): Promise<boolean>;
  process(ctx: TCtx): Promise<TResult>;
}
