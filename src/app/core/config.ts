/**
 * Configuração da aplicação.
 * - apiUrl: prefixo de todas as chamadas REST.
 * - useMockApi: quando true, as requisições são atendidas pelo interceptor em memória
 *   (`core/mock/mock-api.interceptor.ts`). Basta trocar para false e apontar `apiUrl`
 *   para um backend real que implemente o mesmo contrato.
 */
export const appSettings = {
  apiUrl: '/api/v1',
  useMockApi: true,
  demoCredentials: { username: 'admin', password: 'admin123' },
} as const;
