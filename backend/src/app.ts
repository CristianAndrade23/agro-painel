import { existsSync } from 'node:fs';
import { join } from 'node:path';
import express, { type NextFunction, type Request, type Response } from 'express';
import { ApiError, handleAdminRequest } from '../../src/app/core/backend/routes.ts';
import { type State, createSeed } from '../../src/app/core/backend/store.ts';
import { type AuthenticatedRequest, requireAuth, signinHandler } from './auth.ts';

export interface AppOptions {
  jwtSecret: string;
  /** Pasta com o build do Angular; quando existir, é servida junto com a API. */
  staticDir?: string;
}

/**
 * API do AgroPainel. As regras de negócio de `/admin/*` vêm de `src/app/core/backend/routes.ts`,
 * o mesmo módulo usado pelo modo navegador do frontend. Os dados ficam em memória e voltam ao seed
 * quando o servidor reinicia (ou em POST /demo/reset).
 */
export function createApp({ jwtSecret, staticDir }: AppOptions) {
  let state: State = createSeed();

  const app = express();
  const api = express.Router();
  const auth = requireAuth(jwtSecret);

  app.disable('x-powered-by');
  api.use(express.json({ limit: '100kb' }));

  api.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok' });
  });

  api.post('/authentication/signin', signinHandler(jwtSecret));

  api.get('/authentication/decrypt', auth, (req: AuthenticatedRequest, res: Response) => {
    res.json(req.user);
  });

  api.get('/authentication/validate', auth, (_req: Request, res: Response) => {
    res.json(true);
  });

  /** Demonstração pública: qualquer visitante pode voltar os dados ao estado inicial. */
  api.post('/demo/reset', (_req: Request, res: Response) => {
    state = createSeed();
    res.status(204).end();
  });

  api.all('/admin/{*path}', auth, (req: Request, res: Response) => {
    const query = new URLSearchParams(req.originalUrl.split('?')[1] ?? '');
    const result = handleAdminRequest({ method: req.method, path: req.path, query, body: req.body }, state);
    res.status(result.status).json(result.body);
  });

  api.use((_req: Request, res: Response) => {
    res.status(404).json({ message: 'Recurso não encontrado.' });
  });

  api.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (error instanceof ApiError) {
      res.status(error.status).json({ message: error.message });
      return;
    }
    // Erros do express.json (corpo malformado) trazem status 4xx.
    const status = (error as { status?: unknown }).status;
    if (typeof status === 'number' && status >= 400 && status < 500) {
      res.status(status).json({ message: 'Requisição inválida.' });
      return;
    }
    console.error(error);
    res.status(500).json({ message: 'Erro interno.' });
  });

  app.use('/api/v1', api);

  if (staticDir && existsSync(staticDir)) {
    app.use(express.static(staticDir));
    app.get('/{*path}', (_req: Request, res: Response) => {
      res.sendFile(join(staticDir, 'index.html'));
    });
  }

  return app;
}
