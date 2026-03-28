const AVATAR_COLORS = [
  '#AA47BD',
  '#7B1FA2',
  '#77919D',
  '#455A65',
  '#EC417A',
  '#C1175C',
  '#0388D2',
  '#0098A7',
  '#004D40',
  '#EF6C00',
  '#F6511E',
];

function getColorIndexFromEmail(email: string): number {
  if (!email || email.length === 0) return 0;
  const charToHash = email.length >= 2 ? email.charAt(1) : email.charAt(0);
  if (!charToHash) return 0;
  const charCode = charToHash.charCodeAt(0);
  return charCode % AVATAR_COLORS.length;
}

/**
 * Returns a letter and background color derived from an email address.
 *
 * @param email - The email address to generate data from.
 * @returns An object containing `letter` and `color`.
 */
export function getAvatarData(email: string) {
  const letter =
    email && email.length > 0 ? email.charAt(0).toUpperCase() : '?';
  const color = AVATAR_COLORS[getColorIndexFromEmail(email)] || '#777';

  return { letter, color };
}
