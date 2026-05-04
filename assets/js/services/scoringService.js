(function () {
  const TASK_XP = { 1: 10, 2: 20, 3: 30 };
  const LEARNING_XP = { 1: 5, 2: 10, 3: 20 };

  function taskXp(task) {
    const base = TASK_XP[Number(task && task.effort)] || 0;
    if (!task) return 0;
    if (task.status === "done") return base;
    if (task.status === "progress") return Math.round(base * 0.2);
    return 0;
  }

  function learningXp(entry) {
    return LEARNING_XP[Number(entry && entry.effort)] || 0;
  }

  window.HoHoScoringService = {
    taskXp,
    learningXp,
    TASK_XP,
    LEARNING_XP
  };
})();
