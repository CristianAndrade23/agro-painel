/**
 * Modo servidor: o painel consome a API Express de `backend/` (JWT, dados no servidor).
 * Usado pelo build de produção servido pelo backend (deploy no Render) e pelo `npm run dev:api`.
 */
export const environment = {
  useMockApi: false,
};
