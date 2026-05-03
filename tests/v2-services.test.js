const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function runBrowserScript(filePath, extra = {}) {
  const context = {
    console,
    window: {},
    ...extra
  };
  context.window.window = context.window;
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(filePath, 'utf8'), context);
  return context.window;
}

test('scoring service keeps HoHo v2 task and learning XP rules', () => {
  const win = runBrowserScript('assets/js/services/scoringService.js');

  assert.equal(win.HoHoScoringService.taskXp({ effort: 3, status: 'done' }), 30);
  assert.equal(win.HoHoScoringService.taskXp({ effort: 3, status: 'progress' }), 6);
  assert.equal(win.HoHoScoringService.taskXp({ effort: 3, status: 'blocked' }), 0);
  assert.equal(win.HoHoScoringService.learningXp({ effort: 2 }), 10);
});

test('task service maps app tasks to Supabase rows with safe user ids', () => {
  const win = runBrowserScript('assets/js/services/taskService.js');
  const userId = '11111111-1111-4111-8111-111111111111';

  const row = win.HoHoTaskService.toDbTask({
    id: 'legacy-id',
    ownerId: 'local',
    createdBy: 'local',
    name: 'Assigned launch checklist',
    effort: 2,
    status: 'none',
    source: 'self'
  }, '2026-05-03', userId);

  assert.equal(row.client_id, 'legacy-id');
  assert.equal(row.owner_id, userId);
  assert.equal(row.created_by, userId);
  assert.equal(row.title, 'Assigned launch checklist');
  assert.equal(row.task_date, '2026-05-03');
});

test('dashboard CSV parser handles quoted cells and normalized headers', () => {
  const win = runBrowserScript('assets/js/services/dashboardService.js');
  const rows = win.HoHoDashboardService.parseCsv('User Name,Task XP,Learning XP\n"Anissa, Admin",20,10\n');

  assert.equal(rows.length, 1);
  assert.equal(rows[0].user_name, 'Anissa, Admin');
  assert.equal(rows[0].task_xp, '20');
  assert.equal(rows[0].learning_xp, '10');
});
