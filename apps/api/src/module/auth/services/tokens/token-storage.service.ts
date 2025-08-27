import { Injectable, NotFoundException } from "@nestjs/common";
import * as admin from "firebase-admin";
import { FirebaseAdminService } from "../../../firebase/services/firebase-admin.service";

export interface IToken {
  id: string;
  token: string;
  createdAt: number;
  updatedAt: number;
}

@Injectable()
export class TokenStorageService {
  private readonly PATH = "tokens";
  private readonly db: admin.database.Database;

  constructor(private readonly firebaseAdminService: FirebaseAdminService) {
    this.db = this.firebaseAdminService.getDatabase();
  }

  /**
   * Save a new token in the database
   */
  public async save(token: string): Promise<IToken> {
    const ref = this.db.ref(this.PATH).push();
    const entity: IToken = {
      id: ref.key!,
      token,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await ref.set(entity);
    return entity;
  }

  /**
   * Update an existing token by ID
   */
  public async update(id: string, token: string): Promise<IToken> {
    const ref = this.db.ref(`${this.PATH}/${id}`);
    const snapshot = await ref.once("value");

    if (!snapshot.exists()) {
      throw new NotFoundException(`Token with ID ${id} not found`);
    }

    const existing = snapshot.val() as IToken;
    const updated: IToken = {
      ...existing,
      token,
      updatedAt: Date.now(),
    };

    await ref.update(updated);
    return updated;
  }

  /**
   * Find a token by its value
   */
  public async findByToken(token: string): Promise<IToken | null> {
    const snapshot = await this.db
      .ref(this.PATH)
      .orderByChild("token")
      .equalTo(token)
      .once("value");

    if (!snapshot.exists()) {
      return null;
    }

    const result = snapshot.val();
    const [id, entity] = Object.entries(result)[0];
    return { id, ...(entity as Omit<IToken, "id">) };
  }

  /**
   * Find a token by its ID
   */
  public async findById(id: string): Promise<IToken | null> {
    const snapshot = await this.db.ref(`${this.PATH}/${id}`).once("value");

    if (!snapshot.exists()) {
      return null;
    }

    return snapshot.val() as IToken;
  }

  /**
 * Delete (revoke) a token by its ID
 */
  public async delete(id: string): Promise<boolean> {
    const ref = this.db.ref(`${this.PATH}/${id}`);
    const snapshot = await ref.once("value");

    if (!snapshot.exists()) {
      return false; // Token already revoked or does not exist
    }

    await ref.remove();
    return true;
  }
}
