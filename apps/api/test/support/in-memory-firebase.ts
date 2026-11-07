/**
 * Test doubles for the parts of the Firebase Admin SDK and the Identity Toolkit REST API that the
 * auth and Ever ID code paths use. They keep everything in memory, so the suites run without the
 * Firebase emulators and without reaching any outside service.
 */
import { randomBytes } from 'node:crypto';

type Json = any;

function clone<T>(value: T): T {
  return value === undefined ? value : JSON.parse(JSON.stringify(value));
}

function splitPath(path: string | undefined): string[] {
  return (path ?? '').split('/').filter(Boolean);
}

/** A data snapshot with the methods the code under test calls. */
export class FakeSnapshot {
  constructor(
    readonly key: string | null,
    private readonly value: Json,
  ) {}

  exists(): boolean {
    return this.value !== null && this.value !== undefined;
  }

  val(): Json {
    return this.value === undefined ? null : clone(this.value);
  }

  child(path: string): FakeSnapshot {
    let node = this.value;
    for (const part of splitPath(path)) {
      node = node && typeof node === 'object' ? node[part] : undefined;
    }
    return new FakeSnapshot(splitPath(path).pop() ?? null, node ?? null);
  }

  forEach(callback: (child: FakeSnapshot) => boolean | void): boolean {
    const entries: Array<[string, Json]> =
      this.value && typeof this.value === 'object'
        ? (this.value.__ordered ?? Object.entries(this.value))
        : [];
    for (const [key, value] of entries) {
      if (callback(new FakeSnapshot(key, value)) === true) {
        return true;
      }
    }
    return false;
  }
}

interface QuerySpec {
  orderByChild?: string;
  equalTo?: Json;
  endAt?: Json;
  limitToFirst?: number;
  orderByKey?: boolean;
  startAfter?: string;
}

/** A query over the children of a location. */
export class FakeQuery {
  constructor(
    protected readonly db: InMemoryDatabase,
    protected readonly parts: string[],
    protected readonly spec: QuerySpec = {},
  ) {}

  orderByChild(child: string): FakeQuery {
    return new FakeQuery(this.db, this.parts, {
      ...this.spec,
      orderByChild: child,
    });
  }

  equalTo(value: Json): FakeQuery {
    return new FakeQuery(this.db, this.parts, { ...this.spec, equalTo: value });
  }

  endAt(value: Json): FakeQuery {
    return new FakeQuery(this.db, this.parts, { ...this.spec, endAt: value });
  }

  limitToFirst(limit: number): FakeQuery {
    return new FakeQuery(this.db, this.parts, {
      ...this.spec,
      limitToFirst: limit,
    });
  }

  orderByKey(): FakeQuery {
    return new FakeQuery(this.db, this.parts, { ...this.spec, orderByKey: true });
  }

  startAfter(key: string): FakeQuery {
    return new FakeQuery(this.db, this.parts, { ...this.spec, startAfter: key });
  }

  async once(_event = 'value'): Promise<FakeSnapshot> {
    return this.snapshot();
  }

  async get(): Promise<FakeSnapshot> {
    return this.snapshot();
  }

