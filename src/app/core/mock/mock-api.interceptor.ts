import {
  HttpErrorResponse,
  HttpEvent,
  HttpInterceptorFn,
  HttpRequest,
  HttpResponse,
} from '@angular/common/http';
import { Observable, delay, dematerialize, materialize, of, throwError } from 'rxjs';
import { ApiError, handleAdminRequest } from '../backend/routes';
import { State, createSeed } from '../backend/store';
import { appSettings } from '../config';
import { SignInRequest, UserInfo } from '../models';

/**
 * API mock do modo navegador: atende as chamadas no próprio navegador usando as mesmas
 * regras de negócio do servidor (`core/backend/routes.ts`). Aqui ficam só as partes
 * específicas do navegador: token de demonstração, latência simulada e persistência
 * no localStorage.
 */

const STORAGE_KEY = 'agro-painel:mock-db:v1';
const DEMO_USER: UserInfo = { clientId: 1, clientName: 'Administrador' };
const DEMO_TOKEN = 'Bearer demo.' + btoa(JSON.stringify(DEMO_USER));

let db: State | null = null;

function state(): State {
  if (db) return db;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return (db = JSON.parse(raw) as State);
  } catch {
    /* storage indisponível: segue com seed */
  }
  return (db = createSeed());
}

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  } catch {
    /* sem persistência — a demo continua funcionando em memória */
  }
}

/** Volta a base para o seed (usado pelos testes). */
export function resetMockDb(): void {
  db = createSeed();
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

function requireAuth(req: HttpRequest<unknown>) {
  if (req.headers.get('Authorization') !== DEMO_TOKEN) throw new ApiError(401, 'Sessão inválida');
}

function handle(req: HttpRequest<unknown>, path: string): unknown {
  switch (`${req.method} ${path}`) {
    case 'POST /authentication/signin': {
      const body = req.body as SignInRequest;
      const { username, password } = appSettings.demoCredentials;
      if (body.username !== username || body.password !== password) {
        throw new ApiError(401, 'Credenciais inválidas');
      }
      return { token: DEMO_TOKEN };
    }
    case 'GET /authentication/decrypt':
      requireAuth(req);
      return DEMO_USER;
    case 'GET /authentication/validate':
      requireAuth(req);
      return true;
    case 'POST /demo/reset':
      resetMockDb();
      return null;
  }

  requireAuth(req);
  const result = handleAdminRequest(
    { method: req.method, path, query: new URLSearchParams(req.params.toString()), body: req.body },
    state(),
  );
  if (req.method !== 'GET') persist();
  return result.body;
}

/**
 * Intercepta as chamadas para `appSettings.apiUrl` e responde a partir da base local,
 * simulando latência de rede. Permite rodar o painel completo sem backend.
 */
export const mockApiInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(appSettings.apiUrl)) return next(req);

  const path = req.url.slice(appSettings.apiUrl.length).split('?')[0];
  let response: Observable<HttpEvent<unknown>>;
  try {
    const body = structuredClone(handle(req, path) ?? null);
    response = of(new HttpResponse({ status: 200, url: req.url, body }));
  } catch (e) {
    const err = e instanceof ApiError ? e : new ApiError(500, String(e));
    response = throwError(
      () => new HttpErrorResponse({ status: err.status, url: req.url, error: { message: err.message } }),
    );
  }
  // materialize/dematerialize aplica o delay também aos erros.
  return response.pipe(materialize(), delay(250 + Math.random() * 350), dematerialize());
};
