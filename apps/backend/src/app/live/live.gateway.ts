// // apps/backend/src/live/live.gateway.ts 2026

// import { /* ... imports ... */ } from '@nestjs/websockets';
// import { Server, Socket } from 'socket.io'; 
// import { GeminiLiveService } from './gemini-live/gemini-live.service';
// import { LiveInputDto } from './dto/live-input.dto'

// @WebSocketGateway({ 
//   namespace: 'live-session',
//   cors: { origin: '*', credentials: true },
// })
// export class LiveGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  
//   @WebSocketServer() 
//   private server: Server; 

//   constructor(private readonly geminiLiveService: GeminiLiveService) {}
  
//   // ... (Hooks de cycle de vie inchangés) ...

//   @SubscribeMessage('live_input') 
//   async handleMessage(
//     @MessageBody() data: LiveInputDto, 
//     @ConnectedSocket() client: Socket, 
//   ): Promise<void> {
//     const userId = (client as any).userId; 
//     await this.geminiLiveService.handleLiveInput(userId, data, client);
//   }
// }
// // Professional comment: WebSocket entry point for real-time communication.