  protected snapshot(): FakeSnapshot {
    const value = this.db.read(this.parts);
    if (this.spec.orderByKey && value && typeof value === 'object') {
      let entries = Object.entries(value as Record<string, Json>).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
      if (this.spec.startAfter !== undefined) {
        entries = entries.filter(([key]) => key > this.spec.startAfter);
      }
      if (this.spec.limitToFirst !== undefined) {
        entries = entries.slice(0, this.spec.limitToFirst);
      }
      return new FakeSnapshot(this.parts[this.parts.length - 1] ?? null, entries.length ? Object.fromEntries(entries) : null);
    }
    if (!this.spec.orderByChild || !value || typeof value !== 'object') {
      return new FakeSnapshot(this.parts[this.parts.length - 1] ?? null, value);
    }
    const field = this.spec.orderByChild;
    let entries = Object.entries(value as Record<string, Json>).filter(
      ([, child]) => {
        const v = child?.[field];
        if (this.spec.equalTo !== undefined && v !== this.spec.equalTo)
          return false;
        if (
          this.spec.endAt !== undefined &&
          !(v !== undefined && v !== null && v <= this.spec.endAt)
        )
          return false;
        return true;
      },
    );
    entries.sort(([, a], [, b]) =>
      a?.[field] > b?.[field] ? 1 : a?.[field] < b?.[field] ? -1 : 0,
    );
    if (this.spec.limitToFirst !== undefined) {
      entries = entries.slice(0, this.spec.limitToFirst);
    }
    if (!entries.length) {
      return new FakeSnapshot(this.parts[this.parts.length - 1] ?? null, null);
    }
    const result: Json = Object.fromEntries(entries);
    Object.defineProperty(result, '__ordered', {
      value: entries,
      enumerable: false,
    });
    return new FakeSnapshot(this.parts[this.parts.length - 1] ?? null, result);
  }
}

/** A location in the database. */
export class FakeReference extends FakeQuery {
  get key(): string | null {
    return this.parts[this.parts.length - 1] ?? null;
  }

  child(path: string): FakeReference {
    return new FakeReference(this.db, [...this.parts, ...splitPath(path)]);
  }

  async set(value: Json): Promise<void> {
    this.db.write(this.parts, clone(value));
  }

  async update(values: Record<string, Json>): Promise<void> {
    for (const [path, value] of Object.entries(values)) {
      this.db.write([...this.parts, ...splitPath(path)], clone(value));
    }
  }

  async remove(): Promise<void> {
    this.db.write(this.parts, null);
  }

  push(value?: Json): FakeReference & Promise<FakeReference> {
    const key = this.db.pushId();
    // Like the SDK's ThenableReference: a reference that is also a promise of a plain reference.
    const plain = this.child(key);
    const promise =
      value === undefined
        ? Promise.resolve(plain)
        : plain.set(value).then(() => plain);
    const thenable = this.child(key);
    return Object.assign(thenable, {
      then: promise.then.bind(promise),
      catch: promise.catch.bind(promise),
    }) as never;
  }

  async transaction(
    update: (current: Json) => Json,
  ): Promise<{ committed: boolean; snapshot: FakeSnapshot }> {
    // Mirrors the SDK: the first attempt sees the locally cached value (often null), the retry
    // sees the stored value.
    const stored = this.db.read(this.parts);
    if (stored !== null && stored !== undefined) {
      update(null);
    }
    const next = update(clone(stored ?? null));
    if (next === undefined) {
      return {
        committed: false,
        snapshot: new FakeSnapshot(this.key, stored ?? null),
      };
    }
    this.db.write(this.parts, clone(next));
    return { committed: true, snapshot: new FakeSnapshot(this.key, next) };
  }
}

/** The Realtime Database. */
export class InMemoryDatabase {
  private data: Json = {};
  private counter = 0;

  ref(path?: string): FakeReference {
    return new FakeReference(this, splitPath(path));
  }

  pushId(): string {
    this.counter += 1;
    return `-push${String(this.counter).padStart(6, '0')}`;
  }

  read(parts: string[]): Json {
    let node = this.data;
    for (const part of parts) {
      if (!node || typeof node !== 'object') return null;
      node = node[part];
    }
    return node === undefined ? null : clone(node);
  }

  write(parts: string[], value: Json): void {
    if (!parts.length) {
      this.data = value ?? {};
      return;
    }
    let node = this.data;
    for (const part of parts.slice(0, -1)) {
      if (!node[part] || typeof node[part] !== 'object') node[part] = {};
      node = node[part];
    }
    const last = parts[parts.length - 1];
    if (value === null || value === undefined) {
      delete node[last];
    } else {
      node[last] = value;
    }
    this.prune(this.data);
  }

  /** The whole tree, for assertions. */
  dump(path?: string): Json {
    return this.read(splitPath(path));
  }

