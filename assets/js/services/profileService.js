(function () {
  function client() {
    return window.HoHoSupabase && window.HoHoSupabase.client;
  }

  async function getCurrentProfile(user) {
    const sb = client();
    if (!sb || !user) return null;

    const { data, error } = await sb
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  async function ensureCurrentProfile(user) {
    const sb = client();
    if (!sb || !user) return null;

    const existing = await getCurrentProfile(user);
    if (existing) return existing;

    const name =
      (user.user_metadata && (user.user_metadata.name || user.user_metadata.full_name)) ||
      (user.email ? user.email.split("@")[0] : "New User");

    const { data, error } = await sb
      .from("profiles")
      .insert({
        id: user.id,
        email: user.email || "",
        name,
        role: "regular_user",
        status: "active"
      })
      .select("*")
      .single();

    if (error) throw error;
    return data;
  }

  async function listAssignableProfiles() {
    const sb = client();
    if (!sb) return [];
    const { data, error } = await sb
      .from("profiles")
      .select("id,name,email,role,manager_id,delegation_enabled,status")
      .order("name", { ascending: true });

    if (error) throw error;
    return data || [];
  }

  async function updateOwnProfile(fields) {
    const sb = client();
    if (!sb) return null;
    const { data, error } = await sb
      .from("profiles")
      .update({
        name: fields.name,
        position: fields.position,
        updated_at: new Date().toISOString()
      })
      .eq("id", fields.id)
      .select("*")
      .single();

    if (error) throw error;
    return data;
  }

  async function updateManagedProfile(userId, fields) {
    const sb = client();
    if (!sb) return null;
    const payload = Object.assign({}, fields, { updated_at: new Date().toISOString() });
    const { data, error } = await sb
      .from("profiles")
      .update(payload)
      .eq("id", userId)
      .select("*")
      .single();

    if (error) throw error;
    return data;
  }

  window.HoHoProfileService = {
    ensureCurrentProfile,
    getCurrentProfile,
    listAssignableProfiles,
    updateOwnProfile,
    updateManagedProfile
  };
})();
