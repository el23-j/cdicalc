/**
 * calculator.js
 * Moroccan Labor Law (Code du Travail — Loi n° 65-99)
 * CDI termination indemnity calculator
 * Articles: 41, 51, 52, 53 + Décret 2-04-469
 */

const HEURES_MOIS = 191; // Standard working hours per month (Art. 184)

/**
 * Notice period (préavis) duration in calendar days
 * Décret 2-04-469
 */
function getPreavis(categorie, totalMois) {
  if (totalMois === 0) return { jours: 0, label: '0 jours', moisEquiv: 0 };

  if (categorie === 'cadre') {
    if (totalMois < 12) return { jours: 30,  label: '1 mois',  moisEquiv: 1 };
    if (totalMois <= 60) return { jours: 60,  label: '2 mois',  moisEquiv: 2 };
    return               { jours: 90,  label: '3 mois',  moisEquiv: 3 };
  } else {
    // 8 days relative to 26 working days in a month
    if (totalMois < 12) return { jours: 8,   label: '8 jours', moisEquiv: 8 / 26 };
    if (totalMois <= 60) return { jours: 30,  label: '1 mois',  moisEquiv: 1 };
    return               { jours: 60,  label: '2 mois',  moisEquiv: 2 };
  }
}

/**
 * Severance pay hours calculation (Art. 52-53)
 * Slab-based: 96h/yr (0–5 yrs) | 144h/yr (6–10 yrs) | 192h/yr (11–15 yrs) | 240h/yr (>15 yrs)
 */
function calcHeuresLicenciement(totalMois) {
  if (totalMois < 6) {
    return { heures: 0, slabs: [], eligible: false };
  }

  const slabs = [];
  let heures = 0;

  // Slab 1: 0–60 months (first 5 years) → 96h/year
  const s1 = Math.min(totalMois, 60);
  if (s1 > 0) {
    const h = (s1 / 12) * 96;
    heures += h;
    slabs.push({ label: '0–5 ans', annees: +(s1/12).toFixed(4), taux: 96, heures: +h.toFixed(2) });
  }

  // Slab 2: 61–120 months (6–10 years) → 144h/year
  if (totalMois > 60) {
    const s2 = Math.min(totalMois - 60, 60);
    const h = (s2 / 12) * 144;
    heures += h;
    slabs.push({ label: '6–10 ans', annees: +(s2/12).toFixed(4), taux: 144, heures: +h.toFixed(2) });
  }

  // Slab 3: 121–180 months (11–15 years) → 192h/year
  if (totalMois > 120) {
    const s3 = Math.min(totalMois - 120, 60);
    const h = (s3 / 12) * 192;
    heures += h;
    slabs.push({ label: '11–15 ans', annees: +(s3/12).toFixed(4), taux: 192, heures: +h.toFixed(2) });
  }

  // Slab 4: >180 months (>15 years) → 240h/year
  if (totalMois > 180) {
    const s4 = totalMois - 180;
    const h = (s4 / 12) * 240;
    heures += h;
    slabs.push({ label: '> 15 ans', annees: +(s4/12).toFixed(4), taux: 240, heures: +h.toFixed(2) });
  }

  return { heures: +heures.toFixed(2), slabs, eligible: true };
}

/**
 * Damages for abusive dismissal (Art. 41)
 * 1.5 months salary per year, capped at 36 months total
 */
function calcDommagesInterets(salaireMensuel, totalMois) {
  if (totalMois === 0) return { moisCalc: 0, montant: 0, capped: false };

  const annees = totalMois / 12;
  const moisCalc = Math.min(annees * 1.5, 36);
  const montant = moisCalc * salaireMensuel;
  return {
    moisCalc: +moisCalc.toFixed(2),
    montant: +montant.toFixed(2),
    capped: annees * 1.5 > 36
  };
}

/**
 * Paid leave indemnity
 * 2.5 days per month worked (Art. 238)
 */
function calcConges(salaireMensuel, totalMois, joursNonPris) {
  // 2.5 days earned per month
  const joursAcquisTheoriques = +(totalMois * 2.5).toFixed(2);
  // Strictly 26 working days/month for daily rate
  const tauxJournalier = salaireMensuel / 26; 
  const montant = +(joursNonPris * tauxJournalier).toFixed(2);
  return {
    joursNonPris,
    joursAcquisTheoriques,
    tauxJournalier: +tauxJournalier.toFixed(2),
    montant
  };
}

/**
 * Main calculation entry point
 */
function calculate(inputs) {
  const {
    salaire,
    annees,
    mois: moisSup,
    categorie,
    conges: joursConges,
    abusif
  } = inputs;

  const totalMois = (annees * 12) + (moisSup || 0);
  const tauxHoraire = salaire / HEURES_MOIS;

  // 1. Préavis
  const preavis = getPreavis(categorie, totalMois);
  const montantPreavis = +(salaire * preavis.moisEquiv).toFixed(2);

  // 2. Licenciement
  const licData = calcHeuresLicenciement(totalMois);
  const montantLicenciement = licData.eligible
    ? +(licData.heures * tauxHoraire).toFixed(2)
    : 0;

  // 3. D&I (abusive dismissal)
  let diData = null;
  let montantDI = 0;
  if (abusif) {
    diData = calcDommagesInterets(salaire, totalMois);
    montantDI = diData.montant;
  }

  // 4. Congés payés
  const congesData = calcConges(salaire, totalMois, joursConges);
  const montantConges = congesData.montant;

  // Total
  const total = montantPreavis + montantLicenciement + montantDI + montantConges;

  return {
    inputs: { ...inputs, totalMois, tauxHoraire: +tauxHoraire.toFixed(2) },
    preavis: {
      ...preavis,
      montant: montantPreavis
    },
    licenciement: {
      ...licData,
      tauxHoraire: +tauxHoraire.toFixed(2),
      montant: montantLicenciement
    },
    di: abusif ? { ...diData, montant: montantDI } : null,
    conges: congesData,
    total: +total.toFixed(2),
    taxExempt: montantLicenciement + montantDI <= 1_000_000
  };
}

// Expose to global scope (no module bundler needed)
window.CDICalculator = { calculate };