import { Buffer } from 'node:buffer';
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
  type AuthenticationResponseJSON,
  type RegistrationResponseJSON,
  type WebAuthnCredential,
} from '@simplewebauthn/server';
import {
  decodeAttestationObject,
  decodeClientDataJSON,
  isoBase64URL,
} from '@simplewebauthn/server/helpers';
import { isLocale } from '../../i18n/locale';
import { normalizeEmail } from './credential';
import { hex, randomHex, sha256, uuidV7 } from './crypto';
import { setupComplete, verifySetupProof } from './setup';

export const passkeyCookie = '__Host-linkrovia_passkey';
export const passkeyMaxAge = 300;

const algorithms = [-7, -257]; // ES256 and RS256

// An account with this marker cannot authenticate with a password. Existing
// scrypt records retain their format and verification behavior.
const passwordDisabled = 'webauthn-passkey-only-v1';

interface PasskeyRp {
  id: string;
  origin: string;
}

export function passkeyRp(
  url: URL,
  { development = false }: { development?: boolean } = {},
): PasskeyRp | null {
  const { hostname, protocol, origin } = url;
  if (development && hostname === 'localhost' && protocol === 'http:') {
    return { id: hostname, origin };
  }
  if (
    protocol !== 'https:' ||
    hostname.length > 253 ||
    /^(?:\d+\.){3}\d+$/.test(hostname) ||
    !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/.test(
      hostname,
    )
  ) {
    return null;
  }
  return { id: hostname, origin };
}

interface OwnerIdentity {
  id: string;
  email: string;
  locale: string;
  proofHash: string;
}

interface ChallengeRow {
  challenge: string;
  owner_id: string | null;
  owner_email: string | null;
  owner_locale: string | null;
}

interface PasskeyCredentialRow {
  public_key: string;
  sign_count: number;
  user_id: string;
}

async function fingerprint(value: string) {
  return hex(await sha256(value));
}

async function issueChallenge(
  db: D1Database,
  rp: PasskeyRp,
  challenge: string,
  owner?: OwnerIdentity,
): Promise<string> {
  const token = randomHex(32);
  await db.batch([
    db.prepare(
      `DELETE FROM passkey_challenges WHERE token_hash IN (
        SELECT token_hash FROM passkey_challenges
        WHERE expires_at <= unixepoch()
        ORDER BY expires_at LIMIT 24
      )`,
    ),
    db
      .prepare(
        `INSERT INTO passkey_challenges
          (token_hash, challenge, flow, rp_id, origin, proof_hash,
           owner_id, owner_email, owner_locale, expires_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, unixepoch() + ?)`,
      )
      .bind(
        await fingerprint(token),
        challenge,
        owner ? 'owner' : 'login',
        rp.id,
        rp.origin,
        owner?.proofHash ?? null,
        owner?.id ?? null,
        owner?.email ?? null,
        owner?.locale ?? null,
        passkeyMaxAge,
      ),
  ]);
  return token;
}

async function consumeChallenge(
  db: D1Database,
  rp: PasskeyRp,
  token: unknown,
  setupProof?: string,
): Promise<ChallengeRow | null> {
  if (
    typeof token !== 'string' ||
    token.length !== 64 ||
    !/^[0-9a-f]{64}$/.test(token)
  ) {
    return null;
  }
  return db
    .prepare(
      `DELETE FROM passkey_challenges
       WHERE token_hash = ? AND flow = ? AND rp_id = ? AND origin = ?
         AND proof_hash IS ? AND expires_at > unixepoch()
       RETURNING challenge, owner_id, owner_email, owner_locale`,
    )
    .bind(
      await fingerprint(token),
      setupProof === undefined ? 'login' : 'owner',
      rp.id,
      rp.origin,
      setupProof === undefined ? null : await fingerprint(setupProof),
    )
    .first<ChallengeRow>();
}

function isBase64url(value: unknown, limit: number): value is string {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    value.length <= limit &&
    /^[a-zA-Z0-9_-]+$/.test(value)
  );
}

