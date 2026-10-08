/**
 * Asks the user to confirm who they are when the API requires a recent sign-in.
 * The API client only knows that a confirmation is needed; the dialog that
 * collects it registers itself here, so the client stays free of UI.
 */
type ReauthHandler = () => Promise<boolean>;

let handler: ReauthHandler | null = null;

export function setReauthHandler(next: ReauthHandler | null): void {
  handler = next;
}

/** Resolves `true` once the user confirmed, `false` if they cancelled. */
export function requestReauth(): Promise<boolean> {
  return handler ? handler() : Promise.resolve(false);
}
