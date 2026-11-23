import { createHash, generateKeyPairSync, sign } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { isoCBOR } from '@simplewebauthn/server/helpers';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { getPlatformProxy } from 'wrangler';
import {
  beginInvitedPasskey,
  beginOwnerPasskey,
  beginPasskeySignIn,
  finishInvitedPasskey,
  finishOwnerPasskey,
  finishPasskeySignIn,
  getSignInMethods,
  passkeyRp,
  readPasskeyRequest,
} from '../../src/lib/server/auth/passkeys';
import {
  createAdminInvite,
  disableAdmin,
  listAdminAccess,
  revokeAdminInvite,
} from '../../src/lib/server/auth/admin-invites';
import {
  authorizeApiKey,
  createApiKey,
} from '../../src/lib/server/auth/api-keys';
import {
  authenticate,
  createSession,
  getSession,
} from '../../src/lib/server/auth/session';
import { createSetupProof } from '../../src/lib/server/auth/setup';

let platform: Awaited<ReturnType<typeof getPlatformProxy<{ DB: D1Database }>>>;
let db: D1Database;
const origin = 'https://admin.example.com';
const rp = { id: 'admin.example.com', origin };
const setupSecret = 'test-secret-for-local-passkey-setup-only';

beforeAll(async () => {
  platform = await getPlatformProxy<{ DB: D1Database }>({
    configPath: 'wrangler.local.jsonc',
    persist: false,
  });
  db = platform.env.DB;
  for (const migration of [
    '0001_initial.sql',
    '0002_domain_connections.sql',
    '0003_passkeys.sql',
    '0005_user_theme.sql',
    '0011_admin_invites.sql',
  ]) {
    const sql = await readFile(
      new URL('../../migrations/' + migration, import.meta.url),
      'utf8',
    );
    await db.batch(
      sql
        .replace(/--.*$/gm, '')
        .split(';')
        .map((part) => part.trim())
        .filter(Boolean)
        .map((statement) => db.prepare(statement)),
    );
  }
}, 15_000);

afterAll(async () => {
  await platform?.dispose();
});

function clientData(type: string, challenge: string, clientOrigin = origin) {
  return Buffer.from(JSON.stringify({ type, challenge, origin: clientOrigin }));
}

function testAuthenticator(id: string) {
  const { publicKey, privateKey } = generateKeyPairSync('ec', {
    namedCurve: 'prime256v1',
  });
  const key = publicKey.export({ format: 'jwk' });
  const rpHash = createHash('sha256').update(rp.id).digest();
  const identifier = Buffer.from(id);
  const encodedId = identifier.toString('base64url');
  const credentialKey = isoCBOR.encode(
    new Map<number, number | Uint8Array>([
      [1, 2],
      [3, -7],
      [-1, 1],
      [-2, Buffer.from(key.x!, 'base64url')],
      [-3, Buffer.from(key.y!, 'base64url')],
    ]),
  );

  return {
    register(challenge: string) {
      const length = Buffer.alloc(2);
      length.writeUInt16BE(identifier.length);
      const authData = Buffer.concat([
        rpHash,
        Buffer.of(0x45),
        Buffer.alloc(4 + 16),
        length,
        identifier,
        credentialKey,
      ]);
      const attestation = isoCBOR.encode(
        new Map<string, string | Uint8Array | Map<never, never>>([
          ['fmt', 'none'],
          ['authData', authData],
          ['attStmt', new Map<never, never>()],
        ]),
      );
      return {
        id: encodedId,
        rawId: encodedId,
        type: 'public-key',
        response: {
          clientDataJSON: clientData('webauthn.create', challenge).toString(
            'base64url',
          ),
          attestationObject: Buffer.from(attestation).toString('base64url'),
        },
      };
    },
    authenticate(
      challenge: string,
      userHandle: string,
      counter: number,
      clientOrigin = origin,
    ) {
      const data = clientData('webauthn.get', challenge, clientOrigin);
      const count = Buffer.alloc(4);
      count.writeUInt32BE(counter);
      const authData = Buffer.concat([rpHash, Buffer.of(0x05), count]);
      const challengeHash = createHash('sha256').update(data).digest();
      return {
        id: encodedId,
        rawId: encodedId,
        type: 'public-key',
        response: {
          clientDataJSON: data.toString('base64url'),
          authenticatorData: authData.toString('base64url'),
          signature: sign(
            'sha256',
            Buffer.concat([authData, challengeHash]),
            privateKey,
          ).toString('base64url'),
          userHandle,
        },
      };
    },
  };
}

