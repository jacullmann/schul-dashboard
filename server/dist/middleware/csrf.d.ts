import type { Request, Response, NextFunction } from 'express';
export declare function generateCsrfToken(): string;
export declare function validateCsrf(): (req: Request, res: Response, next: NextFunction) => void;
export declare function setCsrfCookie(res: Response, token: string): void;
export declare function clearCsrfCookie(res: Response): void;
export declare function rotateCsrfToken(res: Response): string;
//# sourceMappingURL=csrf.d.ts.map