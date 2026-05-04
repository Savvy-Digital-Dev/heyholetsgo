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
      taskDate: row.task_date,
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

    const { error: deleteError } = await sb.from("tasks").delete().eq("owner_id", userId);
    if (deleteError) throw deleteError;
    if (!rows.length) return;

    const { error } = await sb.from("tasks").insert(rows);
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

  window.HoHoTaskService = {
    loadMyTasks,
    replaceMyTasks,
    createTask,
    fromDbTask,
    toDbTask
  };
})();
