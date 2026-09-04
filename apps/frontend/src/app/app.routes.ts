import { Route } from '@angular/router';

export const appRoutes: Route[] = [
  {
    path: '',
    loadComponent: () =>
      import('./features/chat-room/chat-page.component').then(
        (m) => m.ChatPageComponent
      ),
  },
  {
    path: 'chat/:sessionId',
    title: 'Chat',
    loadComponent: () =>
      import('./features/chat-room/chat-page.component').then(
        (m) => m.ChatPageComponent
      ),
  },
  {
    path: '**',
    title: 'Not Found',
    loadComponent: () =>
      import('./core/components/not-found-page/not-found-page-component').then(
        (m) => m.NotFoundPageComponent
      ),
  },
];
