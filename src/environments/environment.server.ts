/**
 * Modo servidor: o painel consome a API Express de `backend/` (JWT, dados no servidor).
 * Usado pelo build de produção (`npm run serve:prod`) e pelo `npm run start:api`.
 */
export const environment = {
  useMockApi: false,
};
