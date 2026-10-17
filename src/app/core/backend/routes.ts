/**
 * Regras de negócio da API `/admin/*`, independentes de framework.
 *
 * O mesmo código atende duas implementações:
 * - o servidor Express em `backend/` (versão completa, com JWT);
 * - o interceptor do Angular em `core/mock/` (modo navegador, sem servidor).
 *
 * Por ser importado diretamente pelo Node (type stripping), este arquivo usa apenas
 * sintaxe TypeScript "apagável" e imports com extensão `.ts`.
 */
import { daysFromToday, fromIsoDate } from '../dates.ts';
import {
  type FarmingInGroup,
  type GroupRequest,
  type ProducerFarmings,
  cultureIdByName,
  cultureNameById,
} from '../models.ts';
import type { State } from './store.ts';

export interface ApiRequest {
  method: string;
  /** Caminho relativo ao prefixo da API, ex.: `/admin/group/3`. */
  path: string;
  query: URLSearchParams;
  body: unknown;
}

export interface ApiResponse {
  status: number;
  body: unknown;
}

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

type Handler = (req: ApiRequest, params: string[], db: State) => unknown;

function producerFarmings(s: State, producerId: number): ProducerFarmings {
  const producer = s.producers.find((p) => p.id === producerId);
  if (!producer) throw new ApiError(404, 'Produtor não encontrado');
  const own = s.farmings
    .filter((f) => f.producerId === producerId)
    .map(({ producerId: _, ...f }) => f);
  return {
    producer,
    ableFarmings: own.filter((f) => f.ableToCompare),
    unableFarmings: own.filter((f) => !f.ableToCompare),
  };
}

function setAble(s: State, ids: unknown, able: boolean) {
  if (!Array.isArray(ids) || !ids.every((id) => typeof id === 'number')) {
    throw new ApiError(400, 'Lista de lavouras inválida');
  }
  s.farmings.filter((f) => ids.includes(f.id)).forEach((f) => (f.ableToCompare = able));
  if (!able) s.groupFarmings = s.groupFarmings.filter((gf) => !ids.includes(gf.farmingId));
}

function parseGroup(body: unknown): GroupRequest {
  const b = (typeof body === 'object' && body !== null ? body : {}) as Record<string, unknown>;
  return {
    name: typeof b['name'] === 'string' ? b['name'] : '',
    cultureType: Number(b['cultureType']),
    plantingYear: Number(b['plantingYear']),
    harvestYear: Number(b['harvestYear']),
  };
}

function validateGroup(s: State, body: GroupRequest, ignoreId?: number) {
  const name = body.name.trim();
  if (!name || /\s/.test(name) || name.length > 20) throw new ApiError(400, 'Nome inválido');
  if (s.groups.some((g) => g.id !== ignoreId && g.name.toLowerCase() === name.toLowerCase())) {
    throw new ApiError(409, 'Nome do grupo já utilizado');
  }
  if (!cultureNameById(body.cultureType)) throw new ApiError(400, 'Cultura inválida');
  if (
    !Number.isInteger(body.plantingYear) ||
    !Number.isInteger(body.harvestYear) ||
    body.plantingYear < 2000 ||
    body.harvestYear < body.plantingYear
  ) {
    throw new ApiError(400, 'Safra inválida');
  }
}

const routes: [string, RegExp, Handler][] = [
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
      if (!endDate || daysFromToday(endDate) <= daysFromToday(plan.startDate)) {
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
    (req, _p, s) => [producerFarmings(s, Number(req.query.get('id')))],
  ],
  ['PUT', /^\/admin\/analysis\/farming\/activate$/, (req, _p, s) => setAble(s, req.body, true)],
  ['PUT', /^\/admin\/analysis\/farming\/deactivate$/, (req, _p, s) => setAble(s, req.body, false)],
  [
    'GET',
    /^\/admin\/analysis\/farming$/,
    (req, _p, s) => {
      const plantingYear = Number(req.query.get('plantingYear'));
      const harvestYear = Number(req.query.get('harvestYear'));
      const culture = cultureNameById(Number(req.query.get('cultureType')));
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
      const body = parseGroup(req.body);
      validateGroup(s, body);
      const group = {
        id: s.nextId++,
        name: body.name.trim(),
        cultureType: cultureNameById(body.cultureType)!,
        plantingYear: body.plantingYear,
        harvestYear: body.harvestYear,
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
      const body = parseGroup(req.body);
      // Grupos com lavouras só podem ter o nome alterado: a safra/cultura do corpo é ignorada.
      const hasFarmings = s.groupFarmings.some((gf) => gf.groupId === group.id);
      validateGroup(
        s,
        hasFarmings
          ? {
              ...body,
              cultureType: cultureIdByName(group.cultureType) ?? 0,
              plantingYear: group.plantingYear,
              harvestYear: group.harvestYear,
            }
          : body,
        group.id,
      );
      group.name = body.name.trim();
      if (!hasFarmings) {
        group.cultureType = cultureNameById(body.cultureType)!;
        group.plantingYear = body.plantingYear;
        group.harvestYear = body.harvestYear;
      }
      return group;
    },
  ],
  [
    'DELETE',
    /^\/admin\/group\/(\d+)$/,
    (_r, [id], s) => {
      if (!s.groups.some((g) => g.id === Number(id))) throw new ApiError(404, 'Grupo não encontrado');
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
      const group = s.groups.find((g) => g.id === Number(groupId));
      const farming = s.farmings.find((f) => f.id === Number(farmingId));
      if (!group || !farming) throw new ApiError(404, 'Grupo ou lavoura não encontrados');
      if (
        !farming.ableToCompare ||
        farming.cultureType !== group.cultureType ||
        farming.plantingYear !== group.plantingYear ||
        farming.harvestYear !== group.harvestYear
      ) {
        throw new ApiError(400, 'A lavoura não é compatível com o grupo');
      }
      if (s.groupFarmings.some((gf) => gf.groupId === group.id && gf.farmingId === farming.id)) {
        throw new ApiError(409, 'Lavoura já pertence ao grupo');
      }
      s.groupFarmings.push({ groupId: group.id, farmingId: farming.id });
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
 * Executa a requisição contra o estado. Lança `ApiError` para respostas de erro.
 * Handlers que alteram dados mutam `state` diretamente; quem chama decide como persistir.
 */
export function handleAdminRequest(req: ApiRequest, state: State): ApiResponse {
  for (const [method, pattern, handler] of routes) {
    const match = pattern.exec(req.path);
    if (method === req.method && match) {
      return { status: 200, body: handler(req, match.slice(1), state) ?? null };
    }
  }
  throw new ApiError(404, 'Recurso não encontrado');
}
