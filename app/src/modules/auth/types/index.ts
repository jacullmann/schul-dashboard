import type {
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
} from '@simplewebauthn/browser';

export interface MfaSetupResponse {
  ok: boolean;
  qrCode: string;
  secret: string;
  expiresAt: string;
}

export interface MfaStatusResponse {
  ok: boolean;
  mfaEnabled: boolean;
}

export interface MfaChallengeResponse {
  expiresIn: number;
}

export interface MfaVerifyResult {
  ok: boolean;
  csrfToken?: string;
  error?: string;
}

export interface MfaActionResult {
  ok: boolean;
  error?: string;
}

export interface LoginResult {
  ok: boolean;
  csrfToken?: string | null;
  error?: string;
}

export interface ChangePasswordErrors {
  current?: string;
  new?: string;
  confirm?: string;
}

export interface SetPasswordErrors {
  code?: string;
  new?: string;
  confirm?: string;
}

export interface ForgotPasswordErrors {
  email?: string;
  code?: string;
  password?: string;
  confirm?: string;
}

export interface Passkey {
  id: string;
  name: string;
  createdAt: string;
  lastUsedAt: string | null;
  /** Base64url, as the browser reports it. */
  credentialId: string;
}

export interface PasskeyListResponse {
  passkeys: Passkey[];
  rpId: string;
  /** The user handle every passkey of the account carries, base64url. */
  userHandle: string;
}

export interface PasskeyRegistrationResponse {
  options: PublicKeyCredentialCreationOptionsJSON;
}

export interface PasskeyChallengeResponse {
  challengeId: string;
  options: PublicKeyCredentialRequestOptionsJSON;
}
