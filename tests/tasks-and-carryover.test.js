const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function loadTasksDomain() {
  const code = fs.readFileSync('assets/js/domain/tasks.js', 'utf8');
  const context = {
    appState: { tasks: {} },
    saveState: () => {},
    generateId: () => 'id_test'
  };
  vm.createContext(context);
  vm.runInContext(code, context);
  return context;
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

test('getTaskDailyXp returns correct XP by status', () => {
  const ctx = loadTasksDomain();

  assert.equal(ctx.getTaskDailyXp({ effort: 2, status: 'none' }), 0);
  assert.equal(ctx.getTaskDailyXp({ effort: 2, status: 'progress' }), 4);
  assert.equal(ctx.getTaskDailyXp({ effort: 2, status: 'done' }), 20);
});

test('computeDayTaskPercent handles empty day and normal day', () => {
  const ctx = loadTasksDomain();

  assert.equal(ctx.computeDayTaskPercent('2026-04-03'), 0);

  ctx.appState.tasks['2026-04-03'] = [
    { effort: 1, status: 'done' },
    { effort: 3, status: 'progress' }
  ];

  // base: 10 + 30 = 40, gained: 10 + 6 = 16 => 40%
  assert.equal(ctx.computeDayTaskPercent('2026-04-03'), 40);
});

test('carryOverFromYesterday uses getTodayKey and avoids duplicates on same day reopen', () => {
  const carryOverFn = extractFunctionSource('assets/js/main.js', 'carryOverFromYesterday');

  const context = {
    appState: {
      lastOpenDate: null,
      tasks: {
        '2026-04-02': [
          { id: 'y1', name: 'Task A', effort: 2, status: 'none' },
          { id: 'y2', name: 'Task B', effort: 1, status: 'done' }
        ],
        '2026-04-03': []
      }
    },
    getTodayKey: () => '2026-04-03',
    shiftDateKey: () => '2026-04-02',
    generateId: () => 'new-id',
    saveState: () => {},
    Date
  };

  vm.createContext(context);
  vm.runInContext(`${carryOverFn}; this.carryOverFromYesterday = carryOverFromYesterday;`, context);

  // First open should carry only non-done tasks.
  context.carryOverFromYesterday();
  assert.equal(context.appState.tasks['2026-04-03'].length, 1);
  assert.equal(context.appState.tasks['2026-04-03'][0].name, 'Task A');

  // Reopen same day should not duplicate carried tasks.
  context.carryOverFromYesterday();
  assert.equal(context.appState.tasks['2026-04-03'].length, 1);
});
