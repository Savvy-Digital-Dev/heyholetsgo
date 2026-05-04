(function () {
  function client() {
    return window.HoHoSupabase && window.HoHoSupabase.client;
  }

  function normalizeKey(key) {
    return String(key || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");
  }

  function parseNumber(value) {
    if (value === null || value === undefined || value === "") return 0;
    const cleaned = String(value).replace(/%/g, "").replace(/,/g, "").trim();
    const num = Number(cleaned);
    return Number.isFinite(num) ? num : 0;
  }

  function parseCsv(text) {
    const rows = [];
    let row = [];
    let cell = "";
    let quoted = false;

    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      const next = text[i + 1];
      if (quoted && ch === '"' && next === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') {
        quoted = !quoted;
      } else if (!quoted && ch === ",") {
        row.push(cell);
        cell = "";
      } else if (!quoted && (ch === "\n" || ch === "\r")) {
        if (ch === "\r" && next === "\n") i++;
        row.push(cell);
        if (row.some((v) => String(v).trim() !== "")) rows.push(row);
        row = [];
        cell = "";
      } else {
        cell += ch;
      }
    }

    row.push(cell);
    if (row.some((v) => String(v).trim() !== "")) rows.push(row);
    if (rows.length < 2) return [];

    const headers = rows[0].map(normalizeKey);
    return rows.slice(1).map((values) => {
      const obj = {};
      headers.forEach((header, idx) => {
        obj[header] = values[idx] !== undefined ? String(values[idx]).trim() : "";
      });
      return obj;
    });
  }

  function pick(row, keys) {
    for (const key of keys) {
      const normalized = normalizeKey(key);
      if (row[normalized] !== undefined && row[normalized] !== "") return row[normalized];
    }
    return "";
  }

  function hashRow(row) {
    const text = JSON.stringify(row);
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      hash = ((hash << 5) - hash + text.charCodeAt(i)) | 0;
    }
    return "legacy_" + Math.abs(hash);
  }

  function taskXp(task) {
    const effort = Number(task && task.effort) || 0;
    const base = { 1: 10, 2: 20, 3: 30 }[effort] || 0;
    if (task.status === "done") return base;
    if (task.status === "progress") return Math.round(base * 0.2);
    return 0;
  }

  function learningXp(entry) {
    return { 1: 5, 2: 10, 3: 20 }[Number(entry && entry.effort)] || 0;
  }

  function isVisibleProfile(profile, currentProfile) {
    if (!currentProfile) return false;
    if (currentProfile.role === "superuser") return true;
    if (currentProfile.role === "admin") {
      return profile.id === currentProfile.id || profile.manager_id === currentProfile.id;
    }
    return profile.id === currentProfile.id;
  }

  async function loadVisibleProfiles(currentProfile) {
    const sb = client();
    if (!sb) return [];
    const { data, error } = await sb
      .from("profiles")
      .select("id,name,email,role,manager_id,status")
      .eq("status", "active")
      .order("name", { ascending: true });
    if (error) throw error;
    return (data || []).filter((profile) => isVisibleProfile(profile, currentProfile));
  }

  async function loadTeamTasks(startDate, endDate) {
    const sb = client();
    if (!sb) return [];
    const { data, error } = await sb
      .from("tasks")
      .select("*")
      .gte("task_date", startDate)
      .lte("task_date", endDate)
      .order("task_date", { ascending: false });
    if (error) throw error;
    return data || [];
  }

  async function loadTeamLearning(startDate, endDate) {
    const sb = client();
    if (!sb) return [];
    const { data, error } = await sb
      .from("learning_entries")
      .select("*")
      .gte("entry_date", startDate)
      .lte("entry_date", endDate)
      .order("entry_date", { ascending: false });
    if (error) throw error;
    return data || [];
  }

  async function loadTeamFourdxSummary(startDate, endDate) {
    const sb = client();
    if (!sb) return [];
    const { data, error } = await sb
      .from("fourdx_checkins")
      .select("*")
      .gte("checkin_date", startDate)
      .lte("checkin_date", endDate);
    if (error) throw error;
    return data || [];
  }

  async function loadLegacySummaries(startDate, endDate) {
    const sb = client();
    if (!sb) return { taskLearning: [], fourdx: [] };

    const [taskLearning, fourdx] = await Promise.all([
      sb.from("legacy_task_learning_weekly_summaries").select("*").gte("week_end", startDate).lte("week_start", endDate),
      sb.from("legacy_fourdx_weekly_summaries").select("*").gte("week_end", startDate).lte("week_start", endDate)
    ]);

    if (taskLearning.error && taskLearning.error.code !== "42P01") throw taskLearning.error;
    if (fourdx.error && fourdx.error.code !== "42P01") throw fourdx.error;

    return {
      taskLearning: taskLearning.data || [],
      fourdx: fourdx.data || []
    };
  }

  function buildSummary({ profiles, tasks, learning, fourdx, legacyTaskLearning, legacyFourdx }) {
    const byUser = {};
    profiles.forEach((profile) => {
      byUser[profile.id] = {
        profile,
        taskXp: 0,
        done: 0,
        progress: 0,
        blocked: 0,
        assigned: 0,
        delegated: 0,
        learningXp: 0,
        learningEntries: 0,
        fourdxGreen: 0,
        fourdxExpected: 0,
        legacyTaskXp: 0,
        legacyLearningXp: 0,
        legacyFourdxGreen: 0,
        legacyFourdxRows: 0,
        tasks: [],
        learning: []
      };
    });

    tasks.forEach((task) => {
      const row = byUser[task.owner_id];
      if (!row) return;
      row.taskXp += taskXp(task);
      if (task.status === "done") row.done++;
      if (task.status === "progress") row.progress++;
      if (task.status === "blocked") row.blocked++;
      if (task.source === "assigned") row.assigned++;
      if (task.source === "delegated") row.delegated++;
      row.tasks.push(task);
    });

    learning.forEach((entry) => {
      const row = byUser[entry.user_id];
      if (!row) return;
      row.learningXp += learningXp(entry);
      row.learningEntries++;
      row.learning.push(entry);
    });

    fourdx.forEach((entry) => {
      const row = byUser[entry.user_id];
      if (!row) return;
      row.fourdxExpected++;
      if (entry.status === "GREEN") row.fourdxGreen++;
    });

    const byEmail = {};
    const byName = {};
    Object.values(byUser).forEach((row) => {
      byEmail[String(row.profile.email || "").toLowerCase()] = row;
      byName[String(row.profile.name || "").toLowerCase()] = row;
    });

    legacyTaskLearning.forEach((legacy) => {
      const row = byEmail[String(legacy.user_email || "").toLowerCase()] || byName[String(legacy.user_name || "").toLowerCase()];
      if (!row) return;
      row.legacyTaskXp += Number(legacy.task_xp || 0);
      row.legacyLearningXp += Number(legacy.learning_xp || 0);
    });

    legacyFourdx.forEach((legacy) => {
      const row = byEmail[String(legacy.user_email || "").toLowerCase()] || byName[String(legacy.user_name || "").toLowerCase()];
      if (!row) return;
      row.legacyFourdxGreen += Number(legacy.green_pct || 0);
      row.legacyFourdxRows++;
    });

    return Object.values(byUser).map((row) => {
      const detailedGreenPct = row.fourdxExpected ? Math.round((row.fourdxGreen / row.fourdxExpected) * 100) : 0;
      const legacyGreenPct = row.legacyFourdxRows ? Math.round(row.legacyFourdxGreen / row.legacyFourdxRows) : 0;
      return {
        ...row,
        totalTaskXp: row.taskXp + row.legacyTaskXp,
        totalLearningXp: row.learningXp + row.legacyLearningXp,
        fourdxGreenPct: row.fourdxExpected ? detailedGreenPct : legacyGreenPct
      };
    });
  }

  async function loadDashboardData({ startDate, endDate, currentProfile }) {
    const profiles = await loadVisibleProfiles(currentProfile);
    const [tasks, learning, fourdx, legacy] = await Promise.all([
      loadTeamTasks(startDate, endDate),
      loadTeamLearning(startDate, endDate),
      loadTeamFourdxSummary(startDate, endDate),
      loadLegacySummaries(startDate, endDate)
    ]);

    return buildSummary({
      profiles,
      tasks,
      learning,
      fourdx,
      legacyTaskLearning: legacy.taskLearning,
      legacyFourdx: legacy.fourdx
    });
  }

  function normalizeWeekDate(value, fallback) {
    if (!value) return fallback;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return fallback;
    return parsed.toISOString().slice(0, 10);
  }

  async function importTaskLearningCsv(text) {
    const sb = client();
    if (!sb) return { count: 0 };
    const rows = parseCsv(text);
    const now = new Date().toISOString();
    const payload = rows.map((row) => {
      const date = normalizeWeekDate(pick(row, ["date", "week_end", "weekEnd"]), new Date().toISOString().slice(0, 10));
      return {
        legacy_source: "google_sheet_task_learning",
        legacy_imported_at: now,
        legacy_row_hash: hashRow(row),
        user_name: pick(row, ["userName", "user_name", "name"]),
        user_email: pick(row, ["email", "userEmail", "user_email"]),
        position: pick(row, ["position", "userPosition", "user_position"]),
        week_start: normalizeWeekDate(pick(row, ["weekStart", "week_start"]), date),
        week_end: normalizeWeekDate(pick(row, ["weekEnd", "week_end", "date"]), date),
        row_date: normalizeWeekDate(pick(row, ["date", "row_date"]), date),
        task_percent: parseNumber(pick(row, ["taskPercent", "task_percent"])),
        task_xp: parseNumber(pick(row, ["taskXp", "task_xp"])),
        task_done: parseNumber(pick(row, ["taskDone", "task_done"])),
        task_progress: parseNumber(pick(row, ["taskProgress", "task_progress"])),
        task_blocked: parseNumber(pick(row, ["taskBlocked", "task_blocked"])),
        learning_xp: parseNumber(pick(row, ["learningXp", "learning_xp"])),
        learning_entries: parseNumber(pick(row, ["learningEntries", "learning_entries"])),
        raw_row: row
      };
    });
    if (!payload.length) return { count: 0 };
    const { error } = await sb
      .from("legacy_task_learning_weekly_summaries")
      .upsert(payload, { onConflict: "legacy_row_hash" });
    if (error) throw error;
    return { count: payload.length };
  }

  async function importFourdxCsv(text) {
    const sb = client();
    if (!sb) return { count: 0 };
    const rows = parseCsv(text);
    const now = new Date().toISOString();
    const payload = rows.map((row) => {
      const weekEnd = normalizeWeekDate(pick(row, ["weekEnd", "week_end"]), new Date().toISOString().slice(0, 10));
      return {
        legacy_source: "google_sheet_4dx",
        legacy_imported_at: now,
        legacy_row_hash: hashRow(row),
        user_name: pick(row, ["userName", "user_name", "name"]),
        user_email: pick(row, ["email", "userEmail", "user_email"]),
        user_position: pick(row, ["userPosition", "user_position", "position"]),
        week_start: normalizeWeekDate(pick(row, ["weekStart", "week_start"]), weekEnd),
        week_end: weekEnd,
        lead_name: pick(row, ["leadName", "lead_name"]),
        active_from: normalizeWeekDate(pick(row, ["activeFrom", "active_from"]), weekEnd),
        expected_days: parseNumber(pick(row, ["expectedDays", "expected_days"])),
        filled_days: parseNumber(pick(row, ["filledDays", "filled_days"])),
        miss_days: parseNumber(pick(row, ["missDays", "miss_days"])),
        off_days: parseNumber(pick(row, ["offDays", "off_days"])),
        green_days: parseNumber(pick(row, ["greenDays", "green_days"])),
        yellow_days: parseNumber(pick(row, ["yellowDays", "yellow_days"])),
        red_days: parseNumber(pick(row, ["redDays", "red_days"])),
        green_pct: parseNumber(pick(row, ["greenPct", "green_pct"])),
        completion_pct: parseNumber(pick(row, ["completionPct", "completion_pct"])),
        raw_row: row
      };
    });
    if (!payload.length) return { count: 0 };
    const { error } = await sb
      .from("legacy_fourdx_weekly_summaries")
      .upsert(payload, { onConflict: "legacy_row_hash" });
    if (error) throw error;
    return { count: payload.length };
  }

  window.HoHoDashboardService = {
    loadVisibleProfiles,
    loadTeamTasks,
    loadTeamLearning,
    loadTeamFourdxSummary,
    loadDashboardData,
    importTaskLearningCsv,
    importFourdxCsv,
    parseCsv
  };
})();
