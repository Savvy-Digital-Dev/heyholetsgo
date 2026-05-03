(function () {
  function client() {
    return window.HoHoSupabase && window.HoHoSupabase.client;
  }

  function toDbEntry(entry, dateKey, userId) {
    return {
      client_id: entry.id,
      user_id: userId,
      category: entry.category || "other",
      subskill: entry.subskill || "",
      effort: Number(entry.effort) || 1,
      reflection: entry.reflection || entry.note || "",
      entry_date: dateKey,
      created_at: entry.createdAt || entry.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  }

  function fromDbEntry(row) {
    return {
      id: row.client_id || row.id,
      remoteId: row.id,
      category: row.category,
      subskill: row.subskill || "",
      effort: row.effort,
      reflection: row.reflection || "",
      createdAt: row.created_at
    };
  }

  async function loadMyLearning(userId) {
    const sb = client();
    if (!sb || !userId) return {};
    const { data, error } = await sb
      .from("learning_entries")
      .select("*")
      .eq("user_id", userId)
      .order("entry_date", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) throw error;

    return (data || []).reduce((acc, row) => {
      if (!acc[row.entry_date]) acc[row.entry_date] = [];
      acc[row.entry_date].push(fromDbEntry(row));
      return acc;
    }, {});
  }

  async function replaceMyLearning(learningByDate, userId) {
    const sb = client();
    if (!sb || !userId) return;

    const rows = [];
    Object.keys(learningByDate || {}).forEach((dateKey) => {
      (learningByDate[dateKey] || []).forEach((entry) => rows.push(toDbEntry(entry, dateKey, userId)));
    });

    const { error: deleteError } = await sb.from("learning_entries").delete().eq("user_id", userId);
    if (deleteError) throw deleteError;
    if (!rows.length) return;

    const { error } = await sb.from("learning_entries").insert(rows);
    if (error) throw error;
  }

  window.HoHoLearningService = {
    loadMyLearning,
    replaceMyLearning
  };
})();