  private prune(node: Json): boolean {
    if (!node || typeof node !== 'object')
      return node === null || node === undefined;
    for (const key of Object.keys(node)) {
      if (this.prune(node[key])) delete node[key];
    }
    return Object.keys(node).length === 0 && node !== this.data;
  }
}

export interface FakeUser {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  emailVerified: boolean;
  password?: string;
  providers: string[];
  customClaims?: Record<string, unknown>;
  lastSignInTime: string | null;
  tokensValidAfter?: number;
}

function authError(code: string, message: string): Error {
  return Object.assign(new Error(message), { code });
}

/** Firebase Authentication (Admin SDK surface). */
export class InMemoryAuth {
  readonly users = new Map<string, FakeUser>();
  readonly revoked: string[] = [];
  private counter = 0;

  addUser(user: Partial<FakeUser> & { email: string }): FakeUser {
    this.counter += 1;
    const record: FakeUser = {
      uid: user.uid ?? `uid-${String(this.counter).padStart(4, '0')}`,
      email: user.email.toLowerCase(),
      displayName: user.displayName,
      photoURL: user.photoURL,
      emailVerified: user.emailVerified ?? false,
      password: user.password,
      providers: user.providers ?? (user.password ? ['password'] : []),
      lastSignInTime: user.lastSignInTime ?? null,
    };
    this.users.set(record.uid, record);
    return record;
  }

  private toRecord(user: FakeUser) {
    return {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
      emailVerified: user.emailVerified,
      customClaims: user.customClaims,
      providerData: user.providers.map((providerId) => ({
        providerId,
        uid: user.email,
        email: user.email,
      })),
      metadata: {
        creationTime: 'Thu, 01 Jan 2026 00:00:00 GMT',
        lastSignInTime: user.lastSignInTime,
      },
    };
  }

  async createUser(request: Partial<FakeUser> & { email: string }) {
    if (this.findByEmail(request.email)) {
      throw authError(
        'auth/email-already-exists',
        'The email address is already in use by another account.',
      );
    }
    return this.toRecord(this.addUser(request));
  }

  async getUser(uid: string) {
    const user = this.users.get(uid);
    if (!user)
      throw authError(
        'auth/user-not-found',
        'There is no user record corresponding to this identifier.',
      );
    return this.toRecord(user);
  }

  async getUserByEmail(email: string) {
    const user = this.findByEmail(email);
    if (!user)
      throw authError(
        'auth/user-not-found',
        'There is no user record corresponding to this identifier.',
      );
    return this.toRecord(user);
  }

  async updateUser(uid: string, update: Partial<FakeUser>) {
    const user = this.users.get(uid);
    if (!user) throw authError('auth/user-not-found', 'no user');
    Object.assign(user, update);
    return this.toRecord(user);
  }

  async deleteUser(uid: string) {
    this.users.delete(uid);
  }

  async setCustomUserClaims(uid: string, claims: Record<string, unknown>) {
    const user = this.users.get(uid);
    if (user) user.customClaims = claims;
  }

  async createCustomToken(uid: string) {
    return `custom.${uid}.${randomBytes(4).toString('hex')}`;
  }

  async verifyIdToken(token: string) {
    const match = /^fid\.([^.]+)\.[a-f0-9]+$/.exec(token ?? '');
    const user = match ? this.users.get(match[1]) : undefined;
    if (!user)
      throw authError(
        'auth/argument-error',
        'Decoding Firebase ID token failed.',
      );
    return {
      uid: user.uid,
      email: user.email,
      email_verified: user.emailVerified,
      name: user.displayName,
    };
  }

  async revokeRefreshTokens(uid: string) {
    this.revoked.push(uid);
    const user = this.users.get(uid);
    if (user) user.tokensValidAfter = Date.now();
  }

