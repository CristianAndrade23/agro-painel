import {
  HttpErrorResponse,
  HttpEvent,
  HttpInterceptorFn,
  HttpRequest,
  HttpResponse,
} from '@angular/common/http';
import { Observable, delay, dematerialize, materialize, of, throwError } from 'rxjs';
import { appSettings } from '../config';
import { daysFromToday, fromIsoDate } from '../dates';
import {
  FarmingInGroup,
  GroupRequest,
  ProducerFarmings,
  SignInRequest,
  UserInfo,
  cultureNameById,
} from '../models';
import { MockState, loadState, saveState } from './mock-db';

type Handler = (req: HttpRequest<unknown>, params: string[], db: MockState) => unknown;

class ApiError {
  constructor(
    readonly status: number,
    readonly message: string,
  ) {}
}

const DEMO_USER: UserInfo = { clientId: 1, clientName: 'Administrador' };
const DEMO_TOKEN = 'Bearer demo.' + btoa(JSON.stringify(DEMO_USER));

let db: MockState | null = null;
const state = () => (db ??= loadState());

/** Recarrega o seed na próxima requisição (usado pelo botão "restaurar dados"). */
export function resetMockDb(): void {
  db = null;
}

function requireAuth(req: HttpRequest<unknown>) {
  if (req.headers.get('Authorization') !== DEMO_TOKEN) throw new ApiError(401, 'Token inválido');
}

function producerFarmings(s: MockState, producerId: number): ProducerFarmings {
  const producer = s.producers.find((p) => p.id === producerId);
  if (!producer) throw new ApiError(404, 'Produtor não encontrado');
  const own = s.farmings.filter((f) => f.producerId === producerId).map(({ producerId: _, ...f }) => f);
  return {
    producer,
    ableFarmings: own.filter((f) => f.ableToCompare),
    unableFarmings: own.filter((f) => !f.ableToCompare),
  };
}

function setAble(s: MockState, ids: unknown, able: boolean) {
  if (!Array.isArray(ids)) throw new ApiError(400, 'Lista de lavouras inválida');
  s.farmings.filter((f) => ids.includes(f.id)).forEach((f) => (f.ableToCompare = able));
  if (!able) s.groupFarmings = s.groupFarmings.filter((gf) => !ids.includes(gf.farmingId));
}

function validateGroup(s: MockState, body: GroupRequest, ignoreId?: number) {
  const name = body.name?.trim();
  if (!name || /\s/.test(name)) throw new ApiError(400, 'Nome inválido');
  if (s.groups.some((g) => g.id !== ignoreId && g.name.toLowerCase() === name.toLowerCase())) {
    throw new ApiError(409, 'Nome do grupo já utilizado');
  }
  if (!cultureNameById(Number(body.cultureType))) throw new ApiError(400, 'Cultura inválida');
  if (body.plantingYear < 2000 || body.harvestYear < body.plantingYear) {
    throw new ApiError(400, 'Safra inválida');
  }
}