it('requires HTTPS for a deployment RP and supports a localhost development RP', () => {
  expect(passkeyRp(new URL(origin + '/login'))).toEqual(rp);
  expect(passkeyRp(new URL('http://admin.example.com'))).toBeNull();
  expect(
    passkeyRp(new URL('http://127.0.0.1:4173'), { development: true }),
  ).toBeNull();
  expect(
    passkeyRp(new URL('http://localhost:4173'), { development: true }),
  ).toEqual({
    id: 'localhost',
    origin: 'http://localhost:4173',
  });
});

it('accepts bounded JSON ceremony requests', async () => {
  const post = (body: string, contentType = 'application/json') =>
    new Request(origin + '/login/passkey', {
      method: 'POST',
      body,
      headers: { 'content-type': contentType },
    });
  await expect(
    readPasskeyRequest(post('{"step":"begin","turnstileToken":"token"}')),
  ).resolves.toMatchObject({ step: 'begin', turnstileToken: 'token' });
  await expect(
    readPasskeyRequest(post('{"step":"finish"}')),
  ).resolves.toBeNull();
  await expect(
    readPasskeyRequest(post('{"step":"begin"}', 'text/plain')),
  ).resolves.toBeNull();
  await expect(
    readPasskeyRequest(
      post(JSON.stringify({ step: 'finish', response: 'x'.repeat(16_384) })),
    ),
  ).resolves.toBeNull();
});

it('checks setup proof binding, commits one owner, and enforces one-use signed authentication', async () => {
  const setupProof = await createSetupProof(setupSecret);
  const ownerInput = {
    rp,
    email: 'owner@example.com',
    locale: 'ja',
    setupProof,
    setupSecret,
  };
  await expect(
    beginOwnerPasskey(db, { ...ownerInput, setupProof: 'invalid' }),
  ).resolves.toBeNull();

  const attempts = await Promise.all(
    Array.from({ length: 4 }, async (_, index) => {
      const start = await beginOwnerPasskey(db, ownerInput);
      if (!start) throw new Error('Registration challenge unavailable');
      expect(start.options.authenticatorSelection?.userVerification).toBe(
        'required',
      );
      const authenticator = testAuthenticator('credential-' + index);
      const input = {
        rp,
        setupProof,
        setupSecret,
        ceremonyToken: start.ceremonyToken,
        response: authenticator.register(start.options.challenge),
      };
      return { start, input, authenticator };
    }),
  );
  const alternateProof = await createSetupProof(setupSecret);
  await expect(
    finishOwnerPasskey(db, {
      ...attempts[0].input,
      setupProof: alternateProof,
    }),
  ).resolves.toBeNull();

  const registered = await Promise.all(
    attempts.map(({ input }) => finishOwnerPasskey(db, input)),
  );
  expect(registered.filter(Boolean)).toHaveLength(1);
  const index = registered.findIndex(Boolean);
  const owner = registered[index]!;
  const { authenticator, start } = attempts[index];
  expect(await getSignInMethods(db, rp)).toEqual({
    passkeyAvailable: true,
    passwordAvailable: false,
  });
  expect(
    await getSignInMethods(db, { ...rp, origin: origin + ':8443' }),
  ).toEqual({
    passkeyAvailable: false,
    passwordAvailable: false,
  });
  expect(await db.prepare('SELECT count(*) AS n FROM users').first('n')).toBe(
    1,
  );
  expect(
    await db
      .prepare('SELECT hostname FROM domains WHERE is_primary = 1')
      .first('hostname'),
  ).toBe(rp.id);

  async function issueAssertion(counter: number, responseOrigin = origin) {
    const login = await beginPasskeySignIn(db, rp);
    expect(login.options.userVerification).toBe('required');
    return {
      rp,
      ceremonyToken: login.ceremonyToken,
      response: authenticator.authenticate(
        login.options.challenge,
        start.options.user.id,
        counter,
        responseOrigin,
      ),
    };
  }
  await expect(finishPasskeySignIn(db, await issueAssertion(0))).resolves.toBe(
    owner.userId,
  );
  const assertion = await issueAssertion(1);
  const results = await Promise.all(
    Array.from({ length: 10 }, () => finishPasskeySignIn(db, assertion)),
  );
  expect(results.filter(Boolean)).toEqual([owner.userId]);
  await expect(
    finishPasskeySignIn(db, await issueAssertion(1)),
  ).resolves.toBeNull();
  await expect(
    finishPasskeySignIn(
      db,
      await issueAssertion(2, 'https://other.example.com'),
    ),
  ).resolves.toBeNull();
  const expired = await issueAssertion(2);
  await db
    .prepare('UPDATE passkey_challenges SET expires_at = unixepoch()')
    .run();
  await expect(finishPasskeySignIn(db, expired)).resolves.toBeNull();
  const disabled = await issueAssertion(2);
  await db.prepare('UPDATE users SET disabled_at = unixepoch()').run();
  await expect(finishPasskeySignIn(db, disabled)).resolves.toBeNull();
  expect((await getSignInMethods(db, rp)).passkeyAvailable).toBe(false);
});

