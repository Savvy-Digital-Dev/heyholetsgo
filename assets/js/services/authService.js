(function () {
  const svc = {
    isConfigured() {
      return Boolean(window.HoHoSupabase && window.HoHoSupabase.client);
    },

    getClient() {
      return window.HoHoSupabase ? window.HoHoSupabase.client : null;
    },

    async getSession() {
      const client = this.getClient();
      if (!client) return { session: null, error: null };
      const { data, error } = await client.auth.getSession();
      return { session: data && data.session ? data.session : null, error };
    },

    async signIn(email, password) {
      const client = this.getClient();
      if (!client) return { data: null, error: new Error("Supabase config is missing.") };
      return client.auth.signInWithPassword({ email, password });
    },

    async signInWithGoogle() {
      const client = this.getClient();
      if (!client) return { data: null, error: new Error("Supabase config is missing.") };
      const redirectTo = (window.HOHO_ENV && window.HOHO_ENV.APP_URL) || window.location.href;
      return client.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo }
      });
    },

    async signOut() {
      const client = this.getClient();
      if (!client) return { error: null };
      return client.auth.signOut();
    },

    onAuthStateChange(callback) {
      const client = this.getClient();
      if (!client) return { unsubscribe() {} };
      const { data } = client.auth.onAuthStateChange(callback);
      return data && data.subscription ? data.subscription : { unsubscribe() {} };
    }
  };

  window.HoHoAuthService = svc;
})();
