(function () {
  const LEGACY_STORAGE_KEY = "hhlg_v136_state";

  function readLegacyState() {
    try {
      const raw = localStorage.getItem(LEGACY_STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (err) {
      console.error("Failed to read legacy state", err);
      return null;
    }
  }

  async function importLegacyState(userId) {
    const legacy = readLegacyState();
    if (!legacy) return { imported: false, message: "Tidak ada data localStorage lama." };

    appState.tasks = legacy.tasks || {};
    appState.learning = legacy.learning || {};
    appState.fourdx = legacy.fourdx || appState.fourdx;
    appState.user = Object.assign({}, appState.user, legacy.user || {});
    appState.theme = legacy.theme || appState.theme || "light";
    appState.lastOpenDate = legacy.lastOpenDate || null;

    if (window.HoHoCloudService) {
      await window.HoHoCloudService.saveNow(userId);
    }

    localStorage.setItem("hhlg_v2_imported_legacy", new Date().toISOString());
    return { imported: true, message: "Data lama berhasil diimport ke akun ini." };
  }

  window.HoHoMigrationService = {
    readLegacyState,
    importLegacyState
  };
})();
