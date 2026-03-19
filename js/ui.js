/**
 * ui.js
 * DOM controller — form interaction, rendering results, validation
 */

(function () {
  'use strict';

  // ── Helpers ───────────────────────────────────────────────────────────────

  const $ = (id) => document.getElementById(id);
  const fmt = (n) => new Intl.NumberFormat('fr-MA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n) + ' MAD';
  const fmtN = (n) => new Intl.NumberFormat('fr-MA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

  function ancienneteLabel(totalMois) {
    const ans = Math.floor(totalMois / 12);
    const m = totalMois % 12;
    const parts = [];
    if (ans > 0) parts.push(ans + ' an' + (ans > 1 ? 's' : ''));
    if (m > 0) parts.push(m + ' mois');
    if (parts.length === 0) return '0 mois';
    return parts.join(' et ');
  }

  // ── State ─────────────────────────────────────────────────────────────────

  let abusif = false;
  let preavisTravaille = false;

  // ── Abusif & Preavis toggles ──────────────────────────────────────────────

  const btnNon = $('abusif-non');
  const btnOui = $('abusif-oui');

  btnNon.addEventListener('click', () => {
    abusif = false;
    btnNon.classList.add('active');
    btnOui.classList.remove('active');
  });
  btnOui.addEventListener('click', () => {
    abusif = true;
    btnOui.classList.add('active');
    btnNon.classList.remove('active');
  });

  const btnPreNon = document.getElementById('preavis-non');
  const btnPreOui = document.getElementById('preavis-oui');

  if (btnPreNon && btnPreOui) {
    btnPreNon.addEventListener('click', () => {
      preavisTravaille = false;
      btnPreNon.classList.add('active');
      btnPreOui.classList.remove('active');
    });
    btnPreOui.addEventListener('click', () => {
      preavisTravaille = true;
      btnPreOui.classList.add('active');
      btnPreNon.classList.remove('active');
    });
  }

  // ── Ancienneté live display ────────────────────────────────────────────────

  function updateAncienneteDisplay() {
    const a = parseInt($('annees').value) || 0;
    const m = parseInt($('mois').value) || 0;
    const totalMois = a * 12 + m;
    const disp = $('anciennete-display');
    if (totalMois < 6) {
      disp.textContent = ancienneteLabel(totalMois) + ' — ⚠ Moins de 6 mois : pas d\'indemnité de licenciement';
      disp.classList.add('warn');
    } else {
      disp.textContent = ancienneteLabel(totalMois) + ' d\'ancienneté';
      disp.classList.remove('warn');
    }
  }

  $('annees').addEventListener('input', updateAncienneteDisplay);
  $('mois').addEventListener('input', updateAncienneteDisplay);
  updateAncienneteDisplay();

  // ── Validation ────────────────────────────────────────────────────────────

  function validate(inputs) {
    const errors = [];
    if (!inputs.salaire || inputs.salaire <= 0) errors.push('Le salaire mensuel brut doit être supérieur à 0.');
    if (inputs.annees < 0) errors.push('Les années d\'ancienneté ne peuvent pas être négatives.');
    if (inputs.mois < 0 || inputs.mois > 11) errors.push('Les mois supplémentaires doivent être entre 0 et 11.');
    if (inputs.conges < 0) errors.push('Les congés non pris ne peuvent pas être négatifs.');
    return errors;
  }

  function showErrors(errors) {
    let el = document.querySelector('.form-errors');
    if (!el) {
      el = document.createElement('div');
      el.className = 'form-errors';
      $('calc-form').prepend(el);
    }
    el.innerHTML = errors.map(e => `<p>⚠ ${e}</p>`).join('');
    el.style.display = 'block';
  }

  function clearErrors() {
    const el = document.querySelector('.form-errors');
    if (el) el.style.display = 'none';
  }

  // ── Render Results ────────────────────────────────────────────────────────

  function renderSummary(result) {
    const grid = $('summary-grid');
    const items = [
      { label: 'Indemnité de préavis', value: fmt(result.preavis.montant), color: 'blue' },
      { label: 'Indemnité de licenciement', value: result.licenciement.eligible ? fmt(result.licenciement.montant) : 'Non éligible', color: result.licenciement.eligible ? 'green' : 'muted' },
      ...(result.di ? [{ label: 'Dommages & intérêts', value: fmt(result.di.montant), color: 'amber' }] : []),
      { label: 'Congés payés non pris', value: result.conges.joursNonPris > 0 ? fmt(result.conges.montant) : '0,00 MAD', color: 'teal' },
      { label: 'TOTAL ESTIMÉ', value: fmt(result.total), color: 'total', large: true }
    ];

    grid.innerHTML = items.map(item => `
      <div class="summary-card color-${item.color}${item.large ? ' card-total' : ''}">
        <div class="card-label">${item.label}</div>
        <div class="card-value">${item.value}</div>
      </div>
    `).join('');
  }

  function renderBreakdown(result) {
    const container = $('breakdown-cards');
    const r = result;
    const inp = r.inputs;

    const cards = [];

    // — Préavis
    cards.push({
      num: '01',
      title: 'Indemnité de préavis',
      ref: 'Art. 51 + Décret 2-04-469',
      color: 'blue',
      rows: [
        ['Catégorie', inp.categorie === 'cadre' ? 'Cadre' : 'Non-cadre'],
        ['Ancienneté totale', ancienneteLabel(inp.totalMois)],
        ['Délai de préavis', r.preavis.label],
        ['Statut', inp.preavisTravaille ? 'Préavis effectué' : 'Préavis non effectué (dispensé)'],
        ['Calcul', inp.preavisTravaille ? '0 MAD (payé en salaire normal)' : `${fmt(inp.salaire)} × ${fmtN(r.preavis.moisEquiv)} mois`],
      ],
      total: fmt(r.preavis.montant),
      note: 'L\'indemnité de préavis est imposable (IR).'
    });

    // — Licenciement
    const licRows = [
      ['Salaire mensuel brut', fmt(inp.salaire)],
      ['Heures standard/mois', '191 heures (Art. 184)'],
      ['Taux horaire', `${fmt(inp.salaire)} ÷ 191 = ${fmtN(inp.tauxHoraire)} MAD/h`],
    ];

    if (r.licenciement.eligible && r.licenciement.slabs.length > 0) {
      r.licenciement.slabs.forEach(s => {
        licRows.push([
          `Tranche ${s.label}`,
          `${fmtN(s.annees)} an(s) × ${s.taux} h/an = ${fmtN(s.heures)} h`
        ]);
      });
      licRows.push(['Total heures', `${fmtN(r.licenciement.heures)} heures`]);
      licRows.push(['Calcul final', `${fmtN(r.licenciement.heures)} h × ${fmtN(inp.tauxHoraire)} MAD/h`]);
    } else if (!r.licenciement.eligible) {
      licRows.push(['Statut', '⚠ Ancienneté inférieure à 6 mois — non éligible']);
    }

    cards.push({
      num: '02',
      title: 'Indemnité de licenciement',
      ref: 'Art. 52–53',
      color: r.licenciement.eligible ? 'green' : 'muted',
      rows: licRows,
      total: r.licenciement.eligible ? fmt(r.licenciement.montant) : 'Non applicable',
      note: 'Exonérée d\'IR jusqu\'à 1 000 000 MAD (Loi de Finances 2023).'
    });

    // — D&I
    if (r.di) {
      const anneesTotales = +(inp.totalMois / 12).toFixed(2);
      cards.push({
        num: '03',
        title: 'Dommages & intérêts',
        ref: 'Art. 41 — Licenciement abusif',
        color: 'amber',
        rows: [
          ['Motif', 'Licenciement sans motif valable ou procédure irrégulière'],
          ['Ancienneté', `${fmtN(anneesTotales)} ans`],
          ['Barème', '1,5 mois de salaire par année'],
          ['Mois calculés', `${fmtN(anneesTotales)} × 1,5 = ${fmtN(r.di.moisCalc)} mois${r.di.capped ? ' (plafonné à 36 mois)' : ''}`],
          ['Calcul', `${fmtN(r.di.moisCalc)} mois × ${fmt(inp.salaire)}`],
        ],
        total: fmt(r.di.montant),
        note: r.di.capped ? 'Plafonné à 36 mois de salaire (Art. 41).' : 'Plafond de 36 mois non atteint.'
      });
    }

    // — Congés
    cards.push({
      num: r.di ? '04' : '03',
      title: 'Congés payés non pris',
      ref: 'Art. 238',
      color: 'teal',
      rows: [
        ['Jours de congé non pris', `${r.conges.joursNonPris} jour(s)`],
        ['Jours théoriquement acquis', `${inp.totalMois} mois × 2,5 j/mois = ${fmtN(r.conges.joursAcquisTheoriques)} jours`],
        ['Salaire journalier', `${fmt(inp.salaire)} ÷ 26 jours = ${fmtN(r.conges.tauxJournalier)} MAD/jour`],
        ['Calcul', `${r.conges.joursNonPris} j × ${fmtN(r.conges.tauxJournalier)} MAD/jour`],
      ],
      total: r.conges.joursNonPris > 0 ? fmt(r.conges.montant) : '0,00 MAD',
      note: 'Seuls les jours non pris réels sont indemnisés. Vérifiez avec votre employeur le solde exact.'
    });

    container.innerHTML = cards.map(card => `
      <div class="breakdown-card bc-${card.color}">
        <div class="bc-header">
          <div class="bc-num">${card.num}</div>
          <div>
            <div class="bc-title">${card.title}</div>
            <div class="bc-ref">${card.ref}</div>
          </div>
          <div class="bc-amount">${card.total}</div>
        </div>
        <table class="bc-table">
          ${card.rows.map(([k, v]) => `<tr><td class="bc-key">${k}</td><td class="bc-val">${v}</td></tr>`).join('')}
        </table>
        <div class="bc-note">${card.note}</div>
      </div>
    `).join('');
  }

  function renderFormulas(result) {
    const grid = $('formula-grid');
    const inp = result.inputs;
    grid.innerHTML = `
      <div class="formula-item"><span class="fi-key">Taux horaire</span><code class="fi-val">${fmt(inp.salaire)} ÷ 191 h = ${fmtN(inp.tauxHoraire)} MAD/h</code></div>
      <div class="formula-item"><span class="fi-key">Salaire journalier</span><code class="fi-val">${fmt(inp.salaire)} ÷ 26 j = ${fmtN(inp.salaire/26)} MAD/j</code></div>
      <div class="formula-item"><span class="fi-key">Ancienneté totale</span><code class="fi-val">${ancienneteLabel(inp.totalMois)} (${inp.totalMois} mois)</code></div>
      <div class="formula-item"><span class="fi-key">Catégorie</span><code class="fi-val">${inp.categorie === 'cadre' ? 'Cadre' : 'Non-cadre (employé/ouvrier)'}</code></div>
    `;
  }

  function renderTaxNote(result) {
    const el = $('tax-note');
    const licMontant = result.licenciement.montant;
    const diMontant = result.di ? result.di.montant : 0;
    const exemptBase = licMontant + diMontant;
    el.innerHTML = `
      <div class="tax-icon">ℹ</div>
      <div>
        <strong>Fiscalité (Loi de Finances 2023)</strong><br/>
        Les indemnités de licenciement et dommages &amp; intérêts sont <strong>exonérées d'impôt sur le revenu (IR) jusqu'à 1 000 000 MAD</strong>.
        Dans votre cas, la base potentiellement exonérée s'élève à <strong>${fmt(exemptBase)}</strong> ${exemptBase <= 1_000_000 ? '— <span style="color:var(--green)">intégralement exonérée</span>' : '— <span style="color:var(--amber)">dépasse le plafond : l\'excédent est imposable</span>'}.
        <br/>L'indemnité de préavis reste toujours imposable à l'IR.
      </div>
    `;
  }

  // ── Form Submit ───────────────────────────────────────────────────────────

  $('btn-calculate').addEventListener('click', function (e) {
    e.preventDefault();
    clearErrors();

    const form = $('calc-form');
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const inputs = {
      salaire: parseFloat($('salaire').value) || 0,
      annees: parseInt($('annees').value) || 0,
      mois: parseInt($('mois').value) || 0,
      categorie: $('categorie').value,
      conges: parseFloat($('conges').value) || 0,
      abusif,
      preavisTravaille
    };

    const errors = validate(inputs);
    if (errors.length) {
      showErrors(errors);
      return;
    }

    const result = window.CDICalculator.calculate(inputs);

    // Render
    renderSummary(result);
    renderBreakdown(result);
    renderFormulas(result);
    renderTaxNote(result);

    // Show results
    $('results-placeholder').classList.add('hidden');
    $('results-content').classList.remove('hidden');

    // Scroll to results on mobile
    if (window.innerWidth < 900) {
      $('results-panel').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });

  // ── Reset ─────────────────────────────────────────────────────────────────

  $('btn-reset').addEventListener('click', function () {
    $('calc-form').reset();
    abusif = false;
    btnNon.classList.add('active');
    btnOui.classList.remove('active');
    preavisTravaille = false;
    btnPreNon.classList.add('active');
    btnPreOui.classList.remove('active');
    $('results-content').classList.add('hidden');
    $('results-placeholder').classList.remove('hidden');
    clearErrors();
    updateAncienneteDisplay();
  });

  $('btn-modify').addEventListener('click', function () {
    if (window.innerWidth < 900) {
      $('form-panel').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });

  // ── Extensions (Tabs & New Modules) ───────────────────────────────────────

  function showErrorsFor(formId, errors) {
    const form = $(formId);
    let el = form.querySelector('.form-errors');
    if (!el) {
      el = document.createElement('div');
      el.className = 'form-errors';
      form.prepend(el);
    }
    el.innerHTML = errors.map(e => `<p>⚠ ${e}</p>`).join('');
    el.style.display = 'block';
  }

  function clearErrorsFor(formId) {
    const el = $(formId).querySelector('.form-errors');
    if (el) el.style.display = 'none';
  }

  // Tabs
  document.querySelectorAll('.module-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.module-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.module-panel').forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      const target = 'panel-' + tab.getAttribute('data-module');
      const panel = $(target);
      if (panel) panel.classList.add('active');
    });
  });

  // ── CDD ───────────────────────────────────────────────────────────────────
  let cddInitPar = 'employeur';
  const cddEmp = $('cdd-init-employeur');
  const cddEmpie = $('cdd-init-employe');
  if (cddEmp && cddEmpie) {
    cddEmp.addEventListener('click', () => { cddInitPar = 'employeur'; cddEmp.classList.add('active'); cddEmpie.classList.remove('active'); });
    cddEmpie.addEventListener('click', () => { cddInitPar = 'employe'; cddEmpie.classList.add('active'); cddEmp.classList.remove('active'); });
  }

  function renderCdd(r) {
    $('summary-grid-cdd').innerHTML = `
      <div class="summary-card color-${r.salairesRestants.montant > 0 ? 'amber' : 'muted'}">
        <div class="card-label">Salaires restants</div>
        <div class="card-value">${r.salairesRestants.owesEmployer ? "Dûs à l'employeur" : fmt(r.salairesRestants.montant)}</div>
      </div>
      <div class="summary-card color-teal">
        <div class="card-label">Congés payés (${r.conges.jours} j)</div>
        <div class="card-value">${fmt(r.conges.montant)}</div>
      </div>
      <div class="summary-card card-total color-green">
        <div class="card-label">TOTAL ESTIMÉ À RECEVOIR</div>
        <div class="card-value">${fmt(r.total)}</div>
      </div>
    `;

    $('breakdown-cards-cdd').innerHTML = `
      <div class="breakdown-card bc-blue">
        <div class="bc-header"><div class="bc-num">01</div><div><div class="bc-title">Salaires restants</div><div class="bc-ref">Art. 33</div></div><div class="bc-amount">${r.salairesRestants.owesEmployer ? '0,00 MAD' : fmt(r.salairesRestants.montant)}</div></div>
        <table class="bc-table">
          <tr><td class="bc-key">Initiative rupture</td><td class="bc-val">${r.inputs.initPar === 'employeur' ? 'Employeur' : 'Employé'}</td></tr>
          <tr><td class="bc-key">Mois restants</td><td class="bc-val">${r.moisRestants} mois</td></tr>
          <tr><td class="bc-key">Calcul</td><td class="bc-val">${r.inputs.initPar === 'employeur' ? `${r.moisRestants} mois × ${fmt(r.inputs.salaire)}` : 'Non applicable pour réception'}</td></tr>
        </table>
        <div class="bc-note">${r.salairesRestants.owesEmployer ? "L'employé qui rompt le CDD prématurément peut devoir verser à l'employeur des dommages-intérêts (équivalents aux mois restants)." : "L'employeur doit verser l'intégralité des salaires restants jusqu'au terme du contrat."}</div>
      </div>
      <div class="breakdown-card bc-teal">
        <div class="bc-header"><div class="bc-num">02</div><div><div class="bc-title">Congés Payés</div><div class="bc-ref">Art. 238</div></div><div class="bc-amount">${fmt(r.conges.montant)}</div></div>
        <table class="bc-table">
          <tr><td class="bc-key">Jours non pris</td><td class="bc-val">${r.conges.jours} j</td></tr>
          <tr><td class="bc-key">Taux journalier</td><td class="bc-val">${fmtN(r.tauxJournalier)} MAD/j</td></tr>
          <tr><td class="bc-key">Calcul</td><td class="bc-val">${r.conges.jours} j × ${fmtN(r.tauxJournalier)} MAD/j</td></tr>
        </table>
      </div>
    `;
  }

  const formCdd = $('calc-form-cdd');
  if (formCdd) {
    $('btn-calculate-cdd').addEventListener('click', (e) => {
      e.preventDefault(); clearErrorsFor('calc-form-cdd');
      if (!formCdd.checkValidity()) { formCdd.reportValidity(); return; }
      const inputs = {
        salaire: parseFloat($('cdd-salaire').value) || 0,
        totalDuree: parseInt($('cdd-total-duree').value) || 0,
        moisTravailles: parseInt($('cdd-mois-travailles').value) || 0,
        initPar: cddInitPar,
        conges: parseFloat($('cdd-conges').value) || 0
      };
      const errors = [];
      if (inputs.salaire <= 0) errors.push('Le salaire doit être > 0.');
      if (inputs.totalDuree > 24) errors.push("La durée totale maximale d'un CDD est de 24 mois selon l'Art. 16.");
      if (errors.length) { showErrorsFor('calc-form-cdd', errors); return; }
      
      const res = window.CDICalculator.calcCDD(inputs);
      renderCdd(res);
      $('results-placeholder-cdd').classList.add('hidden');
      $('results-content-cdd').classList.remove('hidden');
      if (window.innerWidth < 900) $('panel-cdd').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    $('btn-reset-cdd').addEventListener('click', () => {
      formCdd.reset(); cddInitPar = 'employeur'; cddEmp.classList.add('active'); cddEmpie.classList.remove('active');
      $('results-content-cdd').classList.add('hidden'); $('results-placeholder-cdd').classList.remove('hidden');
      clearErrorsFor('calc-form-cdd');
    });
  }

  // ── DÉPART VOLONTAIRE ─────────────────────────────────────────────────────
  function renderDepart(r) {
    $('summary-grid-depart').innerHTML = `
      <div class="summary-card color-blue">
        <div class="card-label">Préavis</div>
        <div class="card-value">${fmt(r.preavis.montant)}</div>
      </div>
      <div class="summary-card color-${r.licenciement.montant > 0 ? 'green' : 'muted'}">
        <div class="card-label">Indemnité de départ</div>
        <div class="card-value">${r.licenciement.montant > 0 ? fmt(r.licenciement.montant) : '0,00 MAD'}</div>
      </div>
      <div class="summary-card color-teal">
        <div class="card-label">Congés payés</div>
        <div class="card-value">${fmt(r.conges.montant)}</div>
      </div>
      <div class="summary-card card-total color-green">
        <div class="card-label">TOTAL ESTIMÉ</div>
        <div class="card-value">${fmt(r.total)}</div>
      </div>
    `;

    $('breakdown-cards-depart').innerHTML = `
      <div class="breakdown-card bc-blue">
        <div class="bc-header"><div class="bc-num">01</div><div><div class="bc-title">Préavis & Départ</div><div class="bc-ref">Art. 51-53, 526</div></div><div class="bc-amount">${fmt(r.licenciement.montant + r.preavis.montant)}</div></div>
        <table class="bc-table">
          <tr><td class="bc-key">Motif</td><td class="bc-val">${r.motif === 'demission' ? 'Démission' : (r.motif === 'retraite_legale' ? 'Retraite légale' : 'Retraite anticipée')}</td></tr>
          <tr><td class="bc-key">Taux d'indemnité relative au CDI</td><td class="bc-val">${r.motif === 'demission' ? '0%' : (r.motif === 'retraite_legale' ? '60%' : '100%')}</td></tr>
        </table>
        <div class="bc-note">${r.motif === 'demission' ? "La démission ne donne droit à aucune indemnité de départ ou de préavis du côté de l'employeur." : (r.motif === 'retraite_legale' ? "Le départ à la retraite légale ouvre droit à une indemnité équivalente à 60% de l'indemnité de licenciement (Art. 526)." : "La retraite anticipée à l'initiative de l'employeur donne droit à 100% de l'indemnité de licenciement de base plus le préavis.")}</div>
      </div>
      <div class="breakdown-card bc-teal">
        <div class="bc-header"><div class="bc-num">02</div><div><div class="bc-title">Congés Payés</div><div class="bc-ref">Art. 238</div></div><div class="bc-amount">${fmt(r.conges.montant)}</div></div>
        <table class="bc-table">
          <tr><td class="bc-key">Jours non pris</td><td class="bc-val">${r.conges.joursNonPris} j</td></tr>
          <tr><td class="bc-key">Calcul</td><td class="bc-val">${r.conges.joursNonPris} j × ${fmtN(r.conges.tauxJournalier)} MAD/j</td></tr>
        </table>
      </div>
    `;
  }

  const formDepart = $('calc-form-depart');
  if (formDepart) {
    $('btn-calculate-depart').addEventListener('click', (e) => {
      e.preventDefault(); clearErrorsFor('calc-form-depart');
      if (!formDepart.checkValidity()) { formDepart.reportValidity(); return; }
      const inputs = {
        salaire: parseFloat($('depart-salaire').value) || 0,
        annees: parseInt($('depart-annees').value) || 0,
        mois: parseInt($('depart-mois').value) || 0,
        categorie: $('depart-categorie').value,
        motif: $('depart-motif').value,
        conges: parseFloat($('depart-conges').value) || 0
      };
      const res = window.CDICalculator.calcDepartVolontaire(inputs);
      renderDepart(res);
      $('results-placeholder-depart').classList.add('hidden');
      $('results-content-depart').classList.remove('hidden');
      if (window.innerWidth < 900) $('panel-depart').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    $('btn-reset-depart').addEventListener('click', () => {
      formDepart.reset();
      $('results-content-depart').classList.add('hidden'); $('results-placeholder-depart').classList.remove('hidden');
      clearErrorsFor('calc-form-depart');
    });
  }

  // ── CNSS ──────────────────────────────────────────────────────────────────
  function renderCnss(r) {
    $('summary-grid-cnss').innerHTML = `
      <div class="summary-card color-blue">
        <div class="card-label">Part Salariale (Employé)</div>
        <div class="card-value">${fmt(r.totalEmp)}</div>
      </div>
      <div class="summary-card color-amber">
        <div class="card-label">Part Patronale (Employeur)</div>
        <div class="card-value">${fmt(r.totalPat)}</div>
      </div>
      <div class="summary-card card-total color-teal">
        <div class="card-label">Coût Global par salarié</div>
        <div class="card-value">${fmt(r.totalPat + r.inputs.salaire)}</div>
      </div>
    `;

    const b = r.branches;
    $('breakdown-cards-cnss').innerHTML = `
      ${['Allocations Familiales|allocations', 'AMO (Assurance Maladie)|amo', 'Vieillesse & Invalidité|vieillesse', 'Accidents du Travail|accidents'].map(str => {
        const [title, key] = str.split('|');
        const d = b[key];
        return `
          <div class="breakdown-card bc-blue">
            <div class="bc-header"><div class="bc-num">${key.toUpperCase().substring(0,3)}</div><div><div class="bc-title">${title}</div></div><div class="bc-amount">${fmt(d.amountEmp + d.amountPat)}</div></div>
            <table class="bc-table">
              <tr><td class="bc-key">Base de calcul</td><td class="bc-val">${fmt(d.base)}${d.cap ? ' (Plafond ' + d.cap + ' appliqué)' : ''}</td></tr>
              <tr><td class="bc-key">Part Salariale (${d.rateEmp}%)</td><td class="bc-val">${fmt(d.amountEmp)}</td></tr>
              <tr><td class="bc-key">Part Patronale (${d.ratePat}%)</td><td class="bc-val">${fmt(d.amountPat)}</td></tr>
            </table>
          </div>
        `;
      }).join('')}
    `;
  }

  const formCnss = $('calc-form-cnss');
  if (formCnss) {
    $('btn-calculate-cnss').addEventListener('click', (e) => {
      e.preventDefault(); clearErrorsFor('calc-form-cnss');
      if (!formCnss.checkValidity()) { formCnss.reportValidity(); return; }
      const inputs = {
        salaire: parseFloat($('cnss-salaire').value) || 0,
        employes: parseInt($('cnss-employes').value) || 1
      };
      const res = window.CDICalculator.calcCNSS(inputs);
      renderCnss(res);
      $('results-placeholder-cnss').classList.add('hidden');
      $('results-content-cnss').classList.remove('hidden');
      if (window.innerWidth < 900) $('panel-cnss').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    $('btn-reset-cnss').addEventListener('click', () => {
      formCnss.reset();
      $('results-content-cnss').classList.add('hidden'); $('results-placeholder-cnss').classList.remove('hidden');
      clearErrorsFor('calc-form-cnss');
    });
  }

  // ── IGR ───────────────────────────────────────────────────────────────────
  let igrMarie = false;
  const igrMarieNon = $('igr-marie-non');
  const igrMarieOui = $('igr-marie-oui');
  if (igrMarieNon && igrMarieOui) {
    igrMarieNon.addEventListener('click', () => { igrMarie = false; igrMarieNon.classList.add('active'); igrMarieOui.classList.remove('active'); });
    igrMarieOui.addEventListener('click', () => { igrMarie = true; igrMarieOui.classList.add('active'); igrMarieNon.classList.remove('active'); });
  }

  function renderIgr(r) {
    $('summary-grid-igr').innerHTML = `
      <div class="summary-card color-blue">
        <div class="card-label">IR Mensuel à prélever</div>
        <div class="card-value">${fmt(r.irMensuel)}</div>
      </div>
      <div class="summary-card color-amber">
        <div class="card-label">Taux effectif (IR / Salaire)</div>
        <div class="card-value">${fmtN(r.tauxEffectif)}%</div>
      </div>
      <div class="summary-card color-teal">
        <div class="card-label">Cotisation CNSS retenue</div>
        <div class="card-value">${fmt(r.cnss)}</div>
      </div>
      <div class="summary-card card-total color-green">
        <div class="card-label">SALAIRE NET MENSUEL ESTIMÉ</div>
        <div class="card-value">${fmt(r.salaireNet)}</div>
      </div>
    `;

    $('breakdown-cards-igr').innerHTML = `
      <div class="breakdown-card bc-blue">
        <div class="bc-header"><div class="bc-num">01</div><div><div class="bc-title">Calcul RNI et Barème</div><div class="bc-ref">CGI Art. 73</div></div><div class="bc-amount">Tranche ${r.trancheRate}%</div></div>
        <table class="bc-table">
          <tr><td class="bc-key">Frais Professionnels</td><td class="bc-val">- ${fmt(r.fraisPro)} (Max 20% plafonné)</td></tr>
          <tr><td class="bc-key">Revenu Net Imposable Mensuel</td><td class="bc-val">${fmt(r.rniMensuel)}</td></tr>
          <tr><td class="bc-key">Revenu Net Imposable Annuel</td><td class="bc-val">${fmt(r.rniAnnuel)}</td></tr>
          <tr><td class="bc-key">Taux du Barème</td><td class="bc-val">${r.trancheRate}%</td></tr>
          <tr><td class="bc-key">Somme à déduire</td><td class="bc-val">- ${fmt(r.deductionTranche)} MAD</td></tr>
          <tr><td class="bc-key">IR Brut Annuel</td><td class="bc-val">${fmt(r.irBrutAnnuel)}</td></tr>
        </table>
      </div>
      <div class="breakdown-card bc-teal">
        <div class="bc-header"><div class="bc-num">02</div><div><div class="bc-title">Charges de Famille & Net</div></div><div class="bc-amount">${fmt(r.irNetAnnuel)} / an</div></div>
        <table class="bc-table">
          <tr><td class="bc-key">Personnes à charge</td><td class="bc-val">${r.chargesTotales} (${r.inputs.enfants} enf. + ${r.inputs.marie ? '1 conjoint' : '0'})</td></tr>
          <tr><td class="bc-key">Réduction (360 MAD/personne/an)</td><td class="bc-val">- ${fmt(r.reductionFamille)}</td></tr>
          <tr><td class="bc-key">IR Net Mensuel final</td><td class="bc-val">${fmt(r.irMensuel)}</td></tr>
        </table>
      </div>
    `;
  }

  const formIgr = $('calc-form-igr');
  if (formIgr) {
    $('btn-calculate-igr').addEventListener('click', (e) => {
      e.preventDefault(); clearErrorsFor('calc-form-igr');
      if (!formIgr.checkValidity()) { formIgr.reportValidity(); return; }
      const inputs = {
        salaire: parseFloat($('igr-salaire').value) || 0,
        cnssForce: parseFloat($('igr-cnss').value) || 0,
        pension: parseFloat($('igr-pension').value) || 0,
        enfants: parseInt($('igr-enfants').value) || 0,
        marie: igrMarie
      };
      const res = window.CDICalculator.calcIGR(inputs);
      renderIgr(res);
      $('results-placeholder-igr').classList.add('hidden');
      $('results-content-igr').classList.remove('hidden');
      if (window.innerWidth < 900) $('panel-igr').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    $('btn-reset-igr').addEventListener('click', () => {
      formIgr.reset(); igrMarie = false; igrMarieNon.classList.add('active'); igrMarieOui.classList.remove('active');
      $('results-content-igr').classList.add('hidden'); $('results-placeholder-igr').classList.remove('hidden');
      clearErrorsFor('calc-form-igr');
    });
  }

})();