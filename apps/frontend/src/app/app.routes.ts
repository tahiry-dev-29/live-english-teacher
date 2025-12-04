import { Route } from '@angular/router';
import { App } from './app';
import { NotFoundPageComponent } from './core/components/not-found-page/not-found-page-component';

export const appRoutes: Route[] = [
  { path: '', component: App },
  { path: 'chat/:sessionId', component: App },
  { path: '**', component: NotFoundPageComponent }
];
