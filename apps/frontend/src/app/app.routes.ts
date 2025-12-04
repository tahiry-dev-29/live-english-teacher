import { Route } from '@angular/router';
import { ChatPageComponent } from './features/chat-room/chat-page.component';
import { NotFoundPageComponent } from './core/components/not-found-page/not-found-page-component';

export const appRoutes: Route[] = [
  { path: '', component: ChatPageComponent },
  { path: 'chat/:sessionId', title: 'Chat', component: ChatPageComponent },
  { path: '**', title: 'Not Found', component: NotFoundPageComponent }
];
