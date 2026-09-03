// Prevent the v5 brand observer from observing its own DOM writes.
// Existing observers created by earlier demo scripts are unaffected.
(() => {
  const NativeMutationObserver = window.MutationObserver;
  if (!NativeMutationObserver || window.__efcMutationGuardInstalled) return;
  window.__efcMutationGuardInstalled = true;

  window.MutationObserver = class EfcSafeMutationObserver {
    constructor(callback) {
      const source = String(callback || '');
      if (source.includes('applyBrandV5')) {
        this._observer = null;
        return;
      }
      this._observer = new NativeMutationObserver(callback);
    }
    observe(...args) { return this._observer?.observe(...args); }
    disconnect() { return this._observer?.disconnect(); }
    takeRecords() { return this._observer?.takeRecords?.() || []; }
  };
})();
