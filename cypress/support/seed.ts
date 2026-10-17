/**
 * Dados esperados nos testes, derivados do mesmo seed determinístico usado pela API mock.
 * Assim os cenários não dependem de nomes "chumbados" e continuam válidos se o seed mudar.
 */
import { daysFromToday } from '../../src/app/core/dates';
import { createSeed } from '../../src/app/core/backend/store';
import { fullName } from '../../src/app/core/models';

export const seed = createSeed();

const farmingsOf = (producerId: number) => seed.farmings.filter((f) => f.producerId === producerId);
const linkedTo = (groupId: number) => seed.groupFarmings.filter((gf) => gf.groupId === groupId);

export const plans = {
  total: seed.plans.length,
  toExpire: seed.plans.filter((p) => daysFromToday(p.endDate) >= 0).length,
  expired: seed.plans.filter((p) => daysFromToday(p.endDate) < 0).length,
};

/** Produtor com lavouras aptas e não aptas — cobre os dois fluxos de habilitação. */
export const producerWithBoth = (() => {
  const producer = seed.producers.find((p) => {
    const farmings = farmingsOf(p.id);
    return farmings.some((f) => f.ableToCompare) && farmings.some((f) => !f.ableToCompare);
  })!;
  const farmings = farmingsOf(producer.id);
  return {
    name: fullName(producer),
    able: farmings.filter((f) => f.ableToCompare),
    unable: farmings.filter((f) => !f.ableToCompare),
  };
})();

export const producerWithoutFarmings = fullName(
  seed.producers.find((p) => farmingsOf(p.id).length === 0)!,
);

export const otherProducer = fullName(
  seed.producers.find((p) => fullName(p) !== producerWithBoth.name && farmingsOf(p.id).length > 0)!,
);

/** Grupo semeado que já possui lavouras vinculadas. */
export const groupWithFarmings = (() => {
  const group = seed.groups.find((g) => linkedTo(g.id).length > 0)!;
  return { ...group, linked: linkedTo(group.id).length };
})();

/** Lavouras aptas da mesma cultura/safra do grupo que ainda não estão nele. */
export const candidatesForGroup = seed.farmings.filter(
  (f) =>
    f.ableToCompare &&
    f.cultureType === groupWithFarmings.cultureType &&
    f.plantingYear === groupWithFarmings.plantingYear &&
    f.harvestYear === groupWithFarmings.harvestYear &&
    !linkedTo(groupWithFarmings.id).some((gf) => gf.farmingId === f.id),
);
