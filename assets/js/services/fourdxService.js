(function () {
  function client() {
    return window.HoHoSupabase && window.HoHoSupabase.client;
  }

  async function loadMyFourdx(userId) {
    const sb = client();
    if (!sb || !userId) return null;

    const { data: goal, error: goalError } = await sb
      .from("fourdx_goals")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    if (goalError) throw goalError;
    if (!goal) return { wig: "", leadMeasures: [], lagMeasures: [], checkins: {}, offdays: {} };

    const [leadsRes, lagsRes, checkinsRes, offdaysRes] = await Promise.all([
      sb.from("fourdx_lead_measures").select("*").eq("goal_id", goal.id).order("sort_order", { ascending: true }),
      sb.from("fourdx_lag_measures").select("*").eq("goal_id", goal.id).order("sort_order", { ascending: true }),
      sb.from("fourdx_checkins").select("*, fourdx_lead_measures(name)").eq("user_id", userId),
      sb.from("fourdx_offdays").select("*").eq("user_id", userId)
    ]);

    [leadsRes, lagsRes, checkinsRes, offdaysRes].forEach((res) => {
      if (res.error) throw res.error;
    });

    const checkins = {};
    (checkinsRes.data || []).forEach((row) => {
      const leadName = row.fourdx_lead_measures && row.fourdx_lead_measures.name;
      if (!leadName) return;
      if (!checkins[row.checkin_date]) checkins[row.checkin_date] = {};
      checkins[row.checkin_date][leadName] = row.status;
    });

    const offdays = {};
    (offdaysRes.data || []).forEach((row) => {
      offdays[row.offday_date] = true;
    });

    return {
      wig: goal.wig || "",
      leadMeasures: (leadsRes.data || []).map((lead) => ({
        id: lead.id,
        name: lead.name,
        activeFrom: lead.active_from
      })),
      lagMeasures: (lagsRes.data || []).map((lag) => lag.name),
      checkins,
      offdays
    };
  }

  async function replaceMyFourdx(fourdx, userId) {
    const sb = client();
    if (!sb || !userId) return;
    const state = fourdx || { wig: "", leadMeasures: [], lagMeasures: [], checkins: {}, offdays: {} };

    const { data: goal, error: upsertError } = await sb
      .from("fourdx_goals")
      .upsert({ user_id: userId, wig: state.wig || "", updated_at: new Date().toISOString() }, { onConflict: "user_id" })
      .select("*")
      .single();
    if (upsertError) throw upsertError;

    const cleanupSteps = [
      () => sb.from("fourdx_checkins").delete().eq("user_id", userId),
      () => sb.from("fourdx_offdays").delete().eq("user_id", userId),
      () => sb.from("fourdx_lead_measures").delete().eq("goal_id", goal.id),
      () => sb.from("fourdx_lag_measures").delete().eq("goal_id", goal.id)
    ];

    for (const step of cleanupSteps) {
      const { error } = await step();
      if (error) throw error;
    }

    const leadRows = (state.leadMeasures || []).slice(0, 4).map((lead, idx) => ({
      goal_id: goal.id,
      name: lead.name || `Lead ${idx + 1}`,
      active_from: lead.activeFrom || new Date().toISOString().slice(0, 10),
      sort_order: idx
    }));

    let insertedLeads = [];
    if (leadRows.length) {
      const { data, error } = await sb.from("fourdx_lead_measures").insert(leadRows).select("*");
      if (error) throw error;
      insertedLeads = data || [];
    }

    const lagRows = (state.lagMeasures || []).map((name, idx) => ({
      goal_id: goal.id,
      name: name || `Lag ${idx + 1}`,
      sort_order: idx
    }));
    if (lagRows.length) {
      const { error } = await sb.from("fourdx_lag_measures").insert(lagRows);
      if (error) throw error;
    }

    const leadByName = {};
    insertedLeads.forEach((lead) => {
      leadByName[lead.name] = lead.id;
    });

    const checkinRows = [];
    Object.keys(state.checkins || {}).forEach((dateKey) => {
      Object.keys(state.checkins[dateKey] || {}).forEach((leadName) => {
        const leadId = leadByName[leadName];
        if (!leadId) return;
        checkinRows.push({
          user_id: userId,
          lead_measure_id: leadId,
          checkin_date: dateKey,
          status: state.checkins[dateKey][leadName]
        });
      });
    });
    if (checkinRows.length) {
      const { error } = await sb.from("fourdx_checkins").insert(checkinRows);
      if (error) throw error;
    }

    const offdayRows = Object.keys(state.offdays || {}).map((dateKey) => ({
      user_id: userId,
      offday_date: dateKey
    }));
    if (offdayRows.length) {
      const { error } = await sb.from("fourdx_offdays").insert(offdayRows);
      if (error) throw error;
    }
  }

  window.HoHoFourdxService = {
    loadMyFourdx,
    replaceMyFourdx
  };
})();
