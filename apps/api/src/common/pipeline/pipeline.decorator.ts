import { SetMetadata } from '@nestjs/common';
import { PipelineType } from './types';

export const PIPELINE_HANDLER_METADATA = 'PIPELINE_HANDLER_METADATA';

export interface PipelineHandlerMetadata {
  /** Which pipeline (UPLOAD, TRANSFORM, NOTIFY…), see types.ts */
  pipelineType: PipelineType;
  /** The “provider” or “key” under which you want your result stored */
  provider: string;
  /** Ordering within the chain (lower = earlier) */
  order?: number;
}

/**
 * Decorator you put on every handler class.
 */
export const PipelineHandler = (
  meta: PipelineHandlerMetadata,
): ClassDecorator => SetMetadata(PIPELINE_HANDLER_METADATA, meta);
