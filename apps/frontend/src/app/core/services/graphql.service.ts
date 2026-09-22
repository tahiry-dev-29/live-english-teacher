import { Injectable } from '@angular/core';
import { API_BASE_URL, GRAPHQL_URL } from '@shared/constants/api-config';

/**
 * Centralized GraphQL configuration service.
 * Provides the GraphQL endpoint URL for Apollo setup.
 * Uses environment-aware configuration from shared constants.
 */
@Injectable({
  providedIn: 'root',
})
export class GraphQLService {
  readonly graphqlUrl: string = GRAPHQL_URL;
  readonly apiBaseUrl: string = API_BASE_URL;
}