const routes: [string, RegExp, Handler][] = [
  // --- Autenticação -------------------------------------------------------
  [
    'POST',
    /^\/authentication\/signin$/,
    (req) => {
      const body = req.body as SignInRequest;
      const { username, password } = appSettings.demoCredentials;
      if (body.username !== username || body.password !== password) {
        throw new ApiError(401, 'Credenciais inválidas');
      }
      return { token: DEMO_TOKEN };
    },
  ],
  [
    'GET',
    /^\/authentication\/decrypt$/,
    (req) => {
      requireAuth(req);
      return DEMO_USER;
    },
  ],
  [
    'GET',
    /^\/authentication\/validate$/,
    (req) => {
      requireAuth(req);
      return true;
    },
  ],

  // --- Planos -------------------------------------------------------------
  ['GET', /^\/admin\/plan$/, (_r, _p, s) => s.plans],
  [
    'GET',
    /^\/admin\/plan\/plans-to-expire$/,
    (_r, _p, s) => s.plans.filter((p) => daysFromToday(p.endDate) >= 0),
  ],
  [
    'GET',
    /^\/admin\/plan\/expired-plans$/,
    (_r, _p, s) => s.plans.filter((p) => daysFromToday(p.endDate) < 0),
  ],
  [
    'PUT',
    /^\/admin\/plan\/(\d+)\/(activate|deactivate)$/,
    (_r, [id, action], s) => {
      const plan = s.plans.find((p) => p.id === Number(id));
      if (!plan) throw new ApiError(404, 'Plano não encontrado');
      plan.isActive = action === 'activate';
      return plan.isActive;
    },
  ],
  [
    'PATCH',
    /^\/admin\/plan\/(\d+)\/end-date\/([\d-]+)$/,
    (_r, [id, iso], s) => {
      const plan = s.plans.find((p) => p.id === Number(id));
      const endDate = fromIsoDate(iso);
      if (!plan) throw new ApiError(404, 'Plano não encontrado');
      if (!endDate || daysFromToday(endDate) < daysFromToday(plan.startDate)) {
        throw new ApiError(400, 'Data inválida');
      }
      plan.endDate = endDate;
      return 'OK';
    },
  ],

  // --- Análise de lavouras -------------------------------------------------
  ['GET', /^\/admin\/analysis\/producer$/, (_r, _p, s) => s.producers],
  [
    'GET',
    /^\/admin\/analysis\/farming\/producer\/?$/,
    (req, _p, s) => [producerFarmings(s, Number(req.params.get('id')))],
  ],
  ['PUT', /^\/admin\/analysis\/farming\/activate$/, (req, _p, s) => setAble(s, req.body, true)],
  ['PUT', /^\/admin\/analysis\/farming\/deactivate$/, (req, _p, s) => setAble(s, req.body, false)],
  [
    'GET',
    /^\/admin\/analysis\/farming$/,
    (req, _p, s) => {
      const plantingYear = Number(req.params.get('plantingYear'));
      const harvestYear = Number(req.params.get('harvestYear'));
      const culture = cultureNameById(Number(req.params.get('cultureType')));
      return s.producers
        .map((p) => producerFarmings(s, p.id))
        .map((pf) => ({
          ...pf,
          ableFarmings: pf.ableFarmings.filter(
            (f) =>
              f.cultureType === culture &&
              f.plantingYear === plantingYear &&
              f.harvestYear === harvestYear,
          ),
          unableFarmings: [],
        }))
        .filter((pf) => pf.ableFarmings.length > 0);
    },
  ],

  // --- Grupos de comparação -------------------------------------------------
  ['GET', /^\/admin\/group$/, (_r, _p, s) => s.groups],
  [
    'POST',
    /^\/admin\/group$/,
    (req, _p, s) => {
      const body = req.body as GroupRequest;
      validateGroup(s, body);
      const group = {
        id: s.nextId++,
        name: body.name.trim(),
        cultureType: cultureNameById(Number(body.cultureType))!,
        plantingYear: Number(body.plantingYear),
        harvestYear: Number(body.harvestYear),
        status: true,
      };
      s.groups.push(group);
      return { id: group.id, name: group.name, status: group.status };
    },
  ],
  [
    'PUT',
    /^\/admin\/group\/(\d+)$/,
    (req, [id], s) => {
      const group = s.groups.find((g) => g.id === Number(id));
      if (!group) throw new ApiError(404, 'Grupo não encontrado');
      const body = req.body as GroupRequest;
      validateGroup(s, body, group.id);
      const hasFarmings = s.groupFarmings.some((gf) => gf.groupId === group.id);
      group.name = body.name.trim();
      if (!hasFarmings) {
        group.cultureType = cultureNameById(Number(body.cultureType))!;
        group.plantingYear = Number(body.plantingYear);
        group.harvestYear = Number(body.harvestYear);
      }
      return group;
    },
  ],
  [
    'DELETE',
    /^\/admin\/group\/(\d+)$/,
    (_r, [id], s) => {
      if (s.groupFarmings.some((gf) => gf.groupId === Number(id))) {
        throw new ApiError(409, 'Remova as lavouras do grupo antes de excluí-lo');
      }
      s.groups = s.groups.filter((g) => g.id !== Number(id));
      return null;
    },
  ],
  [
    'GET',
    /^\/admin\/group\/(\d+)$/,
    (_r, [id], s): FarmingInGroup[] =>
      s.groupFarmings
        .filter((gf) => gf.groupId === Number(id))
        .map((gf) => {
          const f = s.farmings.find((x) => x.id === gf.farmingId)!;
          return {
            id: f.id,
            name: f.name,
            plantingYear: f.plantingYear,
            harvestYear: f.harvestYear,
            cultureType: f.cultureType,
            producer: s.producers.find((p) => p.id === f.producerId)!,
          };
        }),
  ],
  [
    'POST',
    /^\/admin\/group\/(\d+)\/farming\/(\d+)$/,
    (_r, [groupId, farmingId], s) => {
      const link = { groupId: Number(groupId), farmingId: Number(farmingId) };
      if (s.groupFarmings.some((gf) => gf.groupId === link.groupId && gf.farmingId === link.farmingId)) {
        throw new ApiError(409, 'Lavoura já pertence ao grupo');
      }
      s.groupFarmings.push(link);
      return null;
    },
  ],
  [
    'DELETE',
    /^\/admin\/group\/(\d+)\/farming\/(\d+)$/,
    (_r, [groupId, farmingId], s) => {
      s.groupFarmings = s.groupFarmings.filter(
        (gf) => !(gf.groupId === Number(groupId) && gf.farmingId === Number(farmingId)),
      );
      return null;
    },
  ],
];

/**
 * Intercepta as chamadas para `appSettings.apiUrl` e responde a partir da base em memória,
 * simulando latência de rede. Permite rodar o painel completo sem backend.
 */
export const mockApiInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(appSettings.apiUrl)) return next(req);

  const path = req.url.slice(appSettings.apiUrl.length).split('?')[0];
  const latency = 250 + Math.random() * 350;

  for (const [method, pattern, handler] of routes) {
    const match = pattern.exec(path);
    if (method !== req.method || !match) continue;

    let response: Observable<HttpEvent<unknown>>;
    try {
      const s = state();
      const body = handler(req, match.slice(1), s);
      if (req.method !== 'GET') saveState(s);
      response = of(new HttpResponse({ status: 200, url: req.url, body: structuredClone(body ?? null) }));
    } catch (e) {
      const err = e instanceof ApiError ? e : new ApiError(500, String(e));
      response = throwError(
        () =>
          new HttpErrorResponse({
            status: err.status,
            url: req.url,
            error: { message: err.message },
          }),
      );
    }
    // materialize/dematerialize aplica o delay também aos erros.
    return response.pipe(materialize(), delay(latency), dematerialize());
  }

  return throwError(
    () => new HttpErrorResponse({ status: 404, url: req.url, error: { message: 'Rota mock inexistente' } }),
  ).pipe(materialize(), delay(latency), dematerialize());
};
