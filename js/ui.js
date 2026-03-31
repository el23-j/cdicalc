(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);

  const moduleNames = {
    net2brut: 'Net vers Brut',
    cdi: 'Rupture CDI',
    cdd: 'Rupture CDD',
    depart: 'Départ volontaire',
    cnss: 'Cotisations CNSS',
    igr: 'Calcul IGR / IR'
  };

  const deliveryMessages = {
    net2brut: 'Saisissez le net que vous recevez sur votre compte pour obtenir le brut correspondant, le détail CNSS/AMO, l\'IR mensuel et la preuve du calcul.',
    cdi: 'Renseignez la rupture CDI puis confirmez votre email pour recevoir le détail des indemnités.',
    cdd: 'Lancez la simulation CDD pour ouvrir l\'envoi privé des salaires restants et congés.',
    depart: 'Le détail du départ volontaire sera compilé dans un PDF privé envoyé par email.',
    cnss: 'La ventilation CNSS n\'apparaît pas à l\'écran et sera livrée uniquement par email.',
    igr: 'Le détail du barème IGR sera masqué à l\'écran puis envoyé dans une fiche PDF.'
  };

  const formatter = new Intl.NumberFormat('fr-MA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  function getPreviewContent(moduleId, result) {
    let main = '';
    let hint = '📄 Simulation indicative — résultat complet livré par email.';
    switch (moduleId) {
      case 'net2brut':
        main = `✅ Brut estimé : <strong>${formatter.format(result.salaireBrut)} MAD</strong>`;
        break;
      case 'cdi':
        main = `✅ Indemnité totale estimée : <strong>${formatter.format(result.total)} MAD</strong>`;
        break;
      case 'cdd':
        main = `✅ Montant dû estimé : <strong>${formatter.format(result.total)} MAD</strong>`;
        break;
      case 'depart':
        main = `✅ Indemnité de départ estimée : <strong>${formatter.format(result.total)} MAD</strong>`;
        break;
      case 'cnss':
        main = `✅ Coût employeur estimé : <strong>${formatter.format(result.coutTotal)} MAD/mois</strong>`;
        break;
      case 'igr':
        main = `✅ IR mensuel estimé : <strong>${formatter.format(result.irMensuel)} MAD</strong>`;
        break;
      default:
        main = `✅ Calcul réussi`;
    }
    return `<p>${main}</p><p class="result-hint">${hint}</p>`;
  }

  window.HUQUQPRO_STATE = window.HUQUQPRO_STATE || {
    activeModule: 'net2brut',
    pendingSimulation: null
  };

  let net2brutMarie = false;
  let abusif = false;
  let preavisTravaille = false;
  let cddInitPar = 'employeur';
  let igrMarie = false;

  function ancienneteLabel(totalMois) {
    const ans = Math.floor(totalMois / 12);
    const mois = totalMois % 12;
    const parts = [];

    if (ans > 0) {
      parts.push(`${ans} an${ans > 1 ? 's' : ''}`);
    }

    if (mois > 0) {
      parts.push(`${mois} mois`);
    }

    return parts.length ? parts.join(' et ') : '0 mois';
  }

  function clearChildren(node) {
    while (node.firstChild) {
      node.removeChild(node.firstChild);
    }
  }

  function setLeadStatus(message, type = '') {
    const status = $('lead-status');
    if (!status) return;
    status.className = `ef-status${type ? ` ${type}` : ''}`;
    status.textContent = message;
  }

  function updateDeliveryContext(moduleId) {
    const nextModule = moduleNames[moduleId] ? moduleId : 'net2brut';
    window.HUQUQPRO_STATE.activeModule = nextModule;
    $('delivery-copy').textContent = 'Aucun montant n\'est affiché à l\'écran. Chaque simulation détaillée est livrée par email.';
    $('delivery-placeholder-text').textContent = deliveryMessages[nextModule];
  }

  function resetLeadInputs() {
    const website = $('lead-website');
    if (website) website.value = '';
    setLeadStatus('');

    const submit = $('lead-submit');
    if (submit) {
      submit.disabled = false;
      submit.textContent = 'Recevoir mon PDF';
    }
  }

  function closeLeadGate() {
    window.HUQUQPRO_STATE.pendingSimulation = null;
    $('lead-form').classList.add('hidden');
    $('delivery-success').classList.add('hidden');
    
    const preview = $('result-preview');
    if (preview) preview.classList.add('hidden');
    
    $('delivery-placeholder').classList.remove('hidden');
    resetLeadInputs();
  }

  function showDeliverySuccess(email, moduleId) {
    const container = $('delivery-success');
    clearChildren(container);

    const title = document.createElement('h3');
    title.textContent = 'Simulation envoyée';

    const text = document.createElement('p');
    text.textContent = `Le PDF ${moduleNames[moduleId] || 'HuquqPro'} a été envoyé à ${email}.`;

    container.append(title, text);
    container.classList.remove('hidden');
    $('lead-form').classList.add('hidden');
    $('delivery-placeholder').classList.add('hidden');
    window.HUQUQPRO_STATE.pendingSimulation = null;
    resetLeadInputs();
  }

  function focusActiveForm() {
    const activePanel = document.querySelector('.module-panel.active');
    if (activePanel) {
      activePanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  function openLeadGate(moduleId, inputs, result) {
    window.HUQUQPRO_STATE.pendingSimulation = { moduleId, inputs, result };
    $('lead-module').value = moduleId;
    $('lead-module-name').textContent = moduleNames[moduleId] || moduleId;
    $('delivery-placeholder').classList.add('hidden');
    $('delivery-success').classList.add('hidden');
    
    const activeSection = document.querySelector('.module-panel.active > section');
    const deliveryPanel = $('delivery-panel');
    if (activeSection && deliveryPanel) {
      activeSection.appendChild(deliveryPanel);
      deliveryPanel.classList.add('inline-modal');
    }

    const preview = $('result-preview');
    if (preview) {
      preview.innerHTML = getPreviewContent(moduleId, result);
      preview.classList.remove('hidden');
    }
    
    $('lead-form').classList.remove('hidden');
    resetLeadInputs();

    if (window.innerWidth < 980) {
      $('delivery-panel').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    $('lead-email').focus();
  }

  function showErrorsFor(formId, errors) {
    const form = $(formId);
    let box = form.querySelector('.form-errors');

    if (!box) {
      box = document.createElement('div');
      box.className = 'form-errors';
      form.prepend(box);
    }

    clearChildren(box);
    errors.forEach((message) => {
      const p = document.createElement('p');
      p.textContent = `⚠ ${message}`;
      box.appendChild(p);
    });
  }

  function clearErrorsFor(formId) {
    const form = $(formId);
    const box = form ? form.querySelector('.form-errors') : null;
    if (box) {
      box.remove();
    }
  }

  function validateCdi(inputs) {
    const errors = [];
    if (!inputs.salaire || inputs.salaire <= 0) errors.push('Le salaire mensuel brut doit être supérieur à 0.');
    if (inputs.annees < 0) errors.push('Les années d\'ancienneté ne peuvent pas être négatives.');
    if (inputs.mois < 0 || inputs.mois > 11) errors.push('Les mois supplémentaires doivent être compris entre 0 et 11.');
    if (inputs.conges < 0) errors.push('Les congés non pris ne peuvent pas être négatifs.');
    return errors;
  }

  function validateNet2Brut(inputs) {
    const errors = [];
    if (!inputs.net || inputs.net <= 0) errors.push('Le salaire net reçu doit être supérieur à 0.');
    if (!inputs.statut) errors.push('Veuillez choisir le statut professionnel.');
    if (inputs.pension < 0) errors.push('La pension complémentaire ne peut pas être négative.');
    if (inputs.enfants < 0 || inputs.enfants > 6) errors.push('Le nombre d\'enfants à charge doit être compris entre 0 et 6.');
    return errors;
  }

  function validateCdd(inputs) {
    const errors = [];
    if (!inputs.salaire || inputs.salaire <= 0) errors.push('Le salaire mensuel brut doit être supérieur à 0.');
    if (inputs.totalDuree < 1 || inputs.totalDuree > 24) errors.push('La durée totale du CDD doit être comprise entre 1 et 24 mois.');
    if (inputs.moisTravailles < 0) errors.push('Les mois travaillés ne peuvent pas être négatifs.');
    if (inputs.moisTravailles > inputs.totalDuree) errors.push('Les mois travaillés ne peuvent pas dépasser la durée totale du CDD.');
    if (inputs.conges < 0) errors.push('Les congés non pris ne peuvent pas être négatifs.');
    return errors;
  }

  function validateDepart(inputs) {
    const errors = [];
    if (!inputs.salaire || inputs.salaire <= 0) errors.push('Le salaire mensuel brut doit être supérieur à 0.');
    if (inputs.annees < 0) errors.push('Les années d\'ancienneté ne peuvent pas être négatives.');
    if (inputs.mois < 0 || inputs.mois > 11) errors.push('Les mois supplémentaires doivent être compris entre 0 et 11.');
    if (inputs.conges < 0) errors.push('Les congés non pris ne peuvent pas être négatifs.');
    return errors;
  }

  function validateCnss(inputs) {
    const errors = [];
    if (!inputs.salaire || inputs.salaire <= 0) errors.push('Le salaire mensuel brut doit être supérieur à 0.');
    if (!inputs.employes || inputs.employes < 1) errors.push('Le nombre de salariés doit être d\'au moins 1.');
    return errors;
  }

  function validateIgr(inputs) {
    const errors = [];
    if (!inputs.salaire || inputs.salaire <= 0) errors.push('Le salaire mensuel brut doit être supérieur à 0.');
    if (inputs.cnssForce < 0) errors.push('La déduction CNSS ne peut pas être négative.');
    if (inputs.pension < 0) errors.push('La pension complémentaire ne peut pas être négative.');
    if (inputs.enfants < 0 || inputs.enfants > 6) errors.push('Le nombre d\'enfants à charge doit être compris entre 0 et 6.');
    return errors;
  }

  function collectCdiInputs() {
    return {
      salaire: parseFloat($('salaire').value) || 0,
      annees: parseInt($('annees').value, 10) || 0,
      mois: parseInt($('mois').value, 10) || 0,
      categorie: $('categorie').value,
      conges: parseFloat($('conges').value) || 0,
      abusif,
      preavisTravaille
    };
  }

  function collectNet2BrutInputs() {
    return {
      net: parseFloat($('net2brut-net').value) || 0,
      statut: $('net2brut-statut').value,
      pension: parseFloat($('net2brut-pension').value) || 0,
      enfants: parseInt($('net2brut-enfants').value, 10) || 0,
      marie: net2brutMarie
    };
  }

  function collectCddInputs() {
    return {
      salaire: parseFloat($('cdd-salaire').value) || 0,
      totalDuree: parseInt($('cdd-total-duree').value, 10) || 0,
      moisTravailles: parseInt($('cdd-mois-travailles').value, 10) || 0,
      initPar: cddInitPar,
      conges: parseFloat($('cdd-conges').value) || 0
    };
  }

  function collectDepartInputs() {
    return {
      salaire: parseFloat($('depart-salaire').value) || 0,
      annees: parseInt($('depart-annees').value, 10) || 0,
      mois: parseInt($('depart-mois').value, 10) || 0,
      categorie: $('depart-categorie').value,
      motif: $('depart-motif').value,
      conges: parseFloat($('depart-conges').value) || 0
    };
  }

  function collectCnssInputs() {
    return {
      salaire: parseFloat($('cnss-salaire').value) || 0,
      employes: parseInt($('cnss-employes').value, 10) || 1
    };
  }

  function collectIgrInputs() {
    return {
      salaire: parseFloat($('igr-salaire').value) || 0,
      cnssForce: parseFloat($('igr-cnss').value) || 0,
      pension: parseFloat($('igr-pension').value) || 0,
      enfants: parseInt($('igr-enfants').value, 10) || 0,
      marie: igrMarie
    };
  }

  const MODULES = {
    net2brut: {
      formId: 'calc-form-net2brut',
      collect: collectNet2BrutInputs,
      validate: validateNet2Brut,
      run: window.CDICalculator.calcNetToBrut
    },
    cdi: {
      formId: 'calc-form',
      collect: collectCdiInputs,
      validate: validateCdi,
      run: window.CDICalculator.calculate
    },
    cdd: {
      formId: 'calc-form-cdd',
      collect: collectCddInputs,
      validate: validateCdd,
      run: window.CDICalculator.calcCDD
    },
    depart: {
      formId: 'calc-form-depart',
      collect: collectDepartInputs,
      validate: validateDepart,
      run: window.CDICalculator.calcDepartVolontaire
    },
    cnss: {
      formId: 'calc-form-cnss',
      collect: collectCnssInputs,
      validate: validateCnss,
      run: window.CDICalculator.calcCNSS
    },
    igr: {
      formId: 'calc-form-igr',
      collect: collectIgrInputs,
      validate: validateIgr,
      run: window.CDICalculator.calcIGR
    }
  };

  function handleModuleSubmit(moduleId) {
    const config = MODULES[moduleId];
    const form = $(config.formId);
    clearErrorsFor(config.formId);

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const inputs = config.collect();
    const errors = config.validate(inputs);
    if (errors.length) {
      showErrorsFor(config.formId, errors);
      return;
    }

    const submitBtn = form.querySelector('.btn-calculate');
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.innerHTML = 'Calcul en cours...';

    setTimeout(() => {
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
      const result = config.run(inputs);
      openLeadGate(moduleId, inputs, result);
    }, 600);
  }

  function bindToggle(buttonYes, buttonNo, onYes, onNo) {
    if (!buttonYes || !buttonNo) return;

    buttonYes.addEventListener('click', () => {
      buttonYes.classList.add('active');
      buttonNo.classList.remove('active');
      onYes();
    });

    buttonNo.addEventListener('click', () => {
      buttonNo.classList.add('active');
      buttonYes.classList.remove('active');
      onNo();
    });
  }

  function updateAncienneteDisplay() {
    const annees = parseInt($('annees').value, 10) || 0;
    const mois = parseInt($('mois').value, 10) || 0;
    const totalMois = annees * 12 + mois;
    const display = $('anciennete-display');

    if (totalMois < 6) {
      display.textContent = `${ancienneteLabel(totalMois)} - moins de 6 mois, pas d'indemnité de licenciement.`;
      display.classList.add('warn');
    } else {
      display.textContent = `${ancienneteLabel(totalMois)} d'ancienneté.`;
      display.classList.remove('warn');
    }
  }

  function resetNet2BrutForm() {
    $('calc-form-net2brut').reset();
    $('net2brut-statut').value = 'non-cadre';
    net2brutMarie = false;
    $('net2brut-marie-non').classList.add('active');
    $('net2brut-marie-oui').classList.remove('active');
    clearErrorsFor('calc-form-net2brut');
    closeLeadGate();
  }

  function resetCdiForm() {
    $('calc-form').reset();
    abusif = false;
    preavisTravaille = false;
    $('abusif-non').classList.add('active');
    $('abusif-oui').classList.remove('active');
    $('preavis-non').classList.add('active');
    $('preavis-oui').classList.remove('active');
    updateAncienneteDisplay();
    clearErrorsFor('calc-form');
    closeLeadGate();
  }

  function resetCddForm() {
    $('calc-form-cdd').reset();
    cddInitPar = 'employeur';
    $('cdd-init-employeur').classList.add('active');
    $('cdd-init-employe').classList.remove('active');
    clearErrorsFor('calc-form-cdd');
    closeLeadGate();
  }

  function resetDepartForm() {
    $('calc-form-depart').reset();
    clearErrorsFor('calc-form-depart');
    closeLeadGate();
  }

  function resetCnssForm() {
    $('calc-form-cnss').reset();
    $('cnss-employes').value = '1';
    clearErrorsFor('calc-form-cnss');
    closeLeadGate();
  }

  function resetIgrForm() {
    $('calc-form-igr').reset();
    igrMarie = false;
    $('igr-marie-non').classList.add('active');
    $('igr-marie-oui').classList.remove('active');
    clearErrorsFor('calc-form-igr');
    closeLeadGate();
  }

  function init() {
    bindToggle($('net2brut-marie-oui'), $('net2brut-marie-non'), () => { net2brutMarie = true; }, () => { net2brutMarie = false; });
    bindToggle($('abusif-oui'), $('abusif-non'), () => { abusif = true; }, () => { abusif = false; });
    bindToggle($('preavis-oui'), $('preavis-non'), () => { preavisTravaille = true; }, () => { preavisTravaille = false; });
    bindToggle($('cdd-init-employe'), $('cdd-init-employeur'), () => { cddInitPar = 'employe'; }, () => { cddInitPar = 'employeur'; });
    bindToggle($('igr-marie-oui'), $('igr-marie-non'), () => { igrMarie = true; }, () => { igrMarie = false; });

    $('annees').addEventListener('input', updateAncienneteDisplay);
    $('mois').addEventListener('input', updateAncienneteDisplay);
    updateAncienneteDisplay();

    Object.keys(MODULES).forEach((moduleId) => {
      const config = MODULES[moduleId];
      const form = $(config.formId);
      form.addEventListener('submit', (event) => {
        event.preventDefault();
        handleModuleSubmit(moduleId);
      });
    });

    $('btn-reset-net2brut').addEventListener('click', resetNet2BrutForm);
    $('btn-reset').addEventListener('click', resetCdiForm);
    $('btn-reset-cdd').addEventListener('click', resetCddForm);
    $('btn-reset-depart').addEventListener('click', resetDepartForm);
    $('btn-reset-cnss').addEventListener('click', resetCnssForm);
    $('btn-reset-igr').addEventListener('click', resetIgrForm);
    $('delivery-back').addEventListener('click', focusActiveForm);

    document.addEventListener('huquqpro:modulechange', (event) => {
      updateDeliveryContext(event.detail.moduleId);
      closeLeadGate();
      focusActiveForm();
    });

    const initialModule = document.querySelector('.module-tab.active')?.dataset.module || 'net2brut';
    updateDeliveryContext(initialModule);
  }

  window.HUQUQPRO_UI = {
    closeLeadGate,
    showDeliverySuccess,
    setLeadStatus,
    focusActiveForm
  };

  document.addEventListener('DOMContentLoaded', init);
})();
