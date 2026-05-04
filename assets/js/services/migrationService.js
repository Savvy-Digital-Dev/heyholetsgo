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

  function cloneState(state) {
    return JSON.parse(JSON.stringify(state || {}));
  }

  function normalizeLegacyFourdx(fourdx) {
    const normalized = Object.assign({
      wig: "",
      leadMeasures: [],
      lagMeasures: [],
      checkins: {},
      offdays: {}
    }, fourdx || {});

    normalized.leadMeasures = Array.isArray(normalized.leadMeasures)
      ? normalized.leadMeasures.slice(0, 4).map((lead, idx) => {
        if (typeof lead === "string") {
          return { name: lead, activeFrom: getTodayKey() };
        }
        return {
          name: (lead && lead.name) || `Lead ${idx + 1}`,
          activeFrom: (lead && lead.activeFrom) || getTodayKey()
        };
      })
      : [];
    normalized.lagMeasures = Array.isArray(normalized.lagMeasures) ? normalized.lagMeasures : [];
    normalized.checkins = normalized.checkins && typeof normalized.checkins === "object" ? normalized.checkins : {};
    normalized.offdays = normalized.offdays && typeof normalized.offdays === "object" ? normalized.offdays : {};

    return normalized;
  }

  function countByDateMap(map) {
    return Object.keys(map || {}).reduce((total, dateKey) => {
      return total + (Array.isArray(map[dateKey]) ? map[dateKey].length : 0);
    }, 0);
  }

  function summarizeLegacyState(legacy) {
    const fourdx = normalizeLegacyFourdx(legacy && legacy.fourdx);
    const fourdxCheckins = Object.keys(fourdx.checkins || {}).reduce((total, dateKey) => {
      return total + Object.keys(fourdx.checkins[dateKey] || {}).length;
    }, 0);

    return {
      tasks: countByDateMap(legacy && legacy.tasks),
      learning: countByDateMap(legacy && legacy.learning),
      leadMeasures: fourdx.leadMeasures.length,
      fourdxCheckins,
      offdays: Object.keys(fourdx.offdays || {}).length
    };
  }

  async function importLegacyState(userId) {
    const legacy = readLegacyState();
    if (!legacy) return { imported: false, message: "Tidak ada data localStorage lama." };

    const summary = summarizeLegacyState(legacy);
    const totalRows = summary.tasks + summary.learning + summary.leadMeasures + summary.fourdxCheckins + summary.offdays;
    if (!totalRows) {
      return {
        imported: false,
        summary,
        message: "Data lama ditemukan, tapi isinya kosong. Pastikan import dilakukan di browser/domain yang memang berisi data HoHo lama."
      };
    }

    const currentUserSnapshot = Object.assign({}, appState.user || {});
    appState.tasks = cloneState(legacy.tasks || {});
    appState.learning = cloneState(legacy.learning || {});
    appState.fourdx = normalizeLegacyFourdx(cloneState(legacy.fourdx || appState.fourdx));
    appState.user = Object.assign({}, currentUserSnapshot, {
      name: (legacy.user && legacy.user.name) || currentUserSnapshot.name || "",
      position: (legacy.user && legacy.user.position) || currentUserSnapshot.position || ""
    });
    appState.theme = legacy.theme || appState.theme || "light";
    appState.lastOpenDate = legacy.lastOpenDate || null;

    if (window.HoHoCloudService) {
      await window.HoHoCloudService.saveNow(userId);
    } else {
      throw new Error("Cloud service belum siap, import belum bisa disimpan ke Supabase.");
    }

    localStorage.setItem("hhlg_v2_imported_legacy", new Date().toISOString());
    return {
      imported: true,
      summary,
      message: `Data lama berhasil diimport: ${summary.tasks} task, ${summary.learning} learning, ${summary.leadMeasures} lead 4DX, ${summary.fourdxCheckins} check-in 4DX.`
    };
  }

  window.HoHoMigrationService = {
    readLegacyState,
    summarizeLegacyState,
    importLegacyState
  };
})();
