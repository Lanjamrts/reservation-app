import {
  WebSocketGateway, WebSocketServer,
  SubscribeMessage, OnGatewayConnection,
  OnGatewayDisconnect, OnGatewayInit,
  MessageBody, ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@WebSocketGateway({
  cors: { origin: 'http://localhost:4200', credentials: true },
  // ✅ Pas de namespace — racine "/" pour que le frontend se connecte facilement
})
export class AppGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(AppGateway.name);

  constructor(private readonly jwtService: JwtService) {}

  afterInit() {
    this.logger.log('WebSocket Gateway initialized on /');
  }

  handleConnection(client: Socket): void {
    const token =
      client.handshake.auth?.token ||
      client.handshake.headers?.authorization?.replace('Bearer ', '');

    if (!token) {
      client.data.role = 'guest';
      return;
    }

    try {
      const payload = this.jwtService.verify(token, {
        secret: process.env.JWT_SECRET || 'super-secret-jwt-key-change-in-production',
      });
      client.data.userId = payload.sub;
      client.data.username = payload.username;
      client.data.role = payload.role;

      // L'admin rejoint automatiquement la room "admins"
      if (payload.role === 'admin') {
        client.join('admins');
      }
      // Chaque user rejoint sa room personnelle
      client.join(`user:${payload.sub}`);

      this.logger.log(`Connected: ${payload.username} (${payload.role})`);
    } catch {
      this.logger.warn(`Invalid token from ${client.id} — disconnecting`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket): void {
    this.logger.log(`Disconnected: ${client.id}`);
  }

  @SubscribeMessage('subscribe:resource')
  handleSubscribeResource(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { resourceId: string },
  ): void {
    const room = `resource:${data.resourceId}`;
    client.join(room);
    client.emit('subscribed', { room, resourceId: data.resourceId });
  }

  @SubscribeMessage('unsubscribe:resource')
  handleUnsubscribeResource(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { resourceId: string },
  ): void {
    client.leave(`resource:${data.resourceId}`);
  }

  /**
   * Appelé par BookingService après chaque mutation
   */
  broadcastBookingUpdate(payload: { event: string; booking: any }): void {
    const resourceRoom = `resource:${payload.booking.resourceId}`;
    const userRoom = `user:${payload.booking.userId}`;

    // Notifier les abonnés à cette ressource
    this.server.to(resourceRoom).emit(payload.event, payload.booking);
    // Notifier l'utilisateur concerné
    this.server.to(userRoom).emit(payload.event, payload.booking);
    // Notifier tous les admins
    this.server.to('admins').emit('admin:booking:update', payload);
  }

  /**
   * Broadcast quand l'admin crée/modifie/supprime une ressource
   * — tous les users connectés reçoivent la mise à jour
   */
  broadcastResourceUpdate(payload: { event: string; resource: any }): void {
    this.server.emit('resource:update', payload);
    this.logger.log(`Resource update broadcasted: ${payload.event}`);
  }
}