  async listUsers(maxResults = 1000, pageToken?: string) {
    const all = [...this.users.values()].sort((a, b) => (a.uid < b.uid ? -1 : 1));
    const start = pageToken ? Number(pageToken) : 0;
    const page = all.slice(start, start + maxResults);
    const next = start + maxResults < all.length ? String(start + maxResults) : undefined;
    return { users: page.map((user) => this.toRecord(user)), pageToken: next };
  }

  findByEmail(email: string): FakeUser | undefined {
    const wanted = (email ?? '').toLowerCase();
    return [...this.users.values()].find((user) => user.email === wanted);
  }
}

/** One stored object of the in-memory bucket. */
export class FakeStorageFile {
  constructor(
    private readonly bucket: InMemoryBucket,
    readonly name: string,
  ) {}

  get metadata() {
    const bytes = this.bucket.objects.get(this.name);
    return bytes ? { name: this.name, size: String(bytes.length) } : undefined;
  }

  async save(data: Buffer | string): Promise<void> {
    this.bucket.objects.set(this.name, Buffer.from(data));
  }

  async getMetadata() {
    const metadata = this.metadata;
    if (!metadata) throw Object.assign(new Error('No such object'), { code: 404 });
    return [metadata];
  }

  async delete(): Promise<void> {
    this.bucket.objects.delete(this.name);
  }
}

/** A Cloud Storage bucket, enough for the counters and the recount. */
export class InMemoryBucket {
  readonly objects = new Map<string, Buffer>();

  file(name: string): FakeStorageFile {
    return new FakeStorageFile(this, name);
  }

  async getFiles(query: { maxResults?: number; pageToken?: string } = {}) {
    const names = [...this.objects.keys()].sort();
    const start = query.pageToken ? Number(query.pageToken) : 0;
    const max = query.maxResults ?? 1000;
    const files = names.slice(start, start + max).map((name) => this.file(name));
    const next = start + max < names.length ? { pageToken: String(start + max) } : null;
    return [files, next];
  }
}

/** The `admin.app.App` the `FIREBASE_ADMIN` token provides. */
export class InMemoryFirebaseApp {
  readonly authService = new InMemoryAuth();
  readonly db = new InMemoryDatabase();
  readonly bucket = new InMemoryBucket();
  readonly acceptances: Json[] = [];

  storage() {
    return { bucket: () => this.bucket };
  }

  auth() {
    return this.authService;
  }

  database() {
    return this.db;
  }

  /** Enough of Firestore for the terms-acceptance recorder. */
  firestore() {
    const acceptances = this.acceptances;
    const collection = (name: string): Json => ({
      doc: (id: string) => ({
        id,
        create: async (data: Json) =>
          acceptances.push({ collection: name, id, data }),
        set: async (data: Json) =>
          acceptances.push({ collection: name, id, data }),
        get: async () => ({ exists: false, data: () => undefined }),
        collection,
      }),
      where: () => collection(name),
      orderBy: () => collection(name),
      limit: () => collection(name),
      get: async () => ({ docs: [], empty: true, size: 0 }),
    });
    return { collection };
  }
}

interface RestSession {
  uid: string;
  refreshToken: string;
}

/** The axios-style error `nestjs-http-promise` rejects with. */
function restError(status: number, message: string): Error {
  return Object.assign(new Error(`Request failed with status code ${status}`), {
    response: { status, data: { error: { code: status, message } } },
  });
}

/**
 * The Identity Toolkit REST calls `FirebaseRestService.post` makes. Installed by replacing `post`
 * on a `FirebaseRestService` instance, so every helper method of the real service goes through it.
 */
export class InMemoryIdentityToolkit {
  readonly calls: Array<{ path: string; body: Json }> = [];
  private readonly refreshTokens = new Map<string, RestSession>();
  private counter = 0;

  constructor(private readonly auth: InMemoryAuth) {}

  /** A Google ID token the fake accepts in `accounts:signInWithIdp`. */
  googleIdToken(email: string, name = 'Google Person'): string {
    return `google.${Buffer.from(JSON.stringify({ email, name })).toString('base64url')}`;
  }

