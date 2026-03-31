(function () {
  'use strict';

  const allowedModules = new Set(['net2brut', 'cdi', 'cdd', 'depart', 'cnss', 'igr']);

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
      url.searchParams.set('module', nextModule);
      window.history.replaceState({}, '', url);
    }

    document.dispatchEvent(new CustomEvent('huquqpro:modulechange', {
      detail: { moduleId: nextModule }
    }));

    return nextModule;
  }

  window.HUQUQPRO_ROUTER = {
    activateModule,
    normalizeModule
  };

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.module-tab').forEach((tab) => {
      tab.addEventListener('click', () => activateModule(tab.dataset.module));
    });

    const initialModule = new URLSearchParams(window.location.search).get('module') || 'net2brut';
    activateModule(initialModule, { updateUrl: false });
  });
})();
