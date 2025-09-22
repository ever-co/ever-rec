import { AuthProviderId } from 'src/module/auth/interfaces/auth.interface';
import {
  IImagePayload,
  IImageUploader,
  IRequestImageUploader,
} from '../view.models/image.model';
import IEditorImage from 'src/interfaces/IEditorImage';

/**
 * Base abstract class for implementing a chain-of-responsibility image uploader.
 * Each uploader decides if it can handle the request, otherwise passes it along the chain.
 */
export abstract class ImageUploader implements IImageUploader {
  protected readonly providerId: AuthProviderId;
  private nextHandler: IImageUploader | null = null;

  constructor(providerId: AuthProviderId) {
    this.providerId = providerId;
  }

  /**
   * Defines the next handler in the chain.
   * Returns the provided handler for fluent chaining.
   */
  public setNext(next: IImageUploader): IImageUploader {
    this.nextHandler = next;
    return next;
  }

  /**
   * Attempts to handle the upload request.
   * If this handler cannot, it delegates to the next handler in the chain.
   */
  public async handle(
    request: IRequestImageUploader,
    result: Map<AuthProviderId, IEditorImage>,
  ): Promise<void> {
    if (await this.canHandle(request.token)) {
      const proceed = await this.process(request.image);
      result.set(this.providerId, proceed);
    }

    if (this.nextHandler) {
      await this.nextHandler.handle(request, result);
    }
  }

  /**
   * Determines whether this uploader can handle the request.
   * Must be implemented by concrete uploaders.
   */
  protected abstract canHandle(token: string): Promise<boolean>;

  /**
   * Performs the actual upload process.
   * Must be implemented by concrete uploaders.
   */
  protected abstract process(request: IImagePayload): Promise<IEditorImage>;
}