function basicResponse(value: unknown): value is {
  id: string;
  rawId: string;
  type: 'public-key';
  response: Record<string, unknown>;
} {
  return (
    value !== null &&
    typeof value === 'object' &&
    'type' in value &&
    value.type === 'public-key' &&
    'id' in value &&
    isBase64url(value.id, 1400) &&
    'rawId' in value &&
    value.rawId === value.id &&
    'response' in value &&
    value.response !== null &&
    typeof value.response === 'object'
  );
}

function parseRegistration(value: unknown): RegistrationResponseJSON | null {
  if (!basicResponse(value)) return null;
  const { attestationObject, clientDataJSON } = value.response;
  if (
    !isBase64url(attestationObject, 8192) ||
    !isBase64url(clientDataJSON, 2048)
  ) {
    return null;
  }
  return {
    id: value.id,
    rawId: value.rawId,
    type: value.type,
    response: { attestationObject, clientDataJSON },
    clientExtensionResults: {},
  };
}

function parseAuthentication(
  value: unknown,
): AuthenticationResponseJSON | null {
  if (!basicResponse(value)) return null;
  const { authenticatorData, clientDataJSON, signature, userHandle } =
    value.response;
  if (
    !isBase64url(authenticatorData, 4096) ||
    !isBase64url(clientDataJSON, 2048) ||
    !isBase64url(signature, 1024) ||
    !isBase64url(userHandle, 86)
  ) {
    return null;
  }
  return {
    id: value.id,
    rawId: value.rawId,
    type: value.type,
    response: { authenticatorData, clientDataJSON, signature, userHandle },
    clientExtensionResults: {},
  };
}

type SetupAuthorization = {
  setupProof: unknown;
  setupSecret: string | undefined;
};

export async function beginOwnerPasskey(
  db: D1Database,
  {
    rp,
    email: rawEmail,
    locale,
    setupProof,
    setupSecret,
  }: SetupAuthorization & {
    rp: PasskeyRp;
    email: unknown;
    locale: string;
  },
) {
  const email = normalizeEmail(rawEmail);
  if (
    !email ||
    typeof setupProof !== 'string' ||
    !(await verifySetupProof(setupProof, setupSecret)) ||
    (await setupComplete(db))
  ) {
    return null;
  }

  const owner = {
    id: uuidV7(),
    email,
    locale: isLocale(locale) ? locale : 'en',
    proofHash: await fingerprint(setupProof),
  };
  const options = await generateRegistrationOptions({
    rpName: 'Linkrovia',
    rpID: rp.id,
    userName: owner.email,
    userID: new TextEncoder().encode(owner.id),
    timeout: passkeyMaxAge * 1000,
    attestationType: 'none',
    authenticatorSelection: {
      residentKey: 'required',
      userVerification: 'required',
    },
    supportedAlgorithmIDs: algorithms,
  });
  return {
    options,
    ceremonyToken: await issueChallenge(db, rp, options.challenge, owner),
  };
}

