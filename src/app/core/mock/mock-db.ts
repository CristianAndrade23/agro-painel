import { fromDate, today } from '../dates';
import {
  ContractedPlan,
  CostBreakdown,
  CostDetail,
  CULTURE_TYPES,
  Farming,
  Group,
  Producer,
} from '../models';

/**
 * Base de dados em memória usada pela API mock.
 * Todos os nomes, documentos e valores são fictícios e gerados de forma determinística.
 * O estado é persistido no localStorage para que as alterações sobrevivam a um reload.
 */
export interface MockState {
  producers: Producer[];
  plans: ContractedPlan[];
  farmings: (Farming & { producerId: number })[];
  groups: Group[];
  groupFarmings: { groupId: number; farmingId: number }[];
  nextId: number;
}

const STORAGE_KEY = 'agro-painel:mock-db:v1';

export function loadState(): MockState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as MockState;
  } catch {
    /* storage indisponível: segue com seed */
  }
  return createSeed();
}

export function saveState(state: MockState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* sem persistência — a demo continua funcionando em memória */
  }
}

export function clearState(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

// ---------------------------------------------------------------------------
// Seed
// ---------------------------------------------------------------------------

function mulberry32(seedValue: number) {
  let a = seedValue;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FIRST_NAMES = [
  'Ana', 'Bruno', 'Carla', 'Diego', 'Elisa', 'Fábio', 'Gabriela', 'Heitor', 'Isadora', 'João',
  'Karina', 'Lucas', 'Marina', 'Nelson', 'Olívia', 'Paulo', 'Renata', 'Sérgio', 'Tatiane', 'Vítor',
  'Beatriz', 'Caio', 'Daniela', 'Eduardo', 'Fernanda', 'Gustavo', 'Helena', 'Igor',
];
const LAST_NAMES = [
  'Almeida', 'Barbosa', 'Cardoso', 'Duarte', 'Esteves', 'Fagundes', 'Garcia', 'Hoffmann',
  'Ibarra', 'Jardim', 'Klein', 'Lopes', 'Machado', 'Nunes', 'Oliveira', 'Pereira', 'Quadros',
  'Rocha', 'Schmidt', 'Teixeira', 'Vargas', 'Weber',
];
const FIELD_NAMES = [
  'Talhão Norte', 'Talhão Sul', 'Várzea', 'Coxilha', 'Lavoura do Açude', 'Fundo do Campo',
  'Sede', 'Banhado', 'Capão Alto', 'Lagoa', 'Divisa', 'Pivô 1', 'Pivô 2', 'Encosta',
];
const PLANS = [
  { id: 1, name: 'Básico', pricePerHa: 1.8 },
  { id: 2, name: 'Profissional', pricePerHa: 2.6 },
  { id: 3, name: 'Corporativo', pricePerHa: 3.4 },
];

/** Produtividade (sc/ha), preço de venda (R$/sc) e custo base (R$/ha) por cultura. */
const AGRONOMY: Record<string, { productivity: number; price: number; costPerHa: number }> = {
  Arroz: { productivity: 160, price: 92, costPerHa: 9800 },
  Soja: { productivity: 62, price: 128, costPerHa: 5200 },
  Feijão: { productivity: 38, price: 230, costPerHa: 5600 },
  Trigo: { productivity: 55, price: 78, costPerHa: 3300 },
  Milho: { productivity: 175, price: 58, costPerHa: 6900 },
};

const COST_SHARES = {
  directCost: [
    ['Sementes', 0.16],
    ['Fertilizantes', 0.24],
    ['Defensivos', 0.18],
    ['Combustível', 0.07],
    ['Mão de obra', 0.08],
  ],
  indirectCost: [
    ['Depreciação de máquinas', 0.09],
    ['Manutenção', 0.05],
    ['Arrendamento', 0.08],
  ],
  administrativeCost: [
    ['Despesas administrativas', 0.03],
    ['Assistência técnica', 0.02],
  ],
} as const;

/** Gera o estado inicial. Também usado pelos testes E2E para conhecer os dados esperados. */
export function createSeed(): MockState {
  const rand = mulberry32(20240607);
  const pick = <T>(list: readonly T[]) => list[Math.floor(rand() * list.length)];
  const between = (min: number, max: number) => min + rand() * (max - min);
  const round2 = (n: number) => Math.round(n * 100) / 100;
  let costId = 1;

  const base = today();
  const shift = (days: number) => fromDate(new Date(base.getTime() + days * 86_400_000));

  const producers: Producer[] = [];
  const plans: ContractedPlan[] = [];
  const farmings: MockState['farmings'] = [];
  const usedNames = new Set<string>();

  for (let i = 1; i <= 32; i++) {
    let name: string, lastName: string;
    do {
      name = pick(FIRST_NAMES);
      lastName = pick(LAST_NAMES);
    } while (usedNames.has(name + lastName));
    usedNames.add(name + lastName);

    const document = Array.from({ length: 11 }, () => Math.floor(rand() * 10)).join('');
    const producer: Producer = { id: i, document, name, lastName };
    producers.push(producer);

    // Distribui os vencimentos: ~25% vencidos, ~30% vencendo em 30 dias, resto ao longo do ano.
    const bucket = rand();
    const endOffset =
      bucket < 0.25
        ? -Math.ceil(between(1, 120))
        : bucket < 0.55
          ? Math.floor(between(0, 30))
          : Math.ceil(between(31, 400));
    const plan = pick(PLANS);
    const hectares = Math.round(between(60, 2400));
    plans.push({
      id: 100 + i,
      producer,
      email: `${name}.${lastName}`
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .concat('@exemplo.com'),
      plan: { id: plan.id, name: plan.name },
      startDate: shift(endOffset - 365),
      endDate: shift(endOffset),
      quantityHectare: hectares,
      amount: round2(hectares * plan.pricePerHa * 12),
      isActive: endOffset >= 0 ? rand() > 0.12 : rand() > 0.7,
    });

    const farmingCount = Math.floor(between(0, 5));
    const fieldNames = new Set<string>();
    for (let f = 0; f < farmingCount; f++) {
      let fieldName: string;
      do fieldName = pick(FIELD_NAMES);
      while (fieldNames.has(fieldName));
      fieldNames.add(fieldName);

      const culture = pick(CULTURE_TYPES).name;
      const agro = AGRONOMY[culture];
      const plantingYear = 2022 + Math.floor(rand() * 4);
      const harvestYear = culture === 'Trigo' ? plantingYear : plantingYear + 1;
      const area = Math.round(between(25, Math.max(40, hectares / 2)));

      const estProductivity = Math.round(agro.productivity * between(0.9, 1.1));
      const effProductivity = Math.round(estProductivity * between(0.78, 1.15));
      const estPrice = round2(agro.price * between(0.92, 1.08));
      const effPrice = round2(estPrice * between(0.88, 1.12));
      const estProduction = estProductivity * area;
      const effProduction = effProductivity * area;

      const costs = (production: number, factor: number): CostBreakdown => {
        const build = (rows: readonly (readonly [string, number])[]): CostDetail[] =>
          rows.map(([costName, share]) => {
            const perHa = round2(agro.costPerHa * share * factor * between(0.9, 1.1));
            const value = round2(perHa * area);
            return {
              id: costId++,
              costName,
              valueCost: value,
              costPerHectare: perHa,
              costPerBags: round2(value / production),
            };
          });
        return {
          directCost: build(COST_SHARES.directCost),
          indirectCost: build(COST_SHARES.indirectCost),
          administrativeCost: build(COST_SHARES.administrativeCost),
        };
      };

      farmings.push({
        id: 1000 + farmings.length + 1,
        producerId: producer.id,
        name: fieldName,
        plantedArea: area,
        cultureType: culture,
        plantingYear,
        harvestYear,
        ableToCompare: rand() > 0.45,
        estimatedProductionQuantity: estProduction,
        effectiveProductionQuantity: effProduction,
        estimatedProductivity: estProductivity,
        effectiveProductivity: effProductivity,
        estimatedSalePrice: estPrice,
        effectiveSalePrice: effPrice,
        estimatedCost: costs(estProduction, 1),
        effectiveCost: costs(effProduction, between(0.92, 1.15)),
      });
    }
  }

  // Grupos semeados a partir das combinações cultura/safra mais comuns entre as lavouras aptas.
  const combos = new Map<string, { culture: string; plantingYear: number; harvestYear: number; ids: number[] }>();
  for (const f of farmings.filter((x) => x.ableToCompare)) {
    const key = `${f.cultureType}|${f.plantingYear}|${f.harvestYear}`;
    const entry = combos.get(key) ?? {
      culture: f.cultureType,
      plantingYear: f.plantingYear,
      harvestYear: f.harvestYear,
      ids: [],
    };
    entry.ids.push(f.id);
    combos.set(key, entry);
  }
  const groups: Group[] = [];
  const groupFarmings: MockState['groupFarmings'] = [];
  [...combos.values()]
    .sort((a, b) => b.ids.length - a.ids.length)
    .slice(0, 5)
    .forEach((c, index) => {
      const id = index + 1;
      const prefix = c.culture
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toUpperCase();
      groups.push({
        id,
        name: `${prefix}-${String(c.plantingYear).slice(2)}${String(c.harvestYear).slice(2)}`,
        cultureType: c.culture,
        plantingYear: c.plantingYear,
        harvestYear: c.harvestYear,
        status: true,
      });
      c.ids.slice(0, 3).forEach((farmingId) => groupFarmings.push({ groupId: id, farmingId }));
    });

  return { producers, plans, farmings, groups, groupFarmings, nextId: 5000 };
}
