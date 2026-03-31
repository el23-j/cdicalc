(function () {
  'use strict';

  const allowedModules = new Set(['net2brut', 'cdi', 'cdd', 'depart', 'cnss', 'igr']);

  const routeMap = {
    '/simulateur-net-brut': 'net2brut',
    '/rupture-cdi': 'cdi',
    '/rupture-cdd': 'cdd',
    '/depart-volontaire': 'depart',
    '/cotisations-cnss': 'cnss',
    '/calcul-igr': 'igr'
  };
  const moduleToRoute = Object.fromEntries(Object.entries(routeMap).map(([k, v]) => [v, k]));

  const seoData = {
    net2brut: {
      title: 'Calculateur Net vers Brut Maroc 2026 — HuquqPro',
      description: 'Simulateur de salaire net vers brut selon le Code du travail marocain 2026. Détail CNSS et IR inclus.',
      h1: 'Simulateur Net vers Brut'
    },
    cdi: {
      title: 'Calcul Indemnité Rupture CDI Maroc 2026 — HuquqPro',
      description: 'Calculez vos indemnités de licenciement CDI : préavis, licenciement, dommages-intérêts et congés payés.',
      h1: 'Calcul des indemnités de rupture CDI'
    },
    cdd: {
      title: 'Calcul Indemnité Rupture CDD Maroc 2026 — HuquqPro',
      description: 'Simulez les salaires restants et les congés payés en cas de rupture anticipée de CDD au Maroc.',
      h1: 'Calcul de rupture anticipée CDD'
    },
    depart: {
      title: 'Calcul Départ Volontaire ou Retraite Maroc 2026 — HuquqPro',
      description: 'Simulez les indemnités pour un départ volontaire, une démission ou une retraite selon le Code du travail marocain.',
      h1: 'Calcul des indemnités de départ volontaire'
    },
    cnss: {
      title: 'Calculateur Cotisations CNSS Maroc 2026 — HuquqPro',
      description: 'Calculez les charges sociales salariales et patronales selon le barème CNSS et AMO de 2026.',
      h1: 'Calcul des cotisations CNSS'
    },
    igr: {
      title: 'Calculateur IGR / IR Salaire Maroc 2026 — HuquqPro',
      description: 'Simulez le prélèvement mensuel de l\\'IR (Impôt sur le Revenu) au Maroc. Détail RNI et charges familiales.',
      h1: 'Calcul de l\\'IR (Impôt sur le Revenu)'
    }
  };

  function updateSeo(moduleId) {
    const data = seoData[moduleId];
    if (data) {
      document.title = data.title;
      const metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc) metaDesc.setAttribute('content', data.description);
      const h1 = document.querySelector('h1.site-title');
      if (h1) h1.textContent = data.h1;
    }
  }

  function normalizeModule(moduleId) {
    return allowedModules.has(moduleId) ? moduleId : 'net2brut';
  }

  function activateModule(moduleId, options = {}) {
    const nextModule = normalizeModule(moduleId);

    document.querySelectorAll('.module-tab').forEach((tab) => {
      const isActive = tab.dataset.module === nextModule;
      tab.classList.toggle('active', isActive);
      tab.setAttribute('aria-pressed', String(isActive));
    });

    document.querySelectorAll('.module-panel').forEach((panel) => {
      panel.classList.toggle('active', panel.id === `panel-${nextModule}`);
    });

    if (options.updateUrl !== false) {
      const url = new URL(window.location.href);
      url.searchParams.delete('module');
      url.pathname = moduleToRoute[nextModule] || '/simulateur-net-brut';
      window.history.pushState({}, '', url);
    }

    updateSeo(nextModule);

    document.dispatchEvent(new CustomEvent('huquqpro:modulechange', {
      detail: { moduleId: nextModule }
    }));

    return nextModule;
  }

  window.HUQUQPRO_ROUTER = {
    activateModule,
    normalizeModule
  };

  function getModuleFromUrl() {
    const params = new URLSearchParams(window.location.search);
    if (params.get('module')) return params.get('module');
    
    const path = window.location.pathname.replace(/\/$/, '');
    if (routeMap[path]) return routeMap[path];

    return 'net2brut';
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.module-tab').forEach((tab) => {
      tab.addEventListener('click', () => activateModule(tab.dataset.module));
    });

    const initialModule = getModuleFromUrl();
    activateModule(initialModule, { updateUrl: false });
    
    window.addEventListener('popstate', () => {
        const mod = getModuleFromUrl();
        activateModule(mod, { updateUrl: false });
    });
  });
})();
