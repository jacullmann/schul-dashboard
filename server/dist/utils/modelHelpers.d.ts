import type { ItemImage, ImageWithThumb, TimeColor } from '../types/index.js';
export declare function buildThumbUrl(secureUrl: string): string;
export declare function generateCloudinaryUrl(publicId: string, version?: unknown, format?: string, isThumb?: boolean): string;
export declare function withThumb(img: ItemImage): ImageWithThumb;
export declare function timeLeftColor(dueDate: string): TimeColor;
//# sourceMappingURL=modelHelpers.d.ts.map