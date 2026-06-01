(function () {
  const QUEUE_KEY = "hoho_analytics_event_queue_v1";
  const MAX_QUEUE = 80;
  const FLUSH_DELAY_MS = 1200;
  const RAW_EVENT_RETENTION_DAYS = 180;
  const MIN_TIME_SPENT_SECONDS = 3;
  const MAX_TIME_SPENT_SECONDS = 30 * 60;

  let currentUser = null;
  let currentProfile = null;
  let sessionId = null;
  let flushTimer = null;
  let flushing = false;
  let activeTab = null;
  let activeFeatureArea = null;
  let activeStartedAt = null;

  function client() {
    return window.HoHoSupabase && window.HoHoSupabase.client;
  }

  function todayKey() {
    return new Date().toISOString().slice(0, 10);
  }

  function readQueue() {
    try {
      const raw = localStorage.getItem(QUEUE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (err) {
      return [];
    }
  }

  function writeQueue(queue) {
    try {
      localStorage.setItem(QUEUE_KEY, JSON.stringify((queue || []).slice(-MAX_QUEUE)));
    } catch (err) {
      // Analytics must never break the app.
    }
  }

  function safeProperties(properties) {
    const input = properties || {};
    const output = {};
    Object.keys(input).forEach((key) => {
      const value = input[key];
      if (value === undefined || typeof value === "function") return;
      if (typeof value === "string") output[key] = value.slice(0, 180);
      else if (typeof value === "number" || typeof value === "boolean" || value === null) output[key] = value;
      else output[key] = value;
    });
    return output;
  }

  function deviceInfo() {
    return {
      userAgent: String(navigator.userAgent || "").slice(0, 180),
      language: navigator.language || "",
      viewport: `${window.innerWidth || 0}x${window.innerHeight || 0}`
    };
  }

  async function startSession(user, profile) {
    currentUser = user || currentUser;
    currentProfile = profile || currentProfile;
    if (!currentUser || !client()) return null;
    sessionId = sessionId || (crypto.randomUUID ? crypto.randomUUID() : "session_" + Date.now());
    try {
      await client().from("analytics_sessions").upsert({
        id: sessionId,
        user_id: currentUser.id,
        started_at: new Date().toISOString(),
        last_seen_at: new Date().toISOString(),
        device_info: deviceInfo()
      }, { onConflict: "id" });
      track("app_open", { role: currentProfile && currentProfile.role }, { featureArea: "core" });
      return sessionId;
    } catch (err) {
      return sessionId;
    }
  }

  function track(eventName, properties, options) {
    if (!currentUser || !eventName) return;
    const opts = options || {};
    const event = {
      user_id: currentUser.id,
      session_id: sessionId,
      event_name: eventName,
      feature_area: opts.featureArea || inferFeatureArea(eventName),
      entity_type: opts.entityType || null,
      entity_id: opts.entityId ? String(opts.entityId) : null,
      properties: safeProperties(properties),
      created_at: new Date().toISOString()
    };
    const queue = readQueue();
    queue.push(event);
    writeQueue(queue);
    scheduleFlush();
  }

  function inferFeatureArea(eventName) {
    if (eventName === "feature_time_spent") return "engagement";
    if (eventName.startsWith("task_") || eventName.startsWith("deadline_")) return "tasks";
    if (eventName.startsWith("learning_")) return "learning";
    if (eventName.startsWith("fourdx_")) return "fourdx";
    if (eventName.startsWith("dashboard_")) return "dashboard";
    if (eventName.includes("import")) return "migration";
    if (eventName.includes("error")) return "friction";
    return "core";
  }

  function featureAreaForTab(tabId) {
    const map = {
      tasksTab: "tasks",
      fourdxTab: "fourdx",
      learningTab: "learning",
      dashboardTab: "dashboard",
      insightsTab: "insights",
      settingsTab: "settings"
    };
    return map[tabId] || "core";
  }

  function boundedDurationSeconds(startedAtMs, endedAtMs) {
    if (!startedAtMs || !endedAtMs || endedAtMs <= startedAtMs) return 0;
    return sanitizeDurationSeconds(Math.round((endedAtMs - startedAtMs) / 1000));
  }

  function sanitizeDurationSeconds(seconds) {
    const value = Math.round(Number(seconds || 0));
    if (!Number.isFinite(value) || value < MIN_TIME_SPENT_SECONDS) return 0;
    return Math.min(value, MAX_TIME_SPENT_SECONDS);
  }

  function recordActiveTime(reason) {
    if (!activeTab || !activeStartedAt || !currentUser) return 0;
    const endedAtMs = Date.now();
    const durationSeconds = boundedDurationSeconds(activeStartedAt, endedAtMs);
    if (durationSeconds > 0) {
      track("feature_time_spent", {
        feature_area: activeFeatureArea || featureAreaForTab(activeTab),
        tab: activeTab,
        duration_seconds: durationSeconds,
        started_at: new Date(activeStartedAt).toISOString(),
        ended_at: new Date(endedAtMs).toISOString(),
        reason: reason || "unknown"
      }, {
        featureArea: activeFeatureArea || featureAreaForTab(activeTab),
        entityType: "tab",
        entityId: activeTab
      });
    }
    return durationSeconds;
  }

  function startFeatureTimer(tabId) {
    if (!currentUser || !tabId) return;
    activeTab = tabId;
    activeFeatureArea = featureAreaForTab(tabId);
    activeStartedAt = Date.now();
  }

  function switchFeature(tabId) {
    if (!currentUser || !tabId) return;
    if (activeTab && activeTab !== tabId) recordActiveTime("tab_change");
    if (!activeTab || activeTab !== tabId || !activeStartedAt) startFeatureTimer(tabId);
  }

  function pauseFeature(reason) {
    recordActiveTime(reason || "pause");
    activeStartedAt = null;
  }

  function resumeFeature(tabId) {
    if (!currentUser || activeStartedAt) return;
    startFeatureTimer(tabId || activeTab || "tasksTab");
  }

  async function endSession(options) {
    pauseFeature("session_end");
    if (options && options.flush) await flushEvents();
  }

  function scheduleFlush() {
    window.clearTimeout(flushTimer);
    flushTimer = window.setTimeout(() => {
      flushEvents();
    }, FLUSH_DELAY_MS);
  }

  async function flushEvents() {
    if (flushing || !client()) return;
    const queue = readQueue();
    if (!queue.length) return;
    flushing = true;
    try {
      const { error } = await client().from("app_events").insert(queue);
      if (error) throw error;
      writeQueue([]);
      if (sessionId && currentUser) {
        await client().from("analytics_sessions").update({ last_seen_at: new Date().toISOString() }).eq("id", sessionId).eq("user_id", currentUser.id);
      }
    } catch (err) {
      writeQueue(queue);
    } finally {
      flushing = false;
    }
  }

  function reset() {
    pauseFeature("reset");
    currentUser = null;
    currentProfile = null;
    sessionId = null;
    activeTab = null;
    activeFeatureArea = null;
    activeStartedAt = null;
  }

  function summarizeEvents(events, sessions, summaries, insights) {
    const rows = events || [];
    const sessionRows = sessions || [];
    const eventCounts = {};
    const featureCounts = {};
    const activeUsers = new Set();
    let taskCreated = 0;
    let taskDone = 0;
    let taskDeleted = 0;
    let learningCreated = 0;
    let fourdxCheckin = 0;
    let overdueSeen = 0;
    let effortCorrections = 0;
    let bulkDelete = 0;
    let errors = 0;
    let totalActiveSeconds = 0;
    const featureTimeSeconds = {};

    rows.forEach((event) => {
      activeUsers.add(event.user_id);
      eventCounts[event.event_name] = (eventCounts[event.event_name] || 0) + 1;
      featureCounts[event.feature_area || "general"] = (featureCounts[event.feature_area || "general"] || 0) + 1;
      if (event.event_name === "feature_time_spent") {
        const props = event.properties || {};
        const featureArea = props.feature_area || event.feature_area || "general";
        const duration = sanitizeDurationSeconds(props.duration_seconds);
        if (duration > 0) {
          totalActiveSeconds += duration;
          featureTimeSeconds[featureArea] = (featureTimeSeconds[featureArea] || 0) + duration;
        }
      }
      if (event.event_name === "task_created") taskCreated++;
      if (event.event_name === "task_status_changed" && event.properties && event.properties.to_status === "done") taskDone++;
      if (event.event_name === "task_deleted") taskDeleted++;
      if (event.event_name === "task_bulk_deleted") bulkDelete++;
      if (event.event_name === "learning_created") learningCreated++;
      if (event.event_name === "fourdx_checkin") fourdxCheckin++;
      if (event.event_name === "deadline_overdue_seen") overdueSeen++;
      if (event.event_name === "effort_corrected_by_admin") effortCorrections++;
      if (event.event_name === "error_seen") errors++;
    });

    if (!totalActiveSeconds && summaries && summaries.length) {
      summaries.forEach((summary) => {
        totalActiveSeconds += Number(summary.total_active_seconds || 0);
        const featureTimes = summary.feature_time_seconds || {};
        Object.keys(featureTimes).forEach((feature) => {
          featureTimeSeconds[feature] = (featureTimeSeconds[feature] || 0) + Number(featureTimes[feature] || 0);
        });
      });
    }

    const sessionDurations = sessionRows.map((session) => {
      const startedAt = Date.parse(session.started_at);
      const endedAt = Date.parse(session.last_seen_at || session.started_at);
      if (!startedAt || !endedAt || endedAt <= startedAt) return 0;
      return Math.min(Math.round((endedAt - startedAt) / 1000), MAX_TIME_SPENT_SECONDS);
    }).filter(Boolean);
    const averageSessionSeconds = sessionDurations.length
      ? Math.round(sessionDurations.reduce((sum, value) => sum + value, 0) / sessionDurations.length)
      : 0;
    const averageActiveSecondsPerUser = activeUsers.size ? Math.round(totalActiveSeconds / activeUsers.size) : 0;

    const suggestedInsights = [];
    if (overdueSeen >= 5) {
      suggestedInsights.push({
        insight_type: "overdue_tasks",
        severity: "warning",
        title: "Overdue task signal is rising",
        evidence_json: { overdue_seen: overdueSeen },
        suggested_action: "Consider a priority queue, overdue filter, or reminder UX."
      });
    }
    if (effortCorrections >= 3) {
      suggestedInsights.push({
        insight_type: "effort_quality",
        severity: "warning",
        title: "Admins are correcting task effort frequently",
        evidence_json: { effort_corrections: effortCorrections },
        suggested_action: "Add effort guidelines or examples near task input."
      });
    }
    if (taskCreated > 0 && taskDone / taskCreated < 0.35) {
      suggestedInsights.push({
        insight_type: "task_completion",
        severity: "info",
        title: "Task completion ratio is low",
        evidence_json: { task_created: taskCreated, task_done: taskDone },
        suggested_action: "Review task carry-over, deadline nudges, and blockers."
      });
    }
    if (learningCreated === 0 && taskCreated >= 5) {
      suggestedInsights.push({
        insight_type: "learning_adoption",
        severity: "info",
        title: "Learning usage is low relative to task activity",
        evidence_json: { task_created: taskCreated, learning_created: learningCreated },
        suggested_action: "Consider a lightweight learning prompt after task completion."
      });
    }
    if (activeUsers.size > 0 && averageActiveSecondsPerUser < 300) {
      suggestedInsights.push({
        insight_type: "low_active_time",
        severity: "info",
        title: "Average active HoHo time is low",
        evidence_json: { average_active_seconds_per_user: averageActiveSecondsPerUser },
        suggested_action: "Review onboarding, daily habit prompts, or whether the most important workflows are easy to reach."
      });
    }
    Object.keys(featureTimeSeconds).forEach((feature) => {
      if (featureTimeSeconds[feature] >= 20 * 60 && taskDone + learningCreated + fourdxCheckin < 3) {
        suggestedInsights.push({
          insight_type: "high_time_low_output",
          severity: "warning",
          title: `High time spent in ${feature} with low output`,
          evidence_json: { feature, seconds: featureTimeSeconds[feature], outputs: taskDone + learningCreated + fourdxCheckin },
          suggested_action: "Inspect the workflow for friction, unclear UI, or repeated manual work."
        });
      }
    });

    return {
      activeUsers: activeUsers.size,
      sessionCount: sessionRows.length,
      eventCount: rows.length,
      taskCreated,
      taskDone,
      taskDeleted,
      bulkDelete,
      learningCreated,
      fourdxCheckin,
      overdueSeen,
      effortCorrections,
      errors,
      totalActiveSeconds,
      averageActiveSecondsPerUser,
      averageSessionSeconds,
      featureTimeSeconds,
      eventCounts,
      featureCounts,
      summaries: summaries || [],
      storedInsights: insights || [],
      suggestedInsights
    };
  }

  async function loadInsights(startDate, endDate) {
    const sb = client();
    if (!sb) return summarizeEvents([], [], [], []);
    const startIso = `${startDate}T00:00:00.000Z`;
    const endIso = `${endDate}T23:59:59.999Z`;
    const [eventsRes, sessionsRes, summariesRes, insightsRes] = await Promise.all([
      sb.from("app_events").select("*").gte("created_at", startIso).lte("created_at", endIso).order("created_at", { ascending: false }).limit(5000),
      sb.from("analytics_sessions").select("*").gte("started_at", startIso).lte("started_at", endIso),
      sb.from("analytics_daily_summaries").select("*").gte("summary_date", startDate).lte("summary_date", endDate),
      sb.from("product_insights").select("*").order("created_at", { ascending: false }).limit(20)
    ]);
    [eventsRes, sessionsRes, summariesRes, insightsRes].forEach((res) => {
      if (res.error && res.error.code !== "42P01") throw res.error;
    });
    return summarizeEvents(eventsRes.data || [], sessionsRes.data || [], summariesRes.data || [], insightsRes.data || []);
  }

  function retentionDays() {
    return RAW_EVENT_RETENTION_DAYS;
  }

  window.HoHoAnalyticsService = {
    startSession,
    track,
    flushEvents,
    reset,
    startFeatureTimer,
    switchFeature,
    pauseFeature,
    resumeFeature,
    endSession,
    loadInsights,
    summarizeEvents,
    retentionDays
  };
})();
