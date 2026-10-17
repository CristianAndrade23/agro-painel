import { environment } from '../../environments/environment';

/**
 * Configuração da aplicação.
 * - apiUrl: prefixo de todas as chamadas REST (mesma origem do app).
 * - useMockApi: true no modo demo, em que o interceptor `core/mock/mock-api.interceptor.ts`
 *   atende as chamadas no navegador; false quando há o backend Express (`backend/`).
 */
export const appSettings = {
  apiUrl: '/api/v1',
  useMockApi: environment.useMockApi,
  demoCredentials: { username: 'admin', password: 'admin123' },
} as const;
