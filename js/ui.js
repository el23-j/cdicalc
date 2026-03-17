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

})();