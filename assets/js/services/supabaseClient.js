(function () {
  function getConfig() {
    return window.HOHO_ENV || {};
  }

  function hasConfig() {
    const cfg = getConfig();
    return Boolean(cfg.SUPABASE_URL && cfg.SUPABASE_PUBLISHABLE_KEY);
  }

  function createClient() {
    if (!hasConfig()) return null;
    if (!window.supabase || !window.supabase.createClient) {
      console.error("Supabase SDK is not loaded.");
      return null;
    }

    return window.supabase.createClient(
      getConfig().SUPABASE_URL,
      getConfig().SUPABASE_PUBLISHABLE_KEY,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true
        }
      }
    );
  }

  window.HoHoSupabase = {
    getConfig,
    hasConfig,
    client: createClient()
  };
})();
