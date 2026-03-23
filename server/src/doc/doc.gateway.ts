import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { SupabaseService } from '../common/supabase/supabase.service';
import { DocService } from './doc.service';
import { AppConfig } from '../config/env.config';
import * as jwt from 'jsonwebtoken';

interface AuthPayload {
  sub?: string;
  email?: string;
  gRole?: string;
}

@WebSocketGateway({ namespace: '/doc', cors: true })
export class DocGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private connectedAdmins = new Map<
    string,
    { email: string; userId: string }
  >();
  private persistTimer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly docService: DocService,
    private readonly appConfig: AppConfig,
    private readonly supabaseService: SupabaseService,
  ) {}

  private startPersistTimer(): void {
    if (this.persistTimer) return;
    this.persistTimer = setInterval(() => {
      void this.docService.persistToDb().then(() => {
        if (this.connectedAdmins.size === 0 && this.persistTimer) {
          clearInterval(this.persistTimer);
          this.persistTimer = null;
        }
      });
    }, 30_000);
  }

  private getOnlineList(): string[] {
    return Array.from(this.connectedAdmins.values()).map((a) => a.email);
  }

  async handleConnection(client: Socket): Promise<void> {
    try {
      const cookieHeader = client.handshake.headers.cookie || '';
      const cookieMap = Object.fromEntries(
        cookieHeader.split(';').map((c) => {
          const [k, ...v] = c.trim().split('=');
          return [k, decodeURIComponent(v.join('='))];
        }),
      );
      const userToken = cookieMap['auth_token'];
      if (!userToken) {
        client.disconnect();
        return;
      }

      const authSecret = this.appConfig.jwtSecret;
      const payload = jwt.verify(userToken, authSecret) as AuthPayload;
      if (!payload?.sub || !payload?.email) {
        client.disconnect();
        return;
      }

      if (payload.gRole !== 'superadmin') {
        client.disconnect();
        return;
      }

      // Check ban status
      const sb = this.supabaseService.getClient();
      const { data: ban } = await sb
        .from('banned_users')
        .select('id')
        .eq('user_id', payload.sub)
        .maybeSingle();
      if (ban) {
        client.disconnect();
        return;
      }

      client.data.userId = payload.sub;
      client.data.email = payload.email;

      this.connectedAdmins.set(client.id, {
        email: payload.email,
        userId: payload.sub,
      });

      await this.docService.loadFromDb();
      this.startPersistTimer();

      const docState = this.docService.getDocState();
      client.emit('doc:init', {
        ...docState,
        onlineAdmins: this.getOnlineList(),
      });
      client.broadcast.emit('doc:admins-update', {
        onlineAdmins: this.getOnlineList(),
      });
    } catch {
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket): Promise<void> {
    this.connectedAdmins.delete(client.id);
    this.server?.emit('doc:admins-update', {
      onlineAdmins: this.getOnlineList(),
    });
    if (this.connectedAdmins.size === 0) {
      await this.docService.persistToDb();
    }
  }

  @SubscribeMessage('doc:update')
  handleDocUpdate(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { content?: string; clientVersion?: number },
  ): void {
    if (
      typeof payload?.content !== 'string' ||
      typeof payload?.clientVersion !== 'number'
    )
      return;

    const email = client.data.email as string;
    const result = this.docService.applyUpdate(
      payload.content,
      payload.clientVersion,
      email,
    );

    if (result.conflict) {
      client.emit('doc:conflict', {
        serverContent: result.state.content,
        serverVersion: result.state.version,
        lastEditedBy: result.state.lastEditedBy,
      });
      return;
    }

    client.broadcast.emit('doc:update', {
      content: result.state.content,
      version: result.state.version,
      editedBy: email,
    });
    client.emit('doc:ack', { version: result.state.version });
  }

  @SubscribeMessage('doc:cursor')
  handleCursor(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: Record<string, unknown>,
  ): void {
    const email = client.data.email as string;
    client.broadcast.emit('doc:cursor', { email, ...payload });
  }
}
