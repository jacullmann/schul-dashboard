// --- Auth Module Types ---

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