export async function finishOwnerPasskey(
  db: D1Database,
  {
    rp,
    ceremonyToken,
    setupProof,
    setupSecret,
    response,
  }: SetupAuthorization & {
    rp: PasskeyRp;
    ceremonyToken: unknown;
    response: unknown;
  },
): Promise<{ userId: string } | null> {
  if (
    typeof setupProof !== 'string' ||
    !(await verifySetupProof(setupProof, setupSecret))
  ) {
    return null;
  }
  const stored = await consumeChallenge(db, rp, ceremonyToken, setupProof);
  const registration = parseRegistration(response);
  if (
    !stored?.owner_id ||
    !stored.owner_email ||
    !stored.owner_locale ||
    !registration
  ) {
    return null;
  }

  let credential: WebAuthnCredential;
  try {
    const client = decodeClientDataJSON(registration.response.clientDataJSON);
    if (
      (client.crossOrigin !== undefined && client.crossOrigin !== false) ||
      client.topOrigin !== undefined
    )
      return null;
    // The platform must return no attestation. Reject other formats before
    // invoking verification routines for a particular authenticator vendor.
    if (
      decodeAttestationObject(
        isoBase64URL.toBuffer(registration.response.attestationObject),
      ).get('fmt') !== 'none'
    )
      return null;
    const result = await verifyRegistrationResponse({
      response: registration,
      expectedChallenge: stored.challenge,
      expectedOrigin: rp.origin,
      expectedRPID: rp.id,
      requireUserPresence: true,
      requireUserVerification: true,
      supportedAlgorithmIDs: algorithms,
    });
    if (!result.verified || !result.registrationInfo.userVerified) return null;
    credential = result.registrationInfo.credential;
    if (credential.id !== registration.id) return null;
  } catch {
    return null;
  }

  const [, completion] = await db.batch([
    db
      .prepare(
        `INSERT INTO users (id, email, password_hash, role, locale)
         SELECT ?, ?, ?, 'owner', ? FROM setup_state
         WHERE singleton = 1 AND completed_at IS NULL
           AND owner_user_id IS NULL AND token_consumed_at IS NULL`,
      )
      .bind(
        stored.owner_id,
        stored.owner_email,
        passwordDisabled,
        stored.owner_locale,
      ),
    db
      .prepare(
        `UPDATE setup_state
         SET completed_at = unixepoch(), owner_user_id = ?, token_consumed_at = unixepoch()
         WHERE singleton = 1 AND completed_at IS NULL
           AND owner_user_id IS NULL AND token_consumed_at IS NULL
           AND EXISTS (SELECT 1 FROM users WHERE id = ? AND role = 'owner')`,
      )
      .bind(stored.owner_id, stored.owner_id),
    db
      .prepare(
        `INSERT INTO passkey_credentials
           (credential_id, user_id, rp_id, origin, public_key, sign_count)
         SELECT ?, owner_user_id, ?, ?, ?, ? FROM setup_state
         WHERE singleton = 1 AND owner_user_id = ?`,
      )
      .bind(
        credential.id,
        rp.id,
        rp.origin,
        Buffer.from(credential.publicKey).toString('base64url'),
        credential.counter,
        stored.owner_id,
      ),
    db
      .prepare(
        `INSERT INTO domains
           (id, hostname, is_primary, provider_mode, connection_status, verified_at)
         SELECT ?, ?, 1, 'unconfigured', 'active', unixepoch()
         FROM setup_state
         WHERE singleton = 1 AND owner_user_id = ?
           AND NOT EXISTS (SELECT 1 FROM domains WHERE is_primary = 1)
         ON CONFLICT(hostname) DO UPDATE SET is_primary = 1, updated_at = unixepoch()`,
      )
      .bind(uuidV7(), rp.id, stored.owner_id),
  ]);
  return completion.meta.changes === 1 ? { userId: stored.owner_id } : null;
}

export async function beginPasskeySignIn(db: D1Database, rp: PasskeyRp) {
  const options = await generateAuthenticationOptions({
    rpID: rp.id,
    timeout: passkeyMaxAge * 1000,
    userVerification: 'required',
  });
  return {
    options,
    ceremonyToken: await issueChallenge(db, rp, options.challenge),
  };
}

