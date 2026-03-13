import {
  uniqueNamesGenerator,
  adjectives,
  colors,
  animals,
  Config,
} from 'unique-names-generator';

export function generateUserName(userId: string, groupId: string): string {
  const combined = userId + groupId;
  let seed = 0;
  for (let i = 0; i < combined.length; i++) {
    seed = ((seed << 5) - seed + combined.charCodeAt(i)) | 0;
  }

  const config: Config = {
    dictionaries: [colors, adjectives, animals],
    separator: '',
    seed: Math.abs(seed),
    style: 'capital',
  };

  return uniqueNamesGenerator(config);
}
