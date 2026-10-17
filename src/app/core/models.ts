/**
 * Contratos da API REST consumida pelo painel.
 * Datas chegam no formato de LocalDate serializado pelo backend Java: [ano, mês, dia].
 */
export type ApiDate = [number, number, number];

export interface Producer {
  id: number;
  document: string;
  name: string;
  lastName: string;
}

export interface Plan {
  id: number;
  name: string;
}

export interface ContractedPlan {
  id: number;
  producer: Producer;
  email: string;
  plan: Plan;
  startDate: ApiDate;
  endDate: ApiDate;
  quantityHectare: number;
  amount: number;
  isActive: boolean;
}

export interface CostDetail {
  id: number;
  costName: string;
  valueCost: number;
  costPerHectare: number;
  costPerBags: number;
}

export interface CostBreakdown {
  directCost: CostDetail[];
  indirectCost: CostDetail[];
  administrativeCost: CostDetail[];
}

export interface Farming {
  id: number;
  name: string;
  plantedArea: number;
  cultureType: string;
  plantingYear: number;
  harvestYear: number;
  ableToCompare: boolean;
  estimatedProductionQuantity: number;
  effectiveProductionQuantity: number;
  estimatedProductivity: number;
  effectiveProductivity: number;
  estimatedSalePrice: number;
  effectiveSalePrice: number;
  estimatedCost: CostBreakdown;
  effectiveCost: CostBreakdown;
}

/** Lavouras de um produtor separadas entre aptas e não aptas para comparação. */
export interface ProducerFarmings {
  producer: Producer;
  ableFarmings: Farming[];
  unableFarmings: Farming[];
}

export interface FarmingInGroup {
  id: number;
  name: string;
  plantingYear: number;
  harvestYear: number;
  cultureType: string;
  producer: Producer;
}

export interface Group {
  id: number;
  name: string;
  cultureType: string;
  plantingYear: number;
  harvestYear: number;
  status: boolean;
}

export interface GroupRequest {
  name: string;
  cultureType: number;
  plantingYear: number;
  harvestYear: number;
}

export interface SignInRequest {
  username: string;
  password: string;
  adm: boolean;
}

export interface TokenResponse {
  token: string;
}

export interface UserInfo {
  clientId: number;
  clientName: string;
}

export const CULTURE_TYPES = [
  { id: 1, name: 'Arroz' },
  { id: 2, name: 'Soja' },
  { id: 3, name: 'Feijão' },
  { id: 5, name: 'Trigo' },
  { id: 6, name: 'Milho' },
] as const;

export function cultureIdByName(name: string): number | undefined {
  return CULTURE_TYPES.find((c) => c.name === name)?.id;
}

export function cultureNameById(id: number): string | undefined {
  return CULTURE_TYPES.find((c) => c.id === id)?.name;
}

export function fullName(p: Pick<Producer, 'name' | 'lastName'>): string {
  return `${p.name} ${p.lastName}`;
}
