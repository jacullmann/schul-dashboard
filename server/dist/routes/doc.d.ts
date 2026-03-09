import { Router } from 'express';
import type { Server as SocketIOServer } from 'socket.io';
import type { Supabase, DocSocketDeps, RouteDeps } from '../types/index.js';
export declare function registerDocSocket(io: SocketIOServer, supabase: Supabase, deps: DocSocketDeps): void;
export default function createDocRoutes(deps: RouteDeps): Router;
//# sourceMappingURL=doc.d.ts.map