export async function finishPasskeySignIn(
  db: D1Database,
  {
    rp,
    ceremonyToken,
    response,
  }: { rp: PasskeyRp; ceremonyToken: unknown; response: unknown },
): Promise<string | null> {
  const stored = await consumeChallenge(db, rp, ceremonyToken);
  const authentication = parseAuthentication(response);
  if (!stored || !authentication) return null;
  const credential = await db
    .prepare(
      `SELECT public_key, sign_count, user_id
       FROM passkey_credentials JOIN users ON users.id = passkey_credentials.user_id
       WHERE credential_id = ? AND origin = ? AND rp_id = ? AND users.disabled_at IS NULL`,
    )
    .bind(authentication.id, rp.origin, rp.id)
    .first<PasskeyCredentialRow>();
  if (
    !credential ||
    authentication.response.userHandle !==
      Buffer.from(credential.user_id, 'utf8').toString('base64url')
  ) {
    return null;
  }

  let counter: number;
  try {
    const result = await verifyAuthenticationResponse({
      response: authentication,
      expectedChallenge: stored.challenge,
      expectedOrigin: rp.origin,
      expectedRPID: rp.id,
      requireUserVerification: true,
      credential: {
        id: authentication.id,
        publicKey: new Uint8Array(
          Buffer.from(credential.public_key, 'base64url'),
        ),
        counter: credential.sign_count,
      },
    });
    if (!result.verified || !result.authenticationInfo.userVerified)
      return null;
    counter = result.authenticationInfo.newCounter;
  } catch {
    return null;
  }

  const { meta } = await db
    .prepare(
      `UPDATE passkey_credentials SET sign_count = ?
       WHERE credential_id = ? AND sign_count = ? AND origin = ? AND rp_id = ?
         AND EXISTS (SELECT 1 FROM users WHERE id = user_id AND disabled_at IS NULL)`,
    )
    .bind(counter, authentication.id, credential.sign_count, rp.origin, rp.id)
    .run();
  return meta.changes === 1 ? credential.user_id : null;
}

export async function getSignInMethods(
  db: D1Database,
  rp?: PasskeyRp | null,
): Promise<{ passwordAvailable: boolean; passkeyAvailable: boolean }> {
  const methods = await db
    .prepare(
      `SELECT
        EXISTS (
          SELECT 1 FROM users
          WHERE disabled_at IS NULL AND length(password_hash) = 117
            AND password_hash GLOB 'scrypt-v1$32768$8$3$*'
        ) AS passwords,
        EXISTS (
          SELECT 1 FROM passkey_credentials JOIN users ON users.id = passkey_credentials.user_id
          WHERE users.disabled_at IS NULL AND ? = 1
            AND (? IS NULL OR (rp_id = ? AND origin = ?))
        ) AS passkeys`,
    )
    .bind(
      rp === null ? 0 : 1,
      rp?.id ?? null,
      rp?.id ?? null,
      rp?.origin ?? null,
    )
    .first<{ passwords: number; passkeys: number }>();
  return {
    passwordAvailable: methods?.passwords === 1,
    passkeyAvailable: methods?.passkeys === 1,
  };
}

type PasskeyRequest =
  | { step: 'begin'; email?: unknown; turnstileToken?: unknown }
  | { step: 'finish'; response: unknown };

export async function readPasskeyRequest(
  request: Request,
): Promise<PasskeyRequest | null> {
  const type = request.headers
    .get('content-type')
    ?.split(';')[0]
    ?.trim()
    .toLowerCase();
  if (type !== 'application/json' || !request.body) return null;

  const reader = request.body.getReader();
  const decoder = new TextDecoder('utf-8', { fatal: true });
  let bytes = 0;
  let body = '';

  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > 16_384) {
        await reader.cancel();
        return null;
      }
      body += decoder.decode(value, { stream: true });
    }
    const payload: unknown = JSON.parse(body + decoder.decode());
    if (!payload || typeof payload !== 'object' || !('step' in payload))
      return null;
    if (payload.step === 'begin') {
      return {
        step: 'begin',
        email: 'email' in payload ? payload.email : undefined,
        turnstileToken:
          'turnstileToken' in payload ? payload.turnstileToken : undefined,
      };
    }
    if (payload.step === 'finish' && 'response' in payload) {
      return { step: 'finish', response: payload.response };
    }
    return null;
  } catch {
    return null;
  } finally {
    reader.releaseLock();
  }
}

export const passkeyCookieOptions = {
  path: '/',
  secure: true,
  httpOnly: true,
  sameSite: 'strict',
} as const;