it('keeps supported password accounts usable alongside passkeys', async () => {
  const passwordHash =
    'scrypt-v1$32768$8$3$0123456789abcdef0123456789abcdef$a11766ca64368a43003cf3756bcc80c0f2a2314792c7af29e4cbd60e5bd0b8ea';
  await db
    .prepare(
      `INSERT INTO users (id, email, password_hash, role)
       VALUES ('legacy', 'legacy@example.com', ?, 'admin')`,
    )
    .bind(passwordHash)
    .run();
  expect(await getSignInMethods(db, null)).toEqual({
    passkeyAvailable: false,
    passwordAvailable: true,
  });
  await expect(
    authenticate(db, 'legacy@example.com', ' longer秘密 password 🌔 '),
  ).resolves.toBe('legacy');
});

it('redeems an invitation for the recorded email exactly once under concurrent registration', async () => {
  const owner = await db
    .prepare(
      "UPDATE users SET disabled_at = NULL WHERE role = 'owner' RETURNING id",
    )
    .first<string>('id');
  if (!owner) throw new Error('Owner unavailable');
  const invitations = await Promise.all(
    Array.from({ length: 3 }, () =>
      createAdminInvite(db, owner, 'invitee@example.com'),
    ),
  );
  const codes = invitations.filter((code) => code !== null);
  expect(codes).toHaveLength(1);
  const [code] = codes;
  const inputs = await Promise.all(
    Array.from({ length: 3 }, async (_, index) => {
      const started = await beginInvitedPasskey(db, { rp, code, locale: 'fr' });
      if (!started) throw new Error('Invitation challenge unavailable');
      expect(started.options.user.name).toBe('invitee@example.com');
      return {
        rp,
        code,
        ceremonyToken: started.ceremonyToken,
        response: testAuthenticator('invited-' + index).register(
          started.options.challenge,
        ),
      };
    }),
  );
  await expect(
    finishInvitedPasskey(db, {
      ...inputs[0],
      rp: { ...rp, origin: origin + ':8443' },
    }),
  ).resolves.toBeNull();
  await expect(
    finishInvitedPasskey(db, { ...inputs[0], code: 'a'.repeat(64) }),
  ).resolves.toBeNull();
  const results = await Promise.all(
    inputs.map((input) => finishInvitedPasskey(db, input)),
  );
  const users = results.filter((id) => id !== null);
  expect(users).toHaveLength(1);
  const [admin] = users;
  await expect(
    finishInvitedPasskey(db, inputs[results.indexOf(admin)]),
  ).resolves.toBeNull();
  expect(
    await db
      .prepare('SELECT email, role, locale FROM users WHERE id = ?')
      .bind(admin)
      .first(),
  ).toEqual({
    email: 'invitee@example.com',
    role: 'admin',
    locale: 'fr',
  });
  expect(
    await db
      .prepare('SELECT count(*) n FROM passkey_credentials WHERE user_id = ?')
      .bind(admin)
      .first('n'),
  ).toBe(1);
  await expect(
    beginInvitedPasskey(db, { rp, code, locale: 'fr' }),
  ).resolves.toBeNull();
  await expect(
    createAdminInvite(db, admin, 'another@example.com'),
  ).resolves.toBeNull();

  const [ownerToken, adminToken] = await Promise.all([
    createSession(db, owner),
    createSession(db, admin),
  ]);
  const key = await createApiKey(db, admin, {
    name: 'Invited key',
    scopes: ['links:read'],
  });
  if (!key) throw new Error('API key unavailable');
  const authorization = 'Bearer ' + key.token;
  await expect(
    authorizeApiKey(db, authorization, 'links:read'),
  ).resolves.toMatchObject({ userId: admin });
  await disableAdmin(db, owner, owner);
  await disableAdmin(db, admin, admin);
  await expect(getSession(db, adminToken)).resolves.toMatchObject({
    user: { id: admin },
  });
  await expect(getSession(db, ownerToken)).resolves.toMatchObject({
    user: { id: owner },
  });
  await disableAdmin(db, owner, admin);
  await expect(getSession(db, adminToken)).resolves.toBeNull();
  await expect(
    authorizeApiKey(db, authorization, 'links:read'),
  ).resolves.toBeNull();
  expect(
    await db
      .prepare('SELECT revoked_at FROM sessions WHERE user_id = ?')
      .bind(admin)
      .first('revoked_at'),
  ).toBeGreaterThan(0);
  expect(
    await db
      .prepare('SELECT revoked_at FROM api_keys WHERE id = ?')
      .bind(key.id)
      .first('revoked_at'),
  ).toBeGreaterThan(0);
});

