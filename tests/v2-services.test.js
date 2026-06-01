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

function extractFunctionSource(filePath, functionName) {
  const source = fs.readFileSync(filePath, 'utf8');
  const signature = `function ${functionName}(`;
  const start = source.indexOf(signature);
  if (start === -1) {
    throw new Error(`Function ${functionName} not found in ${filePath}`);
  }

  let braceIndex = source.indexOf('{', start);
  let depth = 0;
  let end = braceIndex;

  for (let i = braceIndex; i < source.length; i++) {
    const ch = source[i];
    if (ch === '{') depth += 1;
    if (ch === '}') depth -= 1;
    if (depth === 0) {
      end = i;
      break;
    }
  }

  return source.slice(start, end + 1);
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

test('task service maps deadline timestamp and daily XP rules', () => {
  const win = runBrowserScript('assets/js/services/taskService.js');
  const userId = '11111111-1111-4111-8111-111111111111';

  const row = win.HoHoTaskService.toDbTask({
    id: 'deadline-id',
    name: 'Launch review',
    effort: 3,
    status: 'none',
    deadlineAt: '2026-05-07T08:30:00.000Z'
  }, '2026-05-07', userId);

  assert.equal(row.deadline_at, '2026-05-07T08:30:00.000Z');
  assert.equal(win.HoHoTaskService.taskXpForStatus(3, 'progress'), 6);
  assert.equal(win.HoHoTaskService.taskXpForStatus(3, 'done'), 30);
  assert.equal(win.HoHoTaskService.taskXpForStatus(3, 'blocked'), 0);
});

test('task service effort update calls admin recalculation RPC', async () => {
  const calls = [];
  const win = runBrowserScript('assets/js/services/taskService.js', {
    window: {
      HoHoSupabase: {
        client: {
          rpc: async (name, payload) => {
            calls.push({ name, payload });
            return {
              data: {
                id: payload.target_task_id,
                client_id: 'client-1',
                owner_id: '11111111-1111-4111-8111-111111111111',
                created_by: '11111111-1111-4111-8111-111111111111',
                title: 'Corrected effort task',
                effort: payload.new_effort,
                status: 'progress',
                task_date: '2026-05-07',
                source: 'self'
              },
              error: null
            };
          }
        }
      }
    }
  });

  const updated = await win.HoHoTaskService.updateTaskEffort('22222222-2222-4222-8222-222222222222', 1);

  assert.equal(calls[0].name, 'admin_update_task_effort');
  assert.equal(calls[0].payload.new_effort, 1);
  assert.equal(updated.effort, 1);
});

test('profile service disables and restores managed user access', async () => {
  const calls = [];
  const chain = {
    update(payload) {
      calls.push({ type: 'update', payload });
      return this;
    },
    eq(column, value) {
      calls.push({ type: 'eq', column, value });
      return this;
    },
    select() {
      return this;
    },
    single() {
      const lastUpdate = calls.filter((call) => call.type === 'update').at(-1);
      return Promise.resolve({
        data: { id: 'user-1', email: 'user@example.com', status: lastUpdate.payload.status },
        error: null
      });
    }
  };
  const win = runBrowserScript('assets/js/services/profileService.js', {
    window: {
      HoHoSupabase: {
        client: {
          from: (table) => {
            calls.push({ type: 'from', table });
            return chain;
          }
        }
      }
    }
  });

  const disabled = await win.HoHoProfileService.disableUser('user-1');
  const restored = await win.HoHoProfileService.restoreUser('user-1');

  assert.equal(disabled.status, 'disabled');
  assert.equal(restored.status, 'active');
  assert.deepEqual(calls.filter((call) => call.type === 'update').map((call) => call.payload.status), ['disabled', 'active']);
});

test('cloud service rejects disabled profile during hydrate', async () => {
  const win = runBrowserScript('assets/js/services/cloudService.js', {
    window: {
      HoHoAuthService: { isConfigured: () => true },
      HoHoProfileService: {
        ensureCurrentProfile: async () => ({ id: 'user-1', email: 'user@example.com', status: 'disabled' }),
        listAssignableProfiles: async () => []
      }
    }
  });

  await assert.rejects(
    () => win.HoHoCloudService.hydrate({ user: { id: 'user-1', email: 'user@example.com' } }),
    (err) => err.code === 'PROFILE_DISABLED' && /dinonaktifkan/.test(err.message)
  );
});

test('dashboard CSV parser handles quoted cells and normalized headers', () => {
  const win = runBrowserScript('assets/js/services/dashboardService.js');
  const rows = win.HoHoDashboardService.parseCsv('User Name,Task XP,Learning XP\n"Anissa, Admin",20,10\n');

  assert.equal(rows.length, 1);
  assert.equal(rows[0].user_name, 'Anissa, Admin');
  assert.equal(rows[0].task_xp, '20');
  assert.equal(rows[0].learning_xp, '10');
});

test('active task list dedupes repeated open tasks while keeping original references', () => {
  const source = fs.readFileSync('assets/js/main.js', 'utf8');
  const functionNames = [
    'allTasksList',
    'normalizeTaskDedupeValue',
    'activeTaskDedupeKey',
    'compareTaskAge',
    'activeTasksList'
  ];
  const context = {
    appState: {
      tasks: {
        '2026-05-01': [
          { id: 'old', ownerId: 'u1', source: 'self', name: 'Follow up client', effort: 2, status: 'progress', createdAt: '2026-05-01T01:00:00Z' }
        ],
        '2026-05-02': [
          { id: 'new', ownerId: 'u1', source: 'self', name: '  follow   up CLIENT  ', effort: 2, status: 'none', createdAt: '2026-05-02T01:00:00Z' },
          { id: 'done', ownerId: 'u1', source: 'self', name: 'Done task', effort: 1, status: 'done', createdAt: '2026-05-02T02:00:00Z' }
        ]
      }
    }
  };

  vm.createContext(context);
  functionNames.forEach((name) => {
    vm.runInContext(`${extractFunctionSource('assets/js/main.js', name)}; this.${name} = ${name};`, context);
  });

  const active = context.activeTasksList();

  assert.equal(active.length, 1);
  assert.equal(active[0].id, 'old');
  assert.equal(active[0]._hiddenDuplicateCount, 1);
  active[0].status = 'done';
  assert.equal(context.appState.tasks['2026-05-01'][0].status, 'done');
});

test('bulk delete candidates expand selected active task to duplicate group', () => {
  const functionNames = [
    'allTasksList',
    'normalizeTaskDedupeValue',
    'activeTaskDedupeKey',
    'compareTaskAge',
    'activeTasksList',
    'taskRemoteId',
    'taskSelectionKey',
    'activeDuplicateGroupTasks',
    'uniqueTasksBySelectionKey'
  ];
  const context = {
    appState: {
      tasks: {
        '2026-05-01': [
          { id: 'old', ownerId: 'u1', source: 'self', name: 'Follow up client', effort: 2, status: 'progress', createdAt: '2026-05-01T01:00:00Z' }
        ],
        '2026-05-02': [
          { id: 'new', ownerId: 'u1', source: 'self', name: 'follow up client', effort: 2, status: 'none', createdAt: '2026-05-02T01:00:00Z' },
          { id: 'other', ownerId: 'u1', source: 'self', name: 'Different task', effort: 2, status: 'none', createdAt: '2026-05-02T02:00:00Z' }
        ]
      }
    }
  };

  vm.createContext(context);
  functionNames.forEach((name) => {
    vm.runInContext(`${extractFunctionSource('assets/js/main.js', name)}; this.${name} = ${name};`, context);
  });

  const active = context.activeTasksList();
  const selected = active.filter((task) => task.id === 'old');
  const candidates = context.uniqueTasksBySelectionKey(context.activeDuplicateGroupTasks(selected));

  assert.equal(JSON.stringify(candidates.map((task) => task.id).sort()), JSON.stringify(['new', 'old']));
});

test('analytics service summarizes behavior events into product metrics', () => {
  const win = runBrowserScript('assets/js/services/analyticsService.js', {
    localStorage: {
      getItem: () => null,
      setItem: () => {}
    },
    navigator: { userAgent: 'test', language: 'en' },
    crypto: { randomUUID: () => '11111111-1111-4111-8111-111111111111' },
    setTimeout,
    clearTimeout,
    innerWidth: 1200,
    innerHeight: 800
  });

  const summary = win.HoHoAnalyticsService.summarizeEvents([
    { user_id: 'u1', event_name: 'task_created', feature_area: 'tasks', properties: {} },
    { user_id: 'u1', event_name: 'task_status_changed', feature_area: 'tasks', properties: { to_status: 'done' } },
    { user_id: 'u2', event_name: 'deadline_overdue_seen', feature_area: 'tasks', properties: {} },
    { user_id: 'u2', event_name: 'effort_corrected_by_admin', feature_area: 'dashboard', properties: {} },
    { user_id: 'u2', event_name: 'error_seen', feature_area: 'friction', properties: {} }
  ], [{ id: 's1' }], [], []);

  assert.equal(summary.activeUsers, 2);
  assert.equal(summary.sessionCount, 1);
  assert.equal(summary.taskCreated, 1);
  assert.equal(summary.taskDone, 1);
  assert.equal(summary.overdueSeen, 1);
  assert.equal(summary.errors, 1);
  assert.equal(summary.featureCounts.tasks, 3);
});

test('analytics service summarizes active time and caps invalid durations', () => {
  const win = runBrowserScript('assets/js/services/analyticsService.js', {
    localStorage: {
      getItem: () => null,
      setItem: () => {}
    },
    navigator: { userAgent: 'test', language: 'en' },
    crypto: { randomUUID: () => '11111111-1111-4111-8111-111111111111' },
    setTimeout,
    clearTimeout,
    innerWidth: 1200,
    innerHeight: 800
  });

  const summary = win.HoHoAnalyticsService.summarizeEvents([
    { user_id: 'u1', event_name: 'feature_time_spent', feature_area: 'tasks', properties: { feature_area: 'tasks', duration_seconds: 120 } },
    { user_id: 'u1', event_name: 'feature_time_spent', feature_area: 'learning', properties: { feature_area: 'learning', duration_seconds: 2 } },
    { user_id: 'u2', event_name: 'feature_time_spent', feature_area: 'fourdx', properties: { feature_area: 'fourdx', duration_seconds: 99999 } }
  ], [
    { id: 's1', started_at: '2026-05-18T01:00:00.000Z', last_seen_at: '2026-05-18T01:10:00.000Z' },
    { id: 's2', started_at: '2026-05-18T02:00:00.000Z', last_seen_at: '2026-05-18T03:00:00.000Z' }
  ], [], []);

  assert.equal(summary.totalActiveSeconds, 1920);
  assert.equal(summary.featureTimeSeconds.tasks, 120);
  assert.equal(summary.featureTimeSeconds.fourdx, 1800);
  assert.equal(summary.featureTimeSeconds.learning, undefined);
  assert.equal(summary.averageActiveSecondsPerUser, 960);
  assert.equal(summary.averageSessionSeconds, 1200);
});
