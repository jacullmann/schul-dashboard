declare module '@otplib/preset-v11' {
  interface AuthenticatorOptions {
    step?: number;
    window?: number;
  }

  interface Authenticator {
    options: AuthenticatorOptions;
    generateSecret(): string;
    check(token: string, secret: string): boolean;
    keyuri(accountName: string, issuer: string, secret: string): string;
  }

  export const authenticator: Authenticator;
}
