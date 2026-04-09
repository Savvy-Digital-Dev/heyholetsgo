// assets/js/domain/tasks.js
// --------------------------------------
// DOMAIN LOGIC UNTUK TASKS
// --------------------------------------

// Hitung XP base berdasarkan effort 1 / 2 / 3
function getTaskBaseXp(task) {
  if (!task) return 0;
  if (task.effort === 1) return 10;
  if (task.effort === 2) return 20;
  if (task.effort === 3) return 30;
  return 0;
}

// XP final berdasarkan status: none = 0, progress = 20%, done = 100%
function getTaskDailyXp(task) {
  const base = getTaskBaseXp(task);
  if (task.status === "done") return base;
  if (task.status === "progress") return Math.round(base * 0.2);
  return 0;
}

// Hitung semua XP di 1 hari
function computeDayTaskXp(dateKey) {
  const list = appState.tasks[dateKey] || [];
  return list.reduce((sum, t) => sum + getTaskDailyXp(t), 0);
}

// Hitung % dopamine harian berdasarkan XP didapat / total XP task hari itu (maks 100%)
function computeDayTaskPercent(dateKey) {
  const list = appState.tasks[dateKey] || [];
  const totalBase = list.reduce((sum, t) => sum + getTaskBaseXp(t), 0);
  if (totalBase === 0) return 0;

  const gained = computeDayTaskXp(dateKey);
  const percent = Math.round((gained / totalBase) * 100);
  return Math.min(percent, 100);
}

// Tambah task baru
function addTask(dateKey, name, effort) {
  const newTask = {
    id: generateId(),
    name,
    effort,
    status: "none",
    createdAt: Date.now()
  };

  if (!appState.tasks[dateKey]) appState.tasks[dateKey] = [];
  appState.tasks[dateKey].push(newTask);
  saveState();

  return newTask;
}

// Edit task (rename)
function renameTask(dateKey, taskId, newName) {
  const list = appState.tasks[dateKey] || [];
  const t = list.find(t => t.id === taskId);
  if (!t) return;
  t.name = newName;
  saveState();
}

// Edit effort
function updateTaskEffort(dateKey, taskId, newEffort) {
  const list = appState.tasks[dateKey] || [];
  const t = list.find(t => t.id === taskId);
  if (!t) return;
  t.effort = newEffort;
  saveState();
}

// Ubah status
function updateTaskStatus(dateKey, taskId, status) {
  const list = appState.tasks[dateKey] || [];
  const t = list.find(t => t.id === taskId);
  if (!t) return;
  t.status = status;
  saveState();
}

// Hapus task
function deleteTask(dateKey, taskId) {
  const list = appState.tasks[dateKey] || [];
  appState.tasks[dateKey] = list.filter(t => t.id !== taskId);
  saveState();
}
