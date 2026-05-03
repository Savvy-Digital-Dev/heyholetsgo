(function () {
  let saveTimer = null;
  let isHydrating = false;
  let isSaving = false;
  let currentUser = null;
  let currentProfile = null;
  let assignableProfiles = [];

  function configured() {
    return Boolean(window.HoHoAuthService && window.HoHoAuthService.isConfigured());
  }

  function getCurrentUser() {
    return currentUser;
  }

  function getCurrentProfile() {
    return currentProfile;
  }

  function getAssignableProfiles() {
    return assignableProfiles.slice();
  }

  async function hydrate(session) {
    if (!configured() || !session || !session.user) return null;
    isHydrating = true;
    currentUser = session.user;

    try {
      currentProfile = await window.HoHoProfileService.ensureCurrentProfile(session.user);
      assignableProfiles = await window.HoHoProfileService.listAssignableProfiles();

      const [tasks, learning, fourdx] = await Promise.all([
        window.HoHoTaskService.loadMyTasks(session.user.id),
        window.HoHoLearningService.loadMyLearning(session.user.id),
        window.HoHoFourdxService.loadMyFourdx(session.user.id)
      ]);

      appState.tasks = tasks || {};
      appState.learning = learning || {};
      appState.fourdx = fourdx || appState.fourdx;
      appState.user = {
        id: currentProfile.id,
        name: currentProfile.name || "",
        email: currentProfile.email || session.user.email || "",
        position: currentProfile.position || "",
        role: currentProfile.role || "regular_user",
        delegationEnabled: currentProfile.delegation_enabled !== false
      };

      return { user: currentUser, profile: currentProfile };
    } finally {
      isHydrating = false;
    }
  }

  function scheduleSave() {
    if (isHydrating || !configured() || !currentUser) return;
    window.clearTimeout(saveTimer);
    const status = document.getElementById("cloudStatusText");
    if (status) status.textContent = "Saving to cloud...";
    saveTimer = window.setTimeout(() => {
      saveNow().catch((err) => {
        console.error("Cloud save failed", err);
        const status = document.getElementById("cloudStatusText");
        if (status) status.textContent = "Cloud sync failed: " + (err.message || err);
      });
    }, 650);
  }

  async function saveNow(userId) {
    const activeUserId = userId || (currentUser && currentUser.id);
    if (!configured() || !activeUserId) return;
    if (isSaving) return;

    isSaving = true;
    try {
      await window.HoHoTaskService.replaceMyTasks(appState.tasks, activeUserId);
      await window.HoHoLearningService.replaceMyLearning(appState.learning, activeUserId);
      await window.HoHoFourdxService.replaceMyFourdx(appState.fourdx, activeUserId);

      if (appState.user) {
        await window.HoHoProfileService.updateOwnProfile({
          id: activeUserId,
          name: appState.user.name || (currentProfile && currentProfile.name) || "HoHo User",
          position: appState.user.position || ""
        });
      }

      const status = document.getElementById("cloudStatusText");
      if (status) status.textContent = "Cloud synced";
    } finally {
      isSaving = false;
    }
  }

  function resetSession() {
    currentUser = null;
    currentProfile = null;
    assignableProfiles = [];
  }

  window.HoHoCloudService = {
    configured,
    hydrate,
    scheduleSave,
    saveNow,
    resetSession,
    getCurrentUser,
    getCurrentProfile,
    getAssignableProfiles
  };
})();
