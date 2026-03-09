import type { Request, Response, NextFunction } from 'express';
export declare function sendJSONError(res: Response, status: number, msg: string, errors?: unknown[]): void;
export declare function validate(req: Request, res: Response, next: NextFunction): void;
export declare function isValidCloudinaryUrl(url: unknown): boolean;
export declare function validateItemCreation(req: Request, res: Response, next: NextFunction): void;
//# sourceMappingURL=validation.d.ts.map