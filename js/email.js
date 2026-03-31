(function () {
  'use strict';

  const moduleNames = {
    net2brut: 'Net vers Brut',
    cdi: 'Rupture CDI',
    cdd: 'Rupture CDD',
    depart: 'Départ volontaire',
    cnss: 'Cotisations CNSS',
    igr: 'Calcul IGR / IR'
  };

  const moneyFormatter = new Intl.NumberFormat('fr-MA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  const numberFormatter = new Intl.NumberFormat('fr-MA', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  });

  const $ = (id) => document.getElementById(id);

  function esc(value = '') {
    return String(value).replace(/[&<>"']/g, (char) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[char]));
  }

  function fmtMoney(value) {
    return `${moneyFormatter.format(Number(value) || 0)} MAD`;
  }

  function fmtNumber(value) {
    return numberFormatter.format(Number(value) || 0);
  }

  function asciiText(value = '') {
    return String(value)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\x20-\x7E]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function escapePdfText(value = '') {
    return asciiText(value)
      .replace(/\\/g, '\\\\')
      .replace(/\(/g, '\\(')
      .replace(/\)/g, '\\)');
  }

  function wrapText(text, maxLength = 82) {
    const words = asciiText(text).split(' ');
    const lines = [];
    let current = '';

    words.forEach((word) => {
      const candidate = current ? `${current} ${word}` : word;
      if (candidate.length > maxLength && current) {
        lines.push(current);
        current = word;
      } else {
        current = candidate;
      }
    });

    if (current) {
      lines.push(current);
    }

    return lines.length ? lines : [''];
  }

  function createPdfLines(model, lead) {
    const dateText = new Date().toLocaleDateString('fr-MA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const lines = [
      { text: `HuquqPro - ${model.title}`, bold: true, size: 18 },
      { text: `Date : ${dateText}`, size: 11 },
      { text: `Destinataire : ${lead.name || 'Utilisateur'} - ${lead.email}`, size: 11 },
      { text: '', size: 11 },
      { text: `${model.totalLabel} : ${model.totalValue}`, bold: true, size: 15 },
      { text: '', size: 11 },
      { text: 'Postes calculés', bold: true, size: 13 }
    ];

    model.summaryRows.forEach(([label, value]) => {
      wrapText(`${label} : ${value}`).forEach((line) => {
        lines.push({ text: line, size: 11 });
      });
    });

    lines.push({ text: '', size: 11 });
    lines.push({ text: 'Base de calcul', bold: true, size: 13 });

    model.metaRows.forEach(([label, value]) => {
      wrapText(`${label} : ${value}`).forEach((line) => {
        lines.push({ text: line, size: 11 });
      });
    });

    if (model.proofRows && model.proofRows.length) {
      lines.push({ text: '', size: 11 });
      lines.push({ text: 'Preuve de calcul', bold: true, size: 13 });

      model.proofRows.forEach(([label, value]) => {
        wrapText(`${label} : ${value}`).forEach((line) => {
          lines.push({ text: line, size: 11 });
        });
      });
    }

    if (model.assumptionRows && model.assumptionRows.length) {
      lines.push({ text: '', size: 11 });
      lines.push({ text: 'Hypothèses', bold: true, size: 13 });

      model.assumptionRows.forEach((value) => {
        wrapText(`- ${value}`).forEach((line) => {
          lines.push({ text: line, size: 11 });
        });
      });
    }

    lines.push({ text: '', size: 11 });
    lines.push({ text: 'Référence juridique', bold: true, size: 13 });
    wrapText(model.legalNote).forEach((line) => {
      lines.push({ text: line, size: 11 });
    });

    lines.push({ text: '', size: 11 });
    wrapText('Simulation indicative uniquement. Ne constitue pas un avis juridique ou fiscal.').forEach((line) => {
      lines.push({ text: line, size: 10 });
    });

    return lines;
  }

  function paginatePdfLines(lines) {
    const pages = [];
    let page = [];
    let y = 790;

    lines.forEach((line) => {
      const lineHeight = line.size >= 15 ? 24 : line.bold ? 20 : 16;
      if (y - lineHeight < 52) {
        pages.push(page);
        page = [];
        y = 790;
      }

      page.push({ ...line, x: 52, y });
      y -= lineHeight;
    });

    if (page.length) {
      pages.push(page);
    }

    return pages;
  }

  function buildPdfBase64(model, lead) {
    const lines = createPdfLines(model, lead);
    const pages = paginatePdfLines(lines);
    const objects = [null];

    function addObject(content) {
      objects.push(content);
      return objects.length - 1;
    }

    const catalogId = addObject(null);
    const pagesId = addObject(null);
    const regularFontId = addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
    const boldFontId = addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>');
    const pageIds = [];

    pages.forEach((pageLines) => {
      const stream = pageLines.map((line) => {
        const fontKey = line.bold ? 'F2' : 'F1';
        return `BT /${fontKey} ${line.size} Tf 1 0 0 1 ${line.x} ${line.y} Tm (${escapePdfText(line.text)}) Tj ET`;
      }).join('\n');

      const contentId = addObject(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
      const pageId = addObject(
        `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${regularFontId} 0 R /F2 ${boldFontId} 0 R >> >> /Contents ${contentId} 0 R >>`
      );
      pageIds.push(pageId);
    });

    objects[pagesId] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`;
    objects[catalogId] = `<< /Type /Catalog /Pages ${pagesId} 0 R >>`;

    let pdf = '%PDF-1.4\n';
    const offsets = [0];

    for (let index = 1; index < objects.length; index += 1) {
      offsets[index] = pdf.length;
      pdf += `${index} 0 obj\n${objects[index]}\nendobj\n`;
    }

    const xrefOffset = pdf.length;
    pdf += `xref\n0 ${objects.length}\n`;
    pdf += '0000000000 65535 f \n';

    for (let index = 1; index < objects.length; index += 1) {
      pdf += `${String(offsets[index]).padStart(10, '0')} 00000 n \n`;
    }

    pdf += `trailer\n<< /Size ${objects.length} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

    return btoa(pdf);
  }

  function buildHtmlEmail(model, lead) {
    const summaryRows = model.summaryRows.map(([label, value]) => `
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #e1e8ef;"><strong>${esc(label)}</strong></td>
        <td style="padding:10px 0;border-bottom:1px solid #e1e8ef;text-align:right;">${esc(value)}</td>
      </tr>
    `).join('');

    const metaRows = model.metaRows.map(([label, value]) => `
      <li style="margin-bottom:8px;"><strong>${esc(label)} :</strong> ${esc(value)}</li>
    `).join('');

    const proofRows = (model.proofRows || []).map(([label, value]) => `
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #e1e8ef;"><strong>${esc(label)}</strong></td>
        <td style="padding:10px 0;border-bottom:1px solid #e1e8ef;text-align:right;">${esc(value)}</td>
      </tr>
    `).join('');

    const assumptionRows = (model.assumptionRows || []).map((value) => `
      <li style="margin-bottom:8px;">${esc(value)}</li>
    `).join('');

    return `
      <div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;color:#16283b;">
        <div style="background:#0f2233;color:#f8fbfd;padding:24px;border-radius:18px 18px 0 0;">
          <div style="font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#9ed7e8;">HuquqPro</div>
          <h1 style="margin:12px 0 0;font-size:24px;">${esc(model.title)}</h1>
          <p style="margin:8px 0 0;color:#d7e6ef;">Bonjour ${esc(lead.name || 'Utilisateur')}, voici votre simulation détaillée.</p>
        </div>
        <div style="padding:24px;border:1px solid #d7e2ec;border-top:0;border-radius:0 0 18px 18px;background:#ffffff;">
          <div style="padding:16px 18px;background:#eef4fb;border-radius:14px;margin-bottom:22px;">
            <strong style="display:block;font-size:14px;color:#0f6a86;">${esc(model.totalLabel)}</strong>
            <span style="display:block;font-size:24px;margin-top:6px;">${esc(model.totalValue)}</span>
          </div>
          <table style="width:100%;border-collapse:collapse;margin-bottom:22px;">
            ${summaryRows}
          </table>
          <h2 style="font-size:18px;margin:0 0 12px;">Base de calcul</h2>
          <ul style="padding-left:18px;color:#5e7287;margin:0 0 22px;">
            ${metaRows}
          </ul>
          ${proofRows ? `
            <h2 style="font-size:18px;margin:0 0 12px;">Preuve de calcul</h2>
            <table style="width:100%;border-collapse:collapse;margin-bottom:22px;">
              ${proofRows}
            </table>
          ` : ''}
          ${assumptionRows ? `
            <h2 style="font-size:18px;margin:0 0 12px;">Hypothèses</h2>
            <ul style="padding-left:18px;color:#5e7287;margin:0 0 22px;">
              ${assumptionRows}
            </ul>
          ` : ''}
          <p style="margin:0;color:#5e7287;line-height:1.7;"><strong>Référence juridique :</strong> ${esc(model.legalNote)}</p>
          <p style="margin:16px 0 0;color:#5e7287;line-height:1.7;">Simulation indicative uniquement. Ne constitue pas un avis juridique ou fiscal.</p>
        </div>
      </div>
    `;
  }

  function buildPdfAndEmailFromModel(model, lead, moduleId) {
    const dateIso = new Date().toISOString().split('T')[0];
    return {
      base64Pdf: buildPdfBase64(model, lead),
      htmlEmail: buildHtmlEmail(model, lead),
      pdfFilename: `HuquqPro_${moduleId}_${dateIso}.pdf`
    };
  }

  function buildModuleModel(simulation) {
    const { moduleId, inputs, result } = simulation;
    const departMotifLabels = {
      demission: 'Démission',
      retraite_legale: 'Retraite légale',
      retraite_anticipee: 'Retraite anticipée (employeur)'
    };

    if (moduleId === 'net2brut') {
      const familySituation = inputs.marie ? 'Marie(e)' : 'Célibataire';
      return {
        title: 'Net vers Brut',
        totalLabel: 'Salaire brut estimé',
        totalValue: fmtMoney(result.salaireBrut),
        summaryRows: [
          ['Net reçu', fmtMoney(result.netCible)],
          ['Salaire brut estimé', fmtMoney(result.salaireBrut)],
          ['CNSS pension (4,48%)', fmtMoney(result.pensionCnss)],
          ['AMO (2,26%)', fmtMoney(result.amo)],
          ['IR mensuel', fmtMoney(result.irMensuel)],
          ['Net obtenu', fmtMoney(result.salaireNet)]
        ],
        metaRows: [
          ['Statut', inputs.statut === 'cadre' ? 'Cadre' : 'Non-cadre'],
          ['Situation familiale', familySituation],
          ['Pension complémentaire', fmtMoney(inputs.pension)],
          ['Enfants à charge', fmtNumber(inputs.enfants)],
          ['Frais professionnels', fmtMoney(result.fraisPro)],
          ['Base imposable mensuelle', fmtMoney(result.rniMensuel)],
          ['Tranche IR', `${fmtNumber(result.trancheRate)}%`]
        ],
        proofRows: [
          ['Salaire brut', fmtMoney(result.salaireBrut)],
          ['Moins CNSS pension', fmtMoney(result.pensionCnss)],
          ['Moins AMO', fmtMoney(result.amo)],
          ['Moins IR mensuel', fmtMoney(result.irMensuel)],
          ['Moins retenue complémentaire', fmtMoney(result.pension)],
          ['Égale au salaire net', fmtMoney(result.salaireNet)]
        ],
        assumptionRows: [
          'CNSS pension salariale à 4,48% plafonnée sur une base brute de 6 000 MAD.',
          'AMO salariale à 2,26% appliquée sur le brut non plafonné.',
          'Frais professionnels à 20% plafonnés à 2 500 MAD par mois.',
          'Réduction familiale appliquée selon la situation déclarée et le nombre d’enfants saisis.',
          'Cadre et non-cadre suivent ici les mêmes taux de base CNSS et AMO.'
        ],
        legalNote: 'Calcul inversé par dichotomie sur le barème marocain CNSS + IGR, avec preuve de recalcul avant -> après retenues.'
      };
    }

    if (moduleId === 'cdi') {
      return {
        title: 'Rupture CDI',
        totalLabel: 'Total estimé',
        totalValue: fmtMoney(result.total),
        summaryRows: [
          ['Indemnité de préavis', fmtMoney(result.preavis.montant)],
          ['Indemnité de licenciement', result.licenciement.eligible ? fmtMoney(result.licenciement.montant) : 'Non éligible'],
          ['Dommages et intérêts', result.di ? fmtMoney(result.di.montant) : 'Non applicable'],
          ['Congés payés', fmtMoney(result.conges.montant)]
        ],
        metaRows: [
          ['Salaire mensuel brut', fmtMoney(inputs.salaire)],
          ['Ancienneté', `${inputs.annees} an(s) et ${inputs.mois} mois`],
          ['Catégorie', inputs.categorie === 'cadre' ? 'Cadre' : 'Non-cadre'],
          ['Licenciement abusif', inputs.abusif ? 'Oui' : 'Non'],
          ['Préavis travaillé', inputs.preavisTravaille ? 'Oui' : 'Non']
        ],
        legalNote: 'Articles 41, 51, 52, 53 et 238 du Code du Travail marocain.'
      };
    }

    if (moduleId === 'cdd') {
      return {
        title: 'Rupture CDD',
        totalLabel: 'Total estimé à recevoir',
        totalValue: fmtMoney(result.total),
        summaryRows: [
          ['Salaires restants', result.salairesRestants.owesEmployer ? 'À la charge du salarié' : fmtMoney(result.salairesRestants.montant)],
          ['Congés payés', fmtMoney(result.conges.montant)]
        ],
        metaRows: [
          ['Salaire mensuel brut', fmtMoney(inputs.salaire)],
          ['Durée totale du CDD', `${inputs.totalDuree} mois`],
          ['Mois déjà travaillés', `${inputs.moisTravailles} mois`],
          ['Initiative de rupture', inputs.initPar === 'employeur' ? 'Employeur' : 'Employé'],
          ['Congés restants', `${fmtNumber(inputs.conges)} jour(s)`]
        ],
        legalNote: 'Article 33 du Code du Travail marocain.'
      };
    }

    if (moduleId === 'depart') {
      return {
        title: 'Départ volontaire',
        totalLabel: 'Total estimé',
        totalValue: fmtMoney(result.total),
        summaryRows: [
          ['Préavis', fmtMoney(result.preavis.montant)],
          ['Indemnité de départ', fmtMoney(result.licenciement.montant)],
          ['Congés payés', fmtMoney(result.conges.montant)]
        ],
        metaRows: [
          ['Salaire mensuel brut', fmtMoney(inputs.salaire)],
          ['Ancienneté', `${inputs.annees} an(s) et ${inputs.mois} mois`],
          ['Catégorie', inputs.categorie === 'cadre' ? 'Cadre' : 'Non-cadre'],
          ['Motif', departMotifLabels[inputs.motif] || inputs.motif],
          ['Congés restants', `${fmtNumber(inputs.conges)} jour(s)`]
        ],
        legalNote: 'Articles 51, 52, 53, 238 et 526 du Code du Travail marocain.'
      };
    }

    if (moduleId === 'cnss') {
      return {
        title: 'Cotisations CNSS',
        totalLabel: 'Coût global mensuel',
        totalValue: fmtMoney(result.coutTotal),
        summaryRows: [
          ['Part salariale', fmtMoney(result.totalEmp)],
          ['Part patronale', fmtMoney(result.totalPat)],
          ['Coût global', fmtMoney(result.coutTotal)]
        ],
        metaRows: [
          ['Salaire mensuel brut', fmtMoney(inputs.salaire)],
          ['Nombre de salariés', fmtNumber(inputs.employes)],
          ['Allocations familiales', fmtMoney(result.branches.allocations.amountPat)],
          ['AMO', fmtMoney(result.branches.amo.amountEmp + result.branches.amo.amountPat)],
          ['Vieillesse', fmtMoney(result.branches.vieillesse.amountEmp + result.branches.vieillesse.amountPat)]
        ],
        legalNote: 'Barème CNSS 2025, AMO, vieillesse, allocations familiales et accidents du travail.'
      };
    }

    return {
      title: 'Calcul IGR / IR',
      totalLabel: 'Salaire net mensuel estimé',
      totalValue: fmtMoney(result.salaireNet),
      summaryRows: [
        ['IR mensuel', fmtMoney(result.irMensuel)],
        ['Taux effectif', `${fmtNumber(result.tauxEffectif)}%`],
        ['CNSS retenue', fmtMoney(result.cnss)],
        ['Salaire net', fmtMoney(result.salaireNet)]
      ],
      metaRows: [
        ['Salaire mensuel brut', fmtMoney(inputs.salaire)],
        ['CNSS forcée', fmtMoney(inputs.cnssForce)],
        ['Pension complémentaire', fmtMoney(inputs.pension)],
        ['Enfants à charge', fmtNumber(inputs.enfants)],
        ['Marie(e)', inputs.marie ? 'Oui' : 'Non']
      ],
      legalNote: 'Calcul IGR 2025 selon le barème progressif et les charges de famille.'
    };
  }

  function validateLead(lead) {
    if (!lead.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lead.email)) {
      throw new Error('Veuillez saisir une adresse email valide.');
    }
  }

  function getConfiguredFunctionsOrigin() {
    const queryOrigin = new URLSearchParams(window.location.search).get('functions_origin');
    if (queryOrigin) {
      return queryOrigin;
    }

    const meta = document.querySelector('meta[name="huquqpro-functions-origin"]');
    if (meta && meta.content) {
      return meta.content.trim();
    }

    return '';
  }

  function getFunctionsBaseOrigin() {
    const configuredOrigin = getConfiguredFunctionsOrigin();
    if (configuredOrigin) {
      return configuredOrigin.replace(/\/+$/, '');
    }

    const { origin, protocol, hostname, port } = window.location;
    const isLocalHost = /^(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\]|::1)$/.test(hostname);
    const isNetlifyDev = port === '8888';

    if (isLocalHost && !isNetlifyDev) {
      return `${protocol}//127.0.0.1:9999`;
    }

    return origin;
  }

  function getSendSimulationEndpoint() {
    return new URL('/.netlify/functions/send-simulation', `${getFunctionsBaseOrigin()}/`).toString();
  }

  async function sendPendingSimulation() {
    const simulation = window.HUQUQPRO_STATE.pendingSimulation;
    if (!simulation) {
      throw new Error('Aucune simulation n\'est prête à être envoyée.');
    }

    const lead = {
      name: $('lead-name').value.trim(),
      email: $('lead-email').value.trim(),
      website: $('lead-website').value.trim()
    };

    validateLead(lead);

    const model = buildModuleModel(simulation);
    const documentPayload = buildPdfAndEmailFromModel(model, lead, simulation.moduleId);

    const endpoint = getSendSimulationEndpoint();
    let response;

    try {
      response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          moduleId: simulation.moduleId,
          lead,
          simulation,
          document: documentPayload
        })
      });
    } catch (error) {
      throw new Error(`Impossible de joindre ${endpoint}. Vérifiez netlify functions:serve --port 9999 et APP_ORIGIN.`);
    }

    if (!response.ok) {
      let message = 'Envoi impossible. Réessayez.';
      try {
        const errorData = await response.json();
        message = errorData.error || message;
      } catch (error) {
        if (response.status === 501) {
          message = `Backend local indisponible sur ${endpoint}. Utilisez netlify dev ou netlify functions:serve --port 9999.`;
        } else {
          message = 'Envoi impossible. Réessayez.';
        }
      }
      throw new Error(message);
    }

    return {
      lead,
      moduleId: simulation.moduleId
    };
  }

  function init() {
    $('lead-form').addEventListener('submit', async (event) => {
      event.preventDefault();

      const submit = $('lead-submit');
      submit.disabled = true;
      submit.textContent = 'Envoi en cours...';
      window.HUQUQPRO_UI.setLeadStatus('Préparation du PDF en cours...');

      try {
        const sent = await sendPendingSimulation();
        window.HUQUQPRO_UI.showDeliverySuccess(sent.lead.email, sent.moduleId);
      } catch (error) {
        submit.disabled = false;
        submit.textContent = 'Recevoir mon PDF';
        window.HUQUQPRO_UI.setLeadStatus(error.message, 'error');
      }
    });

    $('lead-cancel').addEventListener('click', () => {
      window.HUQUQPRO_UI.closeLeadGate();
    });

    document.addEventListener('huquqpro:modulechange', () => {
      window.HUQUQPRO_UI.setLeadStatus('');
      $('lead-name').value = '';
      $('lead-email').value = '';
      $('lead-website').value = '';
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
