/** Revalis decision model v1.0. All supplied presets are hypothetical, not measured results.
 * All mass values: dry metric tonnes; prices: USD; fractions: 0..1.
 * Browser-safe ES module. No dependencies, external requests or executable formula strings.
 */
const EPS = 1e-9;
function check(ok, message) { if (!ok) throw new RangeError(message); }
function finiteNonnegative(value, name) { check(Number.isFinite(value) && value >= 0, `${name} must be finite and nonnegative`); }
function fraction(value, name, positive=false) { check(Number.isFinite(value) && value >= (positive ? EPS : 0) && value <= 1, `${name} must be ${positive ? '> 0 and ' : ''}<= 1`); }
export function evaluateUnitRoute(shared, route) {
  fraction(shared.feedCopperGrade, 'feedCopperGrade');
  fraction(route.copperRecoveryToProduct, 'copperRecoveryToProduct');
  fraction(route.productCopperGrade, 'productCopperGrade', true);
  fraction(route.residueDryMassFraction, 'residueDryMassFraction');
  fraction(route.copperFractionToResidue, 'copperFractionToResidue');
  ['productCopperPayability','tailCopperPayability'].forEach(k => fraction(route[k], k));
  check(route.copperRecoveryToProduct + route.copperFractionToResidue <= 1 + EPS, 'Copper partition exceeds 100%');
  ['copperPriceUsdPerT','feedAcquisitionUsdPerFeedT','inboundFreightUsdPerFeedT','electricityUsdPerKwh'].forEach(k=>finiteNonnegative(shared[k],k));
  ['feedPreparationUsdPerFeedT','energyKwhPerFeedT','consumablesUsdPerFeedT','productChargesUsdPerProductT','tailChargesUsdPerTailT','residueDisposalUsdPerResidueT'].forEach(k=>finiteNonnegative(route[k],k));
  const copperFeedT = shared.feedCopperGrade;
  const copperProductT = copperFeedT * route.copperRecoveryToProduct;
  const productT = copperProductT / route.productCopperGrade;
  const residueT = route.residueDryMassFraction;
  let tailT = 1 - productT - residueT;
  const copperResidueT = copperFeedT * route.copperFractionToResidue;
  let copperTailT = copperFeedT - copperProductT - copperResidueT;
  check(tailT >= -EPS, 'Impossible mass balance: product plus residue exceeds feed');
  check(copperResidueT <= residueT + EPS, 'Impossible residue: copper exceeds residue mass');
  check(copperTailT >= -EPS && copperTailT <= tailT + EPS, 'Impossible tail: copper outside tail mass');
  tailT = Math.max(0,tailT); copperTailT = Math.max(0,copperTailT);
  const tailCopperGrade = tailT > EPS ? copperTailT / tailT : 0;
  const residueCopperGrade = residueT > EPS ? copperResidueT / residueT : 0;
  const payableCopperT = copperProductT * route.productCopperPayability + copperTailT * route.tailCopperPayability;
  const metalRevenue = payableCopperT * shared.copperPriceUsdPerT;
  const outputCharges = productT * route.productChargesUsdPerProductT + tailT * route.tailChargesUsdPerTailT + residueT * route.residueDisposalUsdPerResidueT;
  const processVariableCost = route.feedPreparationUsdPerFeedT + route.energyKwhPerFeedT * shared.electricityUsdPerKwh + route.consumablesUsdPerFeedT;
  const acquisitionAndInbound = shared.feedAcquisitionUsdPerFeedT + shared.inboundFreightUsdPerFeedT;
  const unitContribution = metalRevenue - outputCharges - processVariableCost - acquisitionAndInbound;
  return { feedT:1, copperFeedT, productT, tailT, residueT, copperProductT, copperTailT, copperResidueT,
    tailCopperGrade, residueCopperGrade, payableCopperT,
    totalPayableCopperFraction: copperFeedT > EPS ? payableCopperT/copperFeedT : 0,
    dryMassClosure: productT + tailT + residueT,
    copperMassClosure: copperFeedT > EPS ? (copperProductT + copperTailT + copperResidueT)/copperFeedT : 1,
    metalRevenueUsdPerFeedT:metalRevenue, outputChargesUsdPerFeedT:outputCharges,
    processVariableCostUsdPerFeedT:processVariableCost, acquisitionAndInboundUsdPerFeedT:acquisitionAndInbound,
    unitContributionUsdPerFeedT:unitContribution };
}
function annualRoute(shared, route, feedT) {
  const unit=evaluateUnitRoute(shared,route);
  ['operatorFtePerScheduledHour','loadedOperatorUsdPerHour','annualMaintenanceUsd','annualOtherFixedOpexUsd'].forEach(k=>finiteNonnegative(route[k],k));
  const labor = shared.scheduledHoursPerYear * route.operatorFtePerScheduledHour * route.loadedOperatorUsdPerHour;
  const fixedOpex = labor + route.annualMaintenanceUsd + route.annualOtherFixedOpexUsd;
  return {unit, feedT, laborUsd: labor, fixedOpexUsd:fixedOpex,
    productT:unit.productT*feedT, tailT:unit.tailT*feedT, residueT:unit.residueT*feedT,
    copperFeedT:unit.copperFeedT*feedT, copperProductT:unit.copperProductT*feedT,
    copperTailT:unit.copperTailT*feedT, copperResidueT:unit.copperResidueT*feedT,
    payableCopperT:unit.payableCopperT*feedT,
    metalRevenueUsd: unit.metalRevenueUsdPerFeedT*feedT,
    operatingContributionUsd:unit.unitContributionUsdPerFeedT*feedT-fixedOpex};
}
export function evaluateCase(input, mode='matched_feed') {
  check(['matched_feed','capacity_with_extra_feed'].includes(mode), 'Unknown comparison mode');
  const {shared,baseline,candidate,investment}=input;
  ['scheduledHoursPerYear','availableFeedTPerYear'].forEach(k=>finiteNonnegative(shared[k],k));
  check(shared.scheduledHoursPerYear <= 8760, 'scheduledHoursPerYear exceeds one non-leap year');
  const capacity=r=>{finiteNonnegative(r.throughputDryTPerOperatingHour,'throughputDryTPerOperatingHour'); fraction(r.availability,'availability');return r.throughputDryTPerOperatingHour*shared.scheduledHoursPerYear*r.availability;};
  const baselineCapacityT=capacity(baseline), candidateCapacityT=capacity(candidate);
  let bT=Math.min(shared.availableFeedTPerYear,baselineCapacityT), cT=Math.min(shared.availableFeedTPerYear,candidateCapacityT);
  if(mode==='matched_feed') bT=cT=Math.min(bT,cT);
  const b=annualRoute(shared,baseline,bT), c=annualRoute(shared,candidate,cT);
  ['incrementalInstalledCapexUsd','incrementalWorkingCapitalUsd','discountRate','salvageValueUsd'].forEach(k=>finiteNonnegative(investment[k],k));
  check(Number.isInteger(investment.lifeYears)&&investment.lifeYears>0,'lifeYears must be a positive integer');
  const delta=c.operatingContributionUsd-b.operatingContributionUsd;
  const initial=investment.incrementalInstalledCapexUsd+investment.incrementalWorkingCapitalUsd;
  const r=investment.discountRate, n=investment.lifeYears;
  const crf=r===0 ? 1/n : r*Math.pow(1+r,n)/(Math.pow(1+r,n)-1);
  const annualizedSalvage = r===0 ? investment.salvageValueUsd/n : investment.salvageValueUsd*r/(Math.pow(1+r,n)-1);
  const annualizedCapital=investment.incrementalInstalledCapexUsd*crf-annualizedSalvage;
  let npv=-initial;
  for(let year=1;year<=n;year++) npv+=(delta+(year===n ? investment.incrementalWorkingCapitalUsd+investment.salvageValueUsd : 0))/Math.pow(1+r,year);
  // Scalar margin decomposition is exact and avoids crediting the same gain twice.
  const matchedQuantity=Math.min(bT,cT);
  const sameFeedVariableUplift=matchedQuantity*(c.unit.unitContributionUsdPerFeedT-b.unit.unitContributionUsdPerFeedT);
  const extraVolumeContribution=(cT-matchedQuantity)*c.unit.unitContributionUsdPerFeedT-(bT-matchedQuantity)*b.unit.unitContributionUsdPerFeedT;
  const fixedCostDelta=c.fixedOpexUsd-b.fixedOpexUsd;
  const targetPaybackYears=investment.targetPaybackYears;
  finiteNonnegative(targetPaybackYears,'targetPaybackYears'); check(targetPaybackYears>0,'targetPaybackYears must be positive');
  const requiredAnnualIncrementalContribution=initial/targetPaybackYears;
  return {mode, evidenceStatus:'HYPOTHETICAL_PLANNING_ASSUMPTIONS_NOT_MEASURED', baselineCapacityT,candidateCapacityT,baseline:b,candidate:c,
    incrementalOperatingContributionUsd:delta,
    sameFeedVariableUpliftUsd:sameFeedVariableUplift,extraVolumeContributionUsd:extraVolumeContribution,fixedCostDeltaUsd:fixedCostDelta,
    annualizedIncrementalCapexUsd:annualizedCapital,
    annualizedIncrementalWorkingCapitalCostUsd:investment.incrementalWorkingCapitalUsd*r,
    incrementalAnnualizedEconomicContributionUsd:delta-annualizedCapital-investment.incrementalWorkingCapitalUsd*r,
    initialIncrementalCashUsd:initial, simplePaybackYears:delta>0 ? initial/delta : null,
    preTaxUnleveredNpvUsd:npv,
    requiredAnnualIncrementalContributionUsd:requiredAnnualIncrementalContribution,
    requiredUnitVariableUpliftUsdPerFeedT: mode==='matched_feed' && bT>0 ? (requiredAnnualIncrementalContribution+fixedCostDelta)/bT : null,
    clearsIllustrativePaybackGate:delta>=requiredAnnualIncrementalContribution,
    warnings:[ 'All presets are unverified. This is operator economics, not Revalis revenue.',
      'Copper-only calculation excludes other metals, taxes, financing and actual contractual settlement terms.',
      'Purity and payability must be replaced together using independently assayed outputs and buyer offers.',
      ...(mode==='capacity_with_extra_feed' ? ['Extra processed volume requires independently verified feed supply, buyer capacity and unchanged lot quality.'] : [])]};
}
