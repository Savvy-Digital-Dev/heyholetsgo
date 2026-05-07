(function () {
  function client() {
    return window.HoHoSupabase && window.HoHoSupabase.client;
  }

  function cleanUserId(value, fallback) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value || "")
      ? value
      : fallback;
  }

  function toDbTask(task, fallbackDate, currentUserId) {
    const ownerId = cleanUserId(task.ownerId || task.owner_id, currentUserId);
    const createdBy = cleanUserId(task.createdBy || task.created_by, currentUserId);
    const assignedBy = cleanUserId(task.assignedBy || task.assigned_by, null);
    return {
      client_id: task.id,
      owner_id: ownerId,
      created_by: createdBy,
      assigned_by: assignedBy,
      delegated_from_task_id: cleanUserId(task.delegatedFromTaskId || task.delegated_from_task_id, null),
      title: task.name || task.title || "",
      effort: Number(task.effort) || 1,
      status: task.status || "none",
      task_date: task.date || task.task_date || fallbackDate,
      source: task.source || (ownerId === currentUserId ? "self" : "assigned"),
      deadline_at: task.deadlineAt || task.deadline_at || null,
      completed_at: task.completedAt || task.completed_at || null,
      created_at: task.createdAt || task.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  }

  function fromDbTask(row) {
    return {
      id: row.client_id || row.id,
      remoteId: row.id,
      ownerId: row.owner_id,
      createdBy: row.created_by,
      assignedBy: row.assigned_by,
      delegatedFromTaskId: row.delegated_from_task_id,
      name: row.title,
      effort: row.effort,
      status: row.status,
      source: row.source,
      deadlineAt: row.deadline_at || null,
      taskDate: row.task_date,
      date: row.task_date,
      completedAt: row.completed_at || null,
      createdAt: row.created_at
    };
  }

  function groupByDate(rows) {
    return (rows || []).reduce((acc, row) => {
      const dateKey = row.task_date;
      if (!acc[dateKey]) acc[dateKey] = [];
      acc[dateKey].push(fromDbTask(row));
      return acc;
    }, {});
  }

  async function loadMyTasks(userId) {
    const sb = client();
    if (!sb || !userId) return {};
    const { data, error } = await sb
      .from("tasks")
      .select("*")
      .eq("owner_id", userId)
      .order("task_date", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) throw error;
    return groupByDate(data);
  }

  async function replaceMyTasks(tasksByDate, userId) {
    const sb = client();
    if (!sb || !userId) return;

    const rows = [];
    Object.keys(tasksByDate || {}).forEach((dateKey) => {
      (tasksByDate[dateKey] || []).forEach((task) => {
        rows.push(toDbTask(task, dateKey, userId));
      });
    });

    if (!rows.length) return;

    const { error } = await sb
      .from("tasks")
      .upsert(rows, { onConflict: "owner_id,client_id" });
    if (error) throw error;
  }

  async function createTask(input, currentUserId) {
    const sb = client();
    if (!sb) return null;
    const row = toDbTask(input, input.task_date || input.date, currentUserId);
    const { data, error } = await sb.from("tasks").insert(row).select("*").single();
    if (error) throw error;
    return fromDbTask(data);
  }

  async function updateTask(taskId, patch) {
    const sb = client();
    if (!sb || !taskId) return null;
    const dbPatch = Object.assign({}, patch, { updated_at: new Date().toISOString() });
    if (patch.deadlineAt !== undefined) {
      dbPatch.deadline_at = patch.deadlineAt || null;
      delete dbPatch.deadlineAt;
    }
    if (patch.completedAt !== undefined) {
      dbPatch.completed_at = patch.completedAt || null;
      delete dbPatch.completedAt;
    }
    const { data, error } = await sb
      .from("tasks")
      .update(dbPatch)
      .eq("id", taskId)
      .select("*")
      .single();
    if (error) throw error;
    return fromDbTask(data);
  }

  async function deleteTask(taskId) {
    const sb = client();
    if (!sb || !taskId) return;
    const { error } = await sb.from("tasks").delete().eq("id", taskId);
    if (error) throw error;
  }

  function taskXpForStatus(effort, status) {
    const base = { 1: 10, 2: 20, 3: 30 }[Number(effort)] || 0;
    if (status === "done") return base;
    if (status === "progress") return Math.round(base * 0.2);
    return 0;
  }

  async function upsertDailyUpdate(task, userId, status, updateDate) {
    const sb = client();
    const taskId = task && (task.remoteId || task.id);
    if (!sb || !taskId || !userId || !["progress", "done"].includes(status)) return null;
    const row = {
      task_id: taskId,
      user_id: userId,
      update_date: updateDate,
      status,
      xp: taskXpForStatus(task.effort, status),
      updated_at: new Date().toISOString()
    };
    const { data, error } = await sb
      .from("task_daily_updates")
      .upsert(row, { onConflict: "task_id,user_id,update_date" })
      .select("*")
      .single();
    if (error) throw error;
    return data;
  }

  async function loadMyDailyUpdates(userId, startDate, endDate) {
    const sb = client();
    if (!sb || !userId) return [];
    let query = sb
      .from("task_daily_updates")
      .select("*")
      .eq("user_id", userId)
      .order("update_date", { ascending: true });
    if (startDate) query = query.gte("update_date", startDate);
    if (endDate) query = query.lte("update_date", endDate);
    const { data, error } = await query;
    if (error) {
      if (error.code === "42P01" || error.code === "42703") return [];
      throw error;
    }
    return data || [];
  }

  window.HoHoTaskService = {
    loadMyTasks,
    replaceMyTasks,
    createTask,
    updateTask,
    deleteTask,
    upsertDailyUpdate,
    loadMyDailyUpdates,
    fromDbTask,
    toDbTask,
    taskXpForStatus
  };
})();
