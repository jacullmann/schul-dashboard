import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '../common/jwt/jwt.service';
import { COOKIE_NAME } from '../common/guards/jwt-auth.guard';
import { generateUserName } from '../common/utils/name-generator.util';
import { Logger } from '@nestjs/common';

function parseCookies(cookieHeader?: string): Record<string, string> {
  const list: Record<string, string> = {};
  if (!cookieHeader) return list;
  cookieHeader.split(';').forEach((c) => {
    const parts = c.split('=');
    const name = parts.shift()?.trim();
    if (name) {
      list[name] = decodeURIComponent(parts.join('='));
    }
  });
  return list;
}

@WebSocketGateway({
  namespace: '/messages',
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
  },
})
export class MessagesGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(MessagesGateway.name);

  @WebSocketServer()
  server: Server;

  constructor(private readonly jwtService: JwtService) {}

  async handleConnection(client: Socket) {
    try {
      const cookieHeader = client.handshake.headers.cookie;
      const cookies = parseCookies(cookieHeader);
      const token = cookies[COOKIE_NAME];

      if (!token) {
        this.logger.warn(
          `Connection attempt rejected: no ${COOKIE_NAME} cookie found.`,
        );
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verifyUserToken(token);
      if (!payload || !payload.sub) {
        this.logger.warn('Connection attempt rejected: invalid token payload.');
        client.disconnect();
        return;
      }

      // Attach session info to client data
      client.data.userId = payload.sub;
      client.data.activeGroupId = payload.gId;
      this.logger.log(`Client ${client.id} connected. User: ${payload.sub}`);
    } catch (err) {
      this.logger.error(
        `Error in socket connection: ${err instanceof Error ? err.message : err}`,
      );
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client ${client.id} disconnected.`);
  }

  @SubscribeMessage('joinGroup')
  handleJoinGroup(client: Socket, payload: { groupId: string }) {
    if (!payload.groupId) return;

    if (client.data.activeGroupId !== payload.groupId) {
      this.logger.warn(
        `User ${client.data.userId} tried to join group ${payload.groupId} but active token group is ${client.data.activeGroupId}`,
      );
      return;
    }

    const room = `group:${payload.groupId}`;
    void client.join(room);
    this.logger.log(`Client ${client.id} joined room ${room}`);
  }

  @SubscribeMessage('typing')
  handleTyping(client: Socket, payload: { groupId: string }) {
    if (!payload.groupId) return;

    if (client.data.activeGroupId !== payload.groupId) return;

    const room = `group:${payload.groupId}`;
    const senderName = generateUserName(client.data.userId, payload.groupId);
    client.to(room).emit('userTyping', {
      userId: client.data.userId,
      senderName,
      isTyping: true,
    });
  }

  @SubscribeMessage('stopTyping')
  handleStopTyping(client: Socket, payload: { groupId: string }) {
    if (!payload.groupId) return;

    if (client.data.activeGroupId !== payload.groupId) return;

    const room = `group:${payload.groupId}`;
    const senderName = generateUserName(client.data.userId, payload.groupId);
    client.to(room).emit('userTyping', {
      userId: client.data.userId,
      senderName,
      isTyping: false,
    });
  }

  broadcastMessage(tenantId: string, message: any) {
    const room = `group:${tenantId}`;
    this.server.to(room).emit('newMessage', message);
    this.logger.log(`Broadcasted new message to room ${room}`);
  }

  broadcastMessageDeleted(tenantId: string, messageId: string) {
    const room = `group:${tenantId}`;
    this.server.to(room).emit('messageDeleted', { messageId });
    this.logger.log(
      `Broadcasted message deletion ${messageId} to room ${room}`,
    );
  }
}