it('rejects a revoked or expired invitation even after its passkey challenge was issued', async () => {
  const owner = await db
    .prepare("SELECT id FROM users WHERE role = 'owner'")
    .first<string>('id');
  if (!owner) throw new Error('Owner unavailable');
  for (const state of ['revoked', 'expired']) {
    const email = state + '@example.com';
    const code = await createAdminInvite(db, owner, email);
    const start = await beginInvitedPasskey(db, { rp, code, locale: 'en' });
    const { invitations } = await listAdminAccess(db);
    const invitation = invitations.find(
      (candidate) => candidate.email === email,
    );
    if (!start || !invitation) throw new Error('Invitation unavailable');
    if (state === 'revoked') {
      await revokeAdminInvite(db, owner, invitation.id);
    } else {
      await db
        .prepare(
          'UPDATE admin_invites SET expires_at = unixepoch() WHERE id = ?',
        )
        .bind(invitation.id)
        .run();
    }
    await expect(
      finishInvitedPasskey(db, {
        rp,
        code,
        ceremonyToken: start.ceremonyToken,
        response: testAuthenticator(state).register(start.options.challenge),
      }),
    ).resolves.toBeNull();
    await expect(
      beginInvitedPasskey(db, { rp, code, locale: 'en' }),
    ).resolves.toBeNull();
    expect(await createAdminInvite(db, owner, email)).toMatch(/^[a-f0-9]{64}$/);
  }
});
