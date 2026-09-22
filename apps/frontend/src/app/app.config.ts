import {
  ApplicationConfig,
  ErrorHandler,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { appRoutes } from './app.routes';
import { provideHttpClient } from '@angular/common/http';
import { Apollo, APOLLO_OPTIONS } from 'apollo-angular';
import { HttpLink } from 'apollo-angular/http';
import { InMemoryCache } from '@apollo/client/core';
import { provideMarkdown } from 'ngx-markdown';
import { GraphQLService } from './core/services/graphql.service';
import { ThemeService } from '@features/settings/services/theme.service';
import { GlobalErrorHandler } from './core/handlers/global-error-handler';

export const appConfig: ApplicationConfig = {
  providers: [
    { provide: ErrorHandler, useClass: GlobalErrorHandler },
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideAppInitializer(() => {
      inject(ThemeService);
      inject(GraphQLService);
    }),
    provideRouter(appRoutes),
    provideHttpClient(),
    provideMarkdown(),
    Apollo,
    {
      provide: APOLLO_OPTIONS,
      useFactory: (httpLink: HttpLink, graphql: GraphQLService) => {
        return {
          cache: new InMemoryCache(),
          link: httpLink.create({
            uri: graphql.graphqlUrl,
          }),
        };
      },
      deps: [HttpLink, GraphQLService],
    },
  ],
};
