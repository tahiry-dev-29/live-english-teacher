/** Centralized messages for the Prisma data-access layer. No emoji. */
export const PRISMA_MESSAGES = {
  error: {
    unknown: 'Unknown error',
    connectionFailed: (reason: string): string =>
      `DATABASE CONNECTION FAILED: ${reason}. Start PostgreSQL and check DATABASE_URL.`,
  },
} as const;