  async post(path: string, body: Json): Promise<{ data: Json }> {
    this.calls.push({ path, body: clone(body) });
    switch (path) {
      case 'accounts:signInWithCustomToken': {
        const match = /^custom\.([^.]+)\./.exec(body?.token ?? '');
        const user = match ? this.auth.users.get(match[1]) : undefined;
        if (!user) throw restError(400, 'INVALID_CUSTOM_TOKEN');
        return {
          data: {
            kind: 'identitytoolkit#VerifyCustomTokenResponse',
            ...this.issue(user.uid),
            isNewUser: false,
          },
        };
      }
      case 'accounts:signInWithPassword': {
        const user = this.auth.findByEmail(body?.email);
        if (!user || !user.password || user.password !== body?.password)
          throw restError(400, 'INVALID_LOGIN_CREDENTIALS');
        user.lastSignInTime = 'Thu, 01 Jan 2026 00:00:00 GMT';
        return {
          data: {
            kind: 'identitytoolkit#VerifyPasswordResponse',
            localId: user.uid,
            email: user.email,
            displayName: user.displayName ?? '',
            registered: true,
            ...this.issue(user.uid),
          },
        };
      }
      case 'accounts:createAuthUri': {
        const user = this.auth.findByEmail(body?.identifier);
        return {
          data: {
            kind: 'identitytoolkit#CreateAuthUriResponse',
            registered: !!user,
            signinMethods: user ? user.providers : [],
            sessionId: 'session',
          },
        };
      }
      case 'accounts:signUp': {
        if (this.auth.findByEmail(body?.email))
          throw restError(400, 'EMAIL_EXISTS');
        const user = this.auth.addUser({
          email: body.email,
          password: body.password,
        });
        return {
          data: {
            kind: 'identitytoolkit#SignupNewUserResponse',
            localId: user.uid,
            email: user.email,
            ...this.issue(user.uid),
          },
        };
      }
      case 'accounts:signInWithIdp': {
        const encoded = /id_token=google\.([^&]+)/.exec(
          body?.postBody ?? '',
        )?.[1];
        if (!encoded) throw restError(400, 'INVALID_IDP_RESPONSE');
        const { email, name } = JSON.parse(
          Buffer.from(encoded, 'base64url').toString('utf8'),
        );
        let user = this.auth.findByEmail(email);
        if (!user)
          user = this.auth.addUser({
            email,
            displayName: name,
            emailVerified: true,
            providers: ['google.com'],
          });
        return {
          data: {
            kind: 'identitytoolkit#VerifyAssertionResponse',
            federatedId: `https://accounts.google.com/${email}`,
            providerId: 'google.com',
            localId: user.uid,
            email: user.email,
            emailVerified: true,
            displayName: user.displayName ?? name,
            photoUrl: null,
            ...this.issue(user.uid),
          },
        };
      }
      case 'token': {
        const session = this.refreshTokens.get(body?.refresh_token);
        const user = session ? this.auth.users.get(session.uid) : undefined;
        if (!session || !user || (user.tokensValidAfter ?? 0) > 0)
          throw restError(400, 'INVALID_REFRESH_TOKEN');
        const issued = this.issue(user.uid, session.refreshToken);
        return {
          data: {
            id_token: issued.idToken,
            refresh_token: issued.refreshToken,
            expires_in: '3600',
            token_type: 'Bearer',
            user_id: user.uid,
          },
        };
      }
      default:
        throw restError(400, `UNSUPPORTED_IN_TEST:${path}`);
    }
  }

  private issue(uid: string, keepRefreshToken?: string) {
    this.counter += 1;
    const n = this.counter.toString(16).padStart(6, '0');
    const refreshToken = keepRefreshToken ?? `frt.${uid}.${n}`;
    this.refreshTokens.set(refreshToken, { uid, refreshToken });
    return { idToken: `fid.${uid}.${n}`, refreshToken, expiresIn: '3600' };
  }
}
