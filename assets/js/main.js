// HeyHoLetsGo – V1.3.7 STABLE
// Struktur: state.js terpisah, semua domain + UI di main.js
// Dipakai tim per 01 Desember 2025
const GOOGLE_SHEET_WEBHOOK_URL = "https://script.google.com/macros/s/AKfycbzTUS-s1rX7dfJlzc7RCbxPmsqZXeIQo70FNRnNabpbjH6KenY4AxsWK0xSkimy8MCC/exec";
const FOURDX_WEEKLY_WEBHOOK_URL = "https://script.google.com/macros/s/AKfycbwm_x-Ig_ixU1CN6RRta8q5RJoUZ_TbFcUygadu5OuEGMlKKWULrvGycvEvs0MzUPy5/exec";
const TASK_XP_PER_EFFORT = { 1: 10, 2: 20, 3: 30 };
const DAILY_TASK_XP_TARGET = 60;
const LEARNING_XP_PER_EFFORT = { 1: 5, 2: 10, 3: 20 };
const SIX_MONTHS_IN_DAYS = 183;
window.LEARNING_XP_PER_EFFORT = LEARNING_XP_PER_EFFORT;

let dopamineChart, learningChart, monthlyChart;

function formatShortDate(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

function carryOverFromYesterday() {
  const today = getTodayKey();

  // FIRST TIME OPEN TODAY → do carry-over
  if (appState.lastOpenDate !== today) {

    const yesterday = shiftDateKey(today, -1);
    const yTasks = appState.tasks[yesterday] || [];
    const todayList = appState.tasks[today] || [];

    const carryList = [];

    yTasks.forEach(t => {
      if (
        t.status === "none" ||
        t.status === "" ||
        t.status === "progress" ||
        t.status === "blocked"
      ) {
        // Deduplicate: Cek apakah task dengan (name+effort+status) sudah ada hari ini
        const dup = todayList.find(n =>
          n.name === t.name &&
          n.effort === t.effort &&
          n.status === "none"
        );

        if (!dup) {
          carryList.push({
            id: generateId(),
            name: t.name,
            effort: t.effort,
            status: "none", // ✨ Semua mapping jadi NONE
            createdAt: new Date().toISOString()
          });
        }
      }
    });

    // Insert carry tasks at the TOP
    appState.tasks[today] = [...carryList, ...todayList];

    // Mark that carry has been done for this date
    appState.lastOpenDate = today;
    saveState();
  }
  // Jika tanggal sama → JANGAN carry-over lagi
}

/* DOM */
const tabButtons = document.querySelectorAll(".tab-btn");
const authScreenEl = document.getElementById("authScreen");
const fullReportAreaEl = document.getElementById("fullReportArea");
const tasksTabEl = document.getElementById("tasksTab");
const fourdxTabEl = document.getElementById("fourdxTab");
const learningTabEl = document.getElementById("learningTab");
const dashboardTabEl = document.getElementById("dashboardTab");
const dashboardTabBtn = document.getElementById("dashboardTabBtn");
const settingsTabEl = document.getElementById("settingsTab");
  const topBarEl = document.getElementById("topBar");
const loginForm = document.getElementById("loginForm");
const loginEmailInput = document.getElementById("loginEmailInput");
const loginPasswordInput = document.getElementById("loginPasswordInput");
const loginBtn = document.getElementById("loginBtn");
const googleLoginBtn = document.getElementById("googleLoginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const authStatusText = document.getElementById("authStatusText");
const supabaseConfigWarning = document.getElementById("supabaseConfigWarning");
const sessionUserText = document.getElementById("sessionUserText");
const cloudStatusText = document.getElementById("cloudStatusText");

const hohoTaskFloat = document.getElementById("hohoTaskFloat");
const hohoLearningFloat = document.getElementById("hohoLearningFloat");

const themeToggleBtn = document.getElementById("themeToggle");
const themeIconSpan = document.getElementById("themeIcon");

const taskNameInput = document.getElementById("taskNameInput");
const taskEffortInput = document.getElementById("taskEffortInput");
const taskOwnerInput = document.getElementById("taskOwnerInput");
const taskSourceInput = document.getElementById("taskSourceInput");
const addTaskBtn = document.getElementById("addTaskBtn");
const taskListEl = document.getElementById("taskList");
const xpTodayText = document.getElementById("xpTodayText");
const tasksDoneText = document.getElementById("tasksDoneText");
const tasksProgressText = document.getElementById("tasksProgressText");
const tasksBlockedText = document.getElementById("tasksBlockedText");
const dopaminePercentText = document.getElementById("dopaminePercentText");
const taskHeatmapEl = document.getElementById("taskHeatmap");
const heatmapRangeLabel = document.getElementById("heatmapRangeLabel");
const monthlyRangeLabel = document.getElementById("monthlyRangeLabel");

const learningCategoryInput = document.getElementById("learningCategoryInput");
const learningSubskillInput = document.getElementById("learningSubskillInput");
const learningEffortInput = document.getElementById("learningEffortInput");
const learningReflectionInput = document.getElementById("learningReflectionInput");
const addLearningBtn = document.getElementById("addLearningBtn");
const learningListEl = document.getElementById("learningList");
const learningEntriesTodayEl = document.getElementById("learningEntriesToday");
const learningXpTodayEl = document.getElementById("learningXpToday");
const learningXpSixMonthsEl = document.getElementById("learningXpSixMonths");
const learningHeatmapEl = document.getElementById("learningHeatmap");
const learningHeatmapRangeLabel = document.getElementById("learningHeatmapRangeLabel");
const skillProgressWrapper = document.getElementById("skillProgressWrapper");
const top3skillsEl = document.getElementById("top3skills");

const userNameInput = document.getElementById("userNameInput");
const userPositionInput = document.getElementById("userPositionInput");
const profileRoleText = document.getElementById("profileRoleText");
const settingsAssignableUsers = document.getElementById("settingsAssignableUsers");
const settingsRoleInput = document.getElementById("settingsRoleInput");
const settingsManagerInput = document.getElementById("settingsManagerInput");
const saveUserRoleBtn = document.getElementById("saveUserRoleBtn");
const roleSaveStatusText = document.getElementById("roleSaveStatusText");
const importLegacyBtn = document.getElementById("importLegacyBtn");
const migrationStatusText = document.getElementById("migrationStatusText");
const exportPdfBtn = document.getElementById("exportPdfBtn");
const dashboardRoleLabel = document.getElementById("dashboardRoleLabel");
const dashboardStartDate = document.getElementById("dashboardStartDate");
const dashboardEndDate = document.getElementById("dashboardEndDate");
const dashboardUserFilter = document.getElementById("dashboardUserFilter");
const dashboardRoleFilter = document.getElementById("dashboardRoleFilter");
const refreshDashboardBtn = document.getElementById("refreshDashboardBtn");
const dashboardStatusText = document.getElementById("dashboardStatusText");
const dashboardTableBody = document.getElementById("dashboardTableBody");
const dashboardDetailTitle = document.getElementById("dashboardDetailTitle");
const dashboardDetailMeta = document.getElementById("dashboardDetailMeta");
const dashboardDetailBody = document.getElementById("dashboardDetailBody");
const dashTotalTaskXp = document.getElementById("dashTotalTaskXp");
const dashTotalTasksDone = document.getElementById("dashTotalTasksDone");
const dashTotalLearningXp = document.getElementById("dashTotalLearningXp");
const dashAvgFourdxGreen = document.getElementById("dashAvgFourdxGreen");
const legacyTaskLearningCsv = document.getElementById("legacyTaskLearningCsv");
const legacyFourdxCsv = document.getElementById("legacyFourdxCsv");
const importTaskLearningCsvBtn = document.getElementById("importTaskLearningCsvBtn");
const importFourdxCsvBtn = document.getElementById("importFourdxCsvBtn");
const legacyImportStatusText = document.getElementById("legacyImportStatusText");

// ===== 4DX DOM (UI only for now) =====
const fourdxPeriodSelect = document.getElementById("fourdxPeriodSelect");
const fourdxOverallGreen = document.getElementById("fourdxOverallGreen");
const fourdxBatteryFill = document.getElementById("fourdxBatteryFill");
const fourdxBatteryPct = document.getElementById("fourdxBatteryPct");
const fourdxBatteryFraction = document.getElementById("fourdxBatteryFraction");

const fourdxMonthlyRows = document.getElementById("fourdxMonthlyRows");

const leadMeasuresList = document.getElementById("leadMeasuresList");
const addLeadMeasureBtn = document.getElementById("addLeadMeasureBtn");
const leadCheckinToday = document.getElementById("leadCheckinToday");

const lagMeasuresList = document.getElementById("lagMeasuresList");
const addLagMeasureBtn = document.getElementById("addLagMeasureBtn");

const wigInput = document.getElementById("wigInput");

/* THEME */
function applyTheme(theme){
  if(theme === "dark"){
    document.body.classList.add("dark");
    themeIconSpan.textContent = "🌙";
    themeToggleBtn.querySelector("span").textContent = "Dark";
  } else {
    document.body.classList.remove("dark");
    themeIconSpan.textContent = "🌞";
    themeToggleBtn.querySelector("span").textContent = "Light";
  }
}
themeToggleBtn.addEventListener("click", ()=>{
  appState.theme = appState.theme === "dark" ? "light" : "dark";
  applyTheme(appState.theme);
  saveState();
});

/* TABS */
function showTab(tabId){
[tasksTabEl, fourdxTabEl, learningTabEl, dashboardTabEl, settingsTabEl].forEach(el=>el && el.classList.add("hidden"));
  if(tabId==="tasksTab") tasksTabEl.classList.remove("hidden");
  if(tabId==="fourdxTab") fourdxTabEl.classList.remove("hidden");
  if(tabId==="learningTab") learningTabEl.classList.remove("hidden");
  if(tabId==="dashboardTab" && dashboardTabEl) {
    dashboardTabEl.classList.remove("hidden");
    renderDashboard();
  }
  if(tabId==="settingsTab") settingsTabEl.classList.remove("hidden");

  tabButtons.forEach(btn=>{
    if(btn.dataset.tab===tabId) btn.classList.add("active");
    else btn.classList.remove("active");
  });

  // Ho-Ho floating visibility
  if(tabId==="tasksTab"){
    hohoTaskFloat.classList.remove("hidden");
    hohoLearningFloat.classList.add("hidden");
  } else if(tabId==="learningTab"){
    hohoTaskFloat.classList.add("hidden");
    hohoLearningFloat.classList.remove("hidden");
  } else {
    hohoTaskFloat.classList.add("hidden");
    hohoLearningFloat.classList.add("hidden");
  }

  // Top logo bar: tampil di Tasks & Learning, hilang di Settings
  if (topBarEl) {
    if (tabId === "settingsTab") {
      topBarEl.style.display = "none";
    } else {
      topBarEl.style.display = "flex";
    }
  }
}
tabButtons.forEach(btn=>{
  btn.addEventListener("click", ()=> showTab(btn.dataset.tab));
});

/* TASKS */
function computeTaskStatsForDate(dateKey){
  const arr = appState.tasks[dateKey] || [];
  let xp=0, done=0, prog=0, blocked=0;
  arr.forEach(t=>{
    const eff = TASK_XP_PER_EFFORT[t.effort] || 0;
    if(t.status==="done") xp += eff;
    else if(t.status==="progress") xp += Math.round(eff*0.2);
    if(t.status==="done") done++;
    if(t.status==="progress") prog++;
    if(t.status==="blocked") blocked++;
  });
  const percent = Math.max(0,Math.min(100,Math.round((xp/DAILY_TASK_XP_TARGET)*100)));
  return { xp, done, prog, blocked, percent };
}

function renderTasksForToday(){
  const key = getTodayKey();
  const tasks = appState.tasks[key] || [];
  const stats = computeTaskStatsForDate(key);

  xpTodayText.textContent = stats.xp + " XP";
  tasksDoneText.textContent = stats.done;
  tasksProgressText.textContent = stats.prog;
  tasksBlockedText.textContent = stats.blocked;
  dopaminePercentText.textContent = stats.percent + "%";

  taskListEl.innerHTML = "";
  if(!tasks.length){
    const empty = document.createElement("div");
    empty.style.fontSize="12px";
    empty.style.color="var(--text-light)";
    empty.textContent="No tasks yet. Add 2–5 meaningful tasks.";
    taskListEl.appendChild(empty);
  } else {
    tasks.forEach(task=>{
      const row = document.createElement("div");
      row.style.display="grid";
      row.style.gridTemplateColumns="minmax(0,2.4fr) minmax(0,1fr) minmax(0,1.8fr) auto";
      row.style.gap="8px";
      row.style.alignItems="center";
      row.style.padding="7px 9px";
      row.style.borderRadius="10px";
      row.style.background="var(--bg-alt)";

      const nameCell = document.createElement("div");
      const nameSpan = document.createElement("span");
      nameSpan.textContent = task.name;
      nameSpan.style.fontWeight="600";
      nameSpan.style.fontSize="13px";
      nameSpan.style.cursor="pointer";
      nameSpan.addEventListener("click", ()=>{
        const n = prompt("Edit task name:", task.name);
        if(n!==null && n.trim()!==""){
          task.name = n.trim();
          saveState();
          renderTasksForToday();
          renderTaskHeatmap();
          renderDopamineRadial();
          renderMonthlyDopamineChart();
          updateHoHoMood();
        }
      });
      nameCell.appendChild(nameSpan);
      if (task.source && task.source !== "self") {
        const meta = document.createElement("div");
        meta.style.fontSize = "10px";
        meta.style.color = "var(--text-light)";
        meta.style.marginTop = "2px";
        meta.textContent = task.source === "delegated" ? "Delegated task" : "Assigned task";
        nameCell.appendChild(meta);
      }

      const effortCell = document.createElement("div");
      effortCell.style.fontSize="12px";
      let effTxt="Effort "+task.effort;
      if(task.effort===1) effTxt+=" – Small";
      if(task.effort===2) effTxt+=" – Medium";
      if(task.effort===3) effTxt+=" – Large";
      effortCell.textContent = effTxt;

      const statusCell = document.createElement("div");
      statusCell.style.display="flex";
      statusCell.style.gap="4px";
      const statuses = [
        { value:"none", label:"Todo" },
        { value:"progress", label:"Progress" },
        { value:"done", label:"Done" },
        { value:"blocked", label:"Blocked" },
      ];
      statuses.forEach(s=>{
        const btn = document.createElement("button");
        btn.type="button";
        btn.textContent = s.label;
        btn.className="status-pill";
        if(task.status===s.value){
          if(s.value==="none") btn.classList.add("active-none");
          if(s.value==="progress") btn.classList.add("active-progress");
          if(s.value==="done") btn.classList.add("active-done");
          if(s.value==="blocked") btn.classList.add("active-blocked");
        }
        btn.addEventListener("click", ()=>{
          task.status = s.value;
          saveState();
          renderTasksForToday();
          renderTaskHeatmap();
          renderDopamineRadial();
          renderMonthlyDopamineChart();
          updateHoHoMood();
        });
        statusCell.appendChild(btn);
      });

      const actionsCell = document.createElement("div");
      actionsCell.style.textAlign="right";
      const delBtn = document.createElement("button");
      delBtn.type="button";
      delBtn.textContent="✕";
      delBtn.style.fontSize="11px";
      delBtn.style.padding="4px 8px";
      delBtn.style.borderRadius="999px";
      delBtn.style.background="#f97373";
      delBtn.addEventListener("click", ()=>{
        if(confirm("Delete this task?")){
          appState.tasks[key] = (appState.tasks[key]||[]).filter(t=>t.id!==task.id);
          saveState();
          renderTasksForToday();
          renderTaskHeatmap();
          renderDopamineRadial();
          renderMonthlyDopamineChart();
          updateHoHoMood();
        }
      });
      actionsCell.appendChild(delBtn);

      row.appendChild(nameCell);
      row.appendChild(effortCell);
      row.appendChild(statusCell);
      row.appendChild(actionsCell);
      taskListEl.appendChild(row);
    });
  }

  renderDopamineRadial();
  renderMonthlyDopamineChart();
  updateHoHoMood();
}

addTaskBtn.addEventListener("click", async ()=>{
  const name = taskNameInput.value.trim();
  const effort = parseInt(taskEffortInput.value,10) || 1;
  if(!name){ alert("Please enter a task name."); return; }
  const key = getTodayKey();
  const currentUser = window.HoHoCloudService ? window.HoHoCloudService.getCurrentUser() : null;
  const selectedOwner = taskOwnerInput ? taskOwnerInput.value : "self";
  const ownerId = selectedOwner && selectedOwner !== "self" ? selectedOwner : (currentUser && currentUser.id);
  const currentProfile = window.HoHoCloudService ? window.HoHoCloudService.getCurrentProfile() : null;
  const currentRole = (currentProfile && currentProfile.role) || appState.user.role || "regular_user";
  let source = taskSourceInput ? taskSourceInput.value : "self";
  const profiles = window.HoHoCloudService ? window.HoHoCloudService.getAssignableProfiles() : [];
  const selectedProfile = profiles.find((profile) => profile.id === ownerId);
  const canAssignSelected =
    currentRole === "superuser" ||
    (currentRole === "admin" && selectedProfile && selectedProfile.manager_id === currentUser.id);
  if (ownerId && currentUser && ownerId !== currentUser.id && source === "assigned" && !canAssignSelected) {
    source = "delegated";
    if (taskSourceInput) taskSourceInput.value = "delegated";
  }

  if (ownerId && currentUser && ownerId !== currentUser.id && window.HoHoTaskService) {
    try {
      addTaskBtn.disabled = true;
      addTaskBtn.textContent = "Saving...";
      await window.HoHoTaskService.createTask({
        id: generateId(),
        name,
        effort,
        status: "none",
        source,
        ownerId,
        createdBy: currentUser.id,
        assignedBy: currentUser.id,
        task_date: key,
        createdAt: new Date().toISOString()
      }, currentUser.id);
      taskNameInput.value="";
      taskEffortInput.value="1";
      if (taskOwnerInput) taskOwnerInput.value = "self";
      if (taskSourceInput) taskSourceInput.value = "self";
      if (cloudStatusText) cloudStatusText.textContent = "Task sent";
      alert("Task berhasil dikirim ke user penerima.");
      return;
    } catch (err) {
      console.error("Failed to create assigned/delegated task", err);
      const message = err.message || String(err);
      if (message.includes("row-level security")) {
        alert("Gagal membuat task untuk user lain: akses ditolak oleh RLS. Untuk kirim ke user yang bukan bawahanmu, pilih Delegated task.");
      } else {
        alert("Gagal membuat task untuk user lain: " + message);
      }
      return;
    } finally {
      addTaskBtn.disabled = false;
      addTaskBtn.textContent = "+ Add Task";
    }
  }

  const arr = ensureArray(appState.tasks,key);
  arr.push({
    id: generateId(),
    ownerId: ownerId || "local",
    createdBy: currentUser ? currentUser.id : "local",
    assignedBy: null,
    source: "self",
    name,
    effort,
    status: "none",
    createdAt: new Date().toISOString()
  });
  taskNameInput.value="";
  taskEffortInput.value="1";
  saveState();
  renderTasksForToday();
  renderTaskHeatmap();
});

/* LEARNING */
function computeLearningStatsForDate(dateKey){
  const arr = appState.learning[dateKey] || [];
  let xp=0;
  arr.forEach(e=> xp += LEARNING_XP_PER_EFFORT[e.effort] || 0);
  const percent = Math.max(0,Math.min(100,Math.round((xp/40)*100)));
  return { xp, entriesCount: arr.length, percent };
}
function computeLearningSixMonthXp(){
  const today = new Date(getTodayKey()+"T00:00:00");
  let total=0;
  Object.keys(appState.learning).forEach(k=>{
    const d = new Date(k+"T00:00:00");
    const diff = (today-d)/(1000*60*60*24);
    if(diff>=0 && diff<=SIX_MONTHS_IN_DAYS){
      total += computeLearningStatsForDate(k).xp;
    }
  });
  return total;
}
  function buildWeeklyPayload() {
  const todayKey = getTodayKey();
  const today = new Date(todayKey + "T00:00:00");

  // Ambil 7 hari ke belakang, termasuk hari ini
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const iso = d.toISOString().slice(0, 10);
    days.push(iso);
  }

  const rows = days.map((dateKey) => {
    const tStats = computeTaskStatsForDate(dateKey);
    const lStats = computeLearningStatsForDate(dateKey);

    return {
      date: dateKey,
      taskPercent: tStats.percent,
      taskXp: tStats.xp,
      taskDone: tStats.done,
      taskProgress: tStats.prog,
      taskBlocked: tStats.blocked,
      learningXp: lStats.xp,
      learningEntries: lStats.entriesCount
    };
  });

  const weekLabel = `${formatShortDate(days[0])} – ${formatShortDate(days[days.length - 1])}`;

  return {
    userName: appState.user?.name || "",
    position: appState.user?.position || "",
    weekRange: weekLabel,
    rows
  };
}
async function syncWeeklyToGoogleSheet() {
  if (!GOOGLE_SHEET_WEBHOOK_URL || GOOGLE_SHEET_WEBHOOK_URL.indexOf("script.google.com") === -1) {
    alert("Google Sheet webhook URL belum di-set atau tidak valid.");
    return;
  }

  const payload = buildWeeklyPayload();

  if (!payload.userName || !payload.position) {
    const ok = confirm("Name dan Position di Settings masih kosong. Tetap kirim data tanpa identitas?");
    if (!ok) return;
  }

  const confirmSend = confirm(
    `Kirim data 7 hari terakhir ke Google Sheet untuk:\n\n` +
    `Name: ${payload.userName || "-"}\n` +
    `Position: ${payload.position || "-"}\n` +
    `Range: ${payload.weekRange}\n\nLanjutkan?`
  );
  if (!confirmSend) return;

  try {
    const btn = document.getElementById("syncWeeklyBtn");
    if (btn) {
      btn.disabled = true;
      btn.textContent = "Syncing...";
    }

    // Kirim tanpa baca response (biar gak ke-block CORS)
await fetch(GOOGLE_SHEET_WEBHOOK_URL, {
  method: "POST",
  mode: "no-cors",
  headers: { "Content-Type": "text/plain" },
  body: JSON.stringify(payload)
});

    alert("Permintaan sync sudah dikirim. Cek Google Sheet apakah barisnya sudah bertambah.");
  } catch (err) {
    console.error("Fetch error:", err);
    alert("Masih gagal kirim ke Google Sheet.\n\nError: " + err.message);
  } finally {
    const btn = document.getElementById("syncWeeklyBtn");
    if (btn) {
      btn.disabled = false;
      btn.textContent = "Sync Weekly to Google Sheet";
    }
  }
}
function build4DXWeeklyPayload() {
  ensure4DXState();

// Range: rolling last 7 days (today-6 .. today), no future
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 6);

  const weekStart = start.toISOString().slice(0, 10);
  const weekEnd = end.toISOString().slice(0, 10);

  const dayKeys = [];
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    dayKeys.push(d.toISOString().slice(0, 10));
  }

  const leads = (appState.fourdx && Array.isArray(appState.fourdx.leadMeasures))
    ? appState.fourdx.leadMeasures
    : [];

  const rows = leads.map((lead) => {
    // expectedKeys sudah include activeFrom + exclude offday + exclude future (<= today)
    const expectedKeys = fourdxExpectedKeysForLead(lead, dayKeys);

    let green = 0, yellow = 0, red = 0, miss = 0, off = 0, filled = 0;

    expectedKeys.forEach((dk) => {
      if (fourdxIsOffday(dk)) { off++; return; }

      const raw = fourdxGetRawStatus(dk, lead.name);
      if (!raw) { miss++; return; }

      filled++;
      if (raw === "GREEN") green++;
      else if (raw === "YELLOW") yellow++;
      else if (raw === "RED") red++;
    });

    const expected = expectedKeys.length;

    return {
      weekStart,
      weekEnd,
      leadName: lead.name,
      activeFrom: lead.activeFrom || "",
      expectedDays: expected,
      filledDays: filled,
      missDays: miss,
      offDays: off,
      greenDays: green,
      yellowDays: yellow,
      redDays: red,
      greenPct: expected ? Math.round((green / expected) * 100) : 0,
      completionPct: expected ? Math.round((filled / expected) * 100) : 0
    };
  });

  return { sheetName: "4DX_Weekly", rows, weekStart, weekEnd };
}

async function sync4DXWeeklyToGoogleSheet() {
  if (!FOURDX_WEEKLY_WEBHOOK_URL || FOURDX_WEEKLY_WEBHOOK_URL.indexOf("script.google.com") === -1) {
    alert("4DX Weekly webhook URL belum di-set atau tidak valid.");
    return;
  }

const payload = build4DXWeeklyPayload();

  console.log("SYNC4DX CLICKED URL:", FOURDX_WEEKLY_WEBHOOK_URL);
  console.log("SYNC4DX payload:", payload);

  if (!payload.rows.length) {
    alert("Belum ada lead measures 4DX yang diset. Set dulu lead measures di tab 4DX.");
    return;
  }

  const ok = confirm(
    `Sync 4DX Weekly ke Google Sheet?\n\n` +
    `Week: ${payload.weekStart} → ${payload.weekEnd}\n` +
    `Leads: ${payload.rows.length}`
  );
  if (!ok) return;

  const btn = document.getElementById("sync4DXWeeklyBtn");
  const statusEl = document.getElementById("sync4DXWeeklyStatus");

  try {
    if (btn) { btn.disabled = true; btn.textContent = "Syncing 4DX..."; }
    if (statusEl) statusEl.textContent = "Sending...";

    // pakai no-cors biar gak ke-block (Apps Script kadang strict)
    await fetch(FOURDX_WEEKLY_WEBHOOK_URL, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
  sheetName: "4DX_Weekly",
  userName: (appState.user && appState.user.name) ? appState.user.name : "",
  userPosition: (appState.user && appState.user.position) ? appState.user.position : "",
  rows: payload.rows
})
    });

    if (statusEl) statusEl.textContent = "✅ Sent (cek tab 4DX_Weekly)";
    alert("✅ 4DX Weekly sent. Cek Google Sheet tab 4DX_Weekly.");
  } catch (err) {
    if (statusEl) statusEl.textContent = "❌ Failed";
    alert("❌ Gagal kirim 4DX Weekly.\n\nError: " + (err && err.message ? err.message : err));
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = "Sync 4DX Weekly"; }
  }
}

function categoryLabel(cat){
  const map = {
    tools:"Tools & Workspace",
    digital:"Digital Marketing",
    ai:"AI Skills",
    content:"Content & Creative",
    data:"Data Analytics & Research",
    finance:"Finance",
    hr:"HR",
    sales:"Sales",
    cognitive:"Cognitive Skills",
    interpersonal:"Interpersonal Skills",
    intrapersonal:"Intrapersonal Skills",
    business:"Business Acumen",
    leadership:"Leadership & Management",
    other:"Others"
  };
  return map[cat] || cat;
}

function renderLearningForToday(){
  const key = getTodayKey();
  const arr = appState.learning[key] || [];
  const stats = computeLearningStatsForDate(key);

  learningEntriesTodayEl.textContent = stats.entriesCount;
  learningXpTodayEl.textContent = stats.xp;
  learningXpSixMonthsEl.textContent = computeLearningSixMonthXp();
  document.getElementById("learningPercentText").textContent = stats.percent + "%";

  learningListEl.innerHTML = "";
  if(!arr.length){
    const e=document.createElement("div");
    e.style.fontSize="12px";
    e.style.color="var(--text-light)";
    e.textContent="No learning yet. Log at least one insight today.";
    learningListEl.appendChild(e);
  } else {
    arr.forEach(entry=>{
      const row=document.createElement("div");
      row.style.display="grid";
      row.style.gridTemplateColumns="minmax(0,1.4fr) minmax(0,1.1fr) minmax(0,1fr) auto";
      row.style.gap="8px";
      row.style.alignItems="flex-start";
      row.style.padding="7px 9px";
      row.style.borderRadius="10px";
      row.style.background="var(--bg-alt)";

      const catCell=document.createElement("div");
      const catSpan=document.createElement("span");
      catSpan.textContent = entry.customLabel || categoryLabel(entry.category);
      catSpan.style.fontWeight="600";
      catSpan.style.fontSize="13px";
      catSpan.style.cursor="pointer";
      catSpan.addEventListener("click",()=>{
        const newLabel = prompt("Edit category label (display only):", catSpan.textContent);
        if(newLabel!==null && newLabel.trim()!==""){
          entry.customLabel = newLabel.trim();
          saveState();
          renderLearningForToday();
          renderLearningHeatmap();
          renderSkillProgress();
          renderTop3Skills();
          renderLearningRadial();
          updateHoHoMood();
        }
      });
      catCell.appendChild(catSpan);

      const subCell=document.createElement("div");
      const subSpan=document.createElement("span");
      subSpan.textContent = entry.subskill || "No subskill";
      subSpan.style.fontSize="12px";
      subSpan.style.cursor="pointer";
      subSpan.addEventListener("click",()=>{
        const upd = prompt("Edit subskill (or blank):", entry.subskill || "");
        if(upd!==null){
          entry.subskill = upd.trim();
          saveState();
          renderLearningForToday();
          renderLearningHeatmap();
          renderSkillProgress();
          renderTop3Skills();
          renderLearningRadial();
          updateHoHoMood();
        }
      });
      subCell.appendChild(subSpan);

      const effortCell=document.createElement("div");
      effortCell.style.fontSize="12px";
      effortCell.textContent = entry.effort===1?"Small":entry.effort===2?"Medium":"Intensive";

      const actionsCell=document.createElement("div");
      actionsCell.style.textAlign="right";
      actionsCell.style.display="flex";
      actionsCell.style.flexDirection="column";
      actionsCell.style.alignItems="flex-end";
      actionsCell.style.gap="4px";

      const refBtn=document.createElement("button");
      refBtn.type="button";
      refBtn.textContent="✎ Reflection";
      refBtn.style.fontSize="11px";
      refBtn.style.padding="4px 8px";
      refBtn.style.borderRadius="999px";
      refBtn.style.background="var(--bg)";
      refBtn.style.color="var(--text)";
      refBtn.addEventListener("click",()=>{
        const upd = prompt("Edit reflection:", entry.reflection || "");
        if(upd!==null){
          entry.reflection = upd.trim();
          saveState();
          renderLearningForToday();
        }
      });

      const delBtn=document.createElement("button");
      delBtn.type="button";
      delBtn.textContent="✕";
      delBtn.style.fontSize="11px";
      delBtn.style.padding="4px 8px";
      delBtn.style.borderRadius="999px";
      delBtn.style.background="#f97373";
      delBtn.addEventListener("click",()=>{
        if(confirm("Delete this learning entry?")){
          appState.learning[key] = (appState.learning[key]||[]).filter(e=>e.id!==entry.id);
          saveState();
          renderLearningForToday();
          renderLearningHeatmap();
          renderSkillProgress();
          renderTop3Skills();
          renderLearningRadial();
          updateHoHoMood();
        }
      });

      actionsCell.appendChild(refBtn);
      actionsCell.appendChild(delBtn);

      row.appendChild(catCell);
      row.appendChild(subCell);
      row.appendChild(effortCell);
      row.appendChild(actionsCell);
      learningListEl.appendChild(row);
    });
  }

  renderLearningRadial();
  updateHoHoMood();
}

addLearningBtn.addEventListener("click",()=>{
  const category = learningCategoryInput.value;
  const subskill = learningSubskillInput.value.trim();
  const effort = parseInt(learningEffortInput.value,10) || 1;
  const reflection = learningReflectionInput.value.trim();
  const key = getTodayKey();
  const arr = ensureArray(appState.learning,key);
  arr.push({
    id: generateId(),
    category,
    subskill,
    effort,
    reflection,
    createdAt: new Date().toISOString()
  });
  saveState();
  learningSubskillInput.value="";
  learningReflectionInput.value="";
  learningEffortInput.value="1";
  renderLearningForToday();
  renderLearningHeatmap();
  renderSkillProgress();
  renderTop3Skills();
});

/* HEATMAPS */
function renderTaskHeatmap(){
  const today = new Date(getTodayKey()+"T00:00:00");
  const cells=[];
  for(let i=27;i>=0;i--){
    const d=new Date(today);
    d.setDate(d.getDate()-i);
    const key = d.toISOString().slice(0,10);
    const stats = computeTaskStatsForDate(key);
    cells.push({dateKey:key,percent:stats.percent});
  }
  taskHeatmapEl.innerHTML="";
  cells.forEach(info=>{
    const cell=document.createElement("div");
    cell.className="heat-cell";
    let bg="#e5e7eb";
    if(info.percent>=80) bg="#6ee7b7";
    else if(info.percent>=40) bg="#fde68a";
    else if(info.percent>0) bg="#fca5a5";
    cell.style.background=bg;
    cell.dataset.dateKey=info.dateKey;
    const label=document.createElement("div");
    label.className="heat-cell-label";
    label.style.color="#111827";
    label.textContent=new Date(info.dateKey+"T00:00:00").getDate();
    cell.appendChild(label);
    taskHeatmapEl.appendChild(cell);
  });
  const firstKey=cells[0]?.dateKey;
  const lastKey=cells[cells.length-1]?.dateKey;
  if(firstKey && lastKey){
    heatmapRangeLabel.textContent = formatShortDate(firstKey)+" – "+formatShortDate(lastKey);
    monthlyRangeLabel.textContent = heatmapRangeLabel.textContent;
  }
}

function renderLearningHeatmap(){
  const today = new Date(getTodayKey()+"T00:00:00");
  const cells=[];
  for(let i=27;i>=0;i--){
    const d=new Date(today);
    d.setDate(d.getDate()-i);
    const key=d.toISOString().slice(0,10);
    const stats=computeLearningStatsForDate(key);
    cells.push({dateKey:key,xp:stats.xp});
  }
  learningHeatmapEl.innerHTML="";
  cells.forEach(info=>{
    const cell=document.createElement("div");
    cell.className="heat-cell";
    let bg="#e5e7eb";
    if(info.xp>0 && info.xp<=10) bg="#bfdbfe";
    else if(info.xp<=20) bg="#60a5fa";
    else if(info.xp>20) bg="#2563eb";
    cell.style.background=bg;
    cell.dataset.dateKey=info.dateKey;
    const label=document.createElement("div");
    label.className="heat-cell-label";
    label.style.color="#f9fafb";
    label.textContent=new Date(info.dateKey+"T00:00:00").getDate();
    cell.appendChild(label);
    learningHeatmapEl.appendChild(cell);
  });
  const firstKey=cells[0]?.dateKey;
  const lastKey=cells[cells.length-1]?.dateKey;
  if(firstKey && lastKey){
    learningHeatmapRangeLabel.textContent = formatShortDate(firstKey)+" – "+formatShortDate(lastKey);
  }
}

/* SKILLS */
function computeSkillCategoryXpLastSixMonths(){
  const today = new Date(getTodayKey()+"T00:00:00");
  const map={};
  Object.keys(appState.learning).forEach(k=>{
    const d=new Date(k+"T00:00:00");
    const diff=(today-d)/(1000*60*60*24);
    if(diff>=0 && diff<=SIX_MONTHS_IN_DAYS){
      (appState.learning[k]||[]).forEach(e=>{
        const xp=LEARNING_XP_PER_EFFORT[e.effort]||0;
        if(!map[e.category]) map[e.category]=0;
        map[e.category]+=xp;
      });
    }
  });
  return map;
}
function renderSkillProgress(){
  const map=computeSkillCategoryXpLastSixMonths();
  const entries=Object.entries(map).sort((a,b)=>b[1]-a[1]);
  skillProgressWrapper.innerHTML="";
  if(!entries.length){
    const e=document.createElement("div");
    e.style.fontSize="12px";
    e.style.color="var(--text-light)";
    e.textContent="No learning XP yet. Start logging to see growth.";
    skillProgressWrapper.appendChild(e);
    return;
  }
  const maxXp=entries[0][1]||1;
  entries.forEach(([cat,xp])=>{
    const card=document.createElement("div");
    card.style.borderRadius="12px";
    card.style.padding="8px 10px";
    card.style.background="var(--bg-alt)";
    card.style.border="1px solid var(--border)";
    card.style.display="flex";
    card.style.flexDirection="column";
    card.style.gap="4px";

    const header=document.createElement("div");
    header.style.display="flex";
    header.style.justifyContent="space-between";
    const label=document.createElement("div");
    label.style.fontSize="13px";
    label.style.fontWeight="600";
    label.textContent=categoryLabel(cat);
    const xpText=document.createElement("div");
    xpText.style.fontSize="11px";
    xpText.style.color="var(--text-light)";
    xpText.textContent=xp+" XP";
    header.appendChild(label);
    header.appendChild(xpText);

    const barOuter=document.createElement("div");
    barOuter.style.height="6px";
    barOuter.style.borderRadius="999px";
    barOuter.style.background="rgba(148,163,184,0.35)";
    const barInner=document.createElement("div");
    barInner.style.height="100%";
    barInner.style.borderRadius="999px";
    barInner.style.background="linear-gradient(90deg,#ffb443,#ff7f50)";
    barInner.style.width=Math.max(8,(xp/maxXp)*100)+"%";
    barOuter.appendChild(barInner);

    card.appendChild(header);
    card.appendChild(barOuter);
    skillProgressWrapper.appendChild(card);
  });
}

function computeTop3Skills(){
  const map=computeSkillCategoryXpLastSixMonths();
  return Object.entries(map).sort((a,b)=>b[1]-a[1]).slice(0,3);
}
function renderTop3Skills(){
  top3skillsEl.innerHTML="";
  const data=computeTop3Skills();
  if(!data.length){
    top3skillsEl.innerHTML=`<div style="font-size:12px;color:var(--text-light);">No skill gains yet.</div>`;
    return;
  }
  const maxXp=data[0][1]||1;
  data.forEach(([cat,xp])=>{
    const row=document.createElement("div");
    row.style.display="grid";
    row.style.gridTemplateColumns="1fr auto";
    row.style.gap="8px";
    row.style.alignItems="center";
    row.innerHTML=`
      <div>
        <div style="font-size:12px;font-weight:600;">${categoryLabel(cat)}</div>
        <div style="height:5px;border-radius:999px;background:#e5e7eb;margin-top:4px;">
          <div style="
            height:100%;
            width:${Math.max(12,(xp/maxXp)*100)}%;
            border-radius:999px;
            background:linear-gradient(90deg,#ffb443,#ff7f50);
          "></div>
        </div>
      </div>
      <div style="font-size:11px;color:var(--text-light);font-weight:600;">${xp} XP</div>
    `;
    top3skillsEl.appendChild(row);
  });
}

/* CHARTS */
function renderDopamineRadial(){
  const ctx = document.getElementById("dopamineChart").getContext("2d");
  const stats = computeTaskStatsForDate(getTodayKey());
  const percent = stats.percent;
  if(dopamineChart) dopamineChart.destroy();
  dopamineChart = new Chart(ctx,{
    type:"doughnut",
    data:{
      datasets:[{
        data:[percent,100-percent],
        backgroundColor:[
          percent>=60?"#6ee7b7":"#fca5a5",
          "rgba(148,163,184,0.25)"
        ],
        borderWidth:0,
        cutout:"70%"
      }]
    },
    options:{
      animation:{duration:700,easing:"easeOutBack"},
      plugins:{tooltip:{enabled:false},legend:{display:false}}
    }
  });
}

function renderLearningRadial(){
  const ctx = document.getElementById("learningChart").getContext("2d");
  const stats = computeLearningStatsForDate(getTodayKey());
  const percent = stats.percent;
  if(learningChart) learningChart.destroy();
  learningChart = new Chart(ctx,{
    type:"doughnut",
    data:{
      datasets:[{
        data:[percent,100-percent],
        backgroundColor:[
          percent>=60?"#60a5fa":"#bfdbfe",
          "rgba(148,163,184,0.25)"
        ],
        borderWidth:0,
        cutout:"70%"
      }]
    },
    options:{
      animation:{duration:700,easing:"easeOutBack"},
      plugins:{tooltip:{enabled:false},legend:{display:false}}
    }
  });
}

function renderMonthlyDopamineChart(){
  const ctx=document.getElementById("monthlyDopamineChart").getContext("2d");
  const today=new Date(getTodayKey()+"T00:00:00");
  const labels=[];
  const values=[];
  for(let i=27;i>=0;i--){
    const d=new Date(today);
    d.setDate(d.getDate()-i);
    labels.push(d.getDate());
    values.push(computeTaskStatsForDate(d.toISOString().slice(0,10)).percent);
  }
  if(monthlyChart) monthlyChart.destroy();
  monthlyChart = new Chart(ctx,{
    type:"line",
    data:{
      labels,
      datasets:[{
        data:values,
        borderColor:"#ffb443",
        borderWidth:2,
        fill:true,
        backgroundColor:"rgba(255,180,67,0.18)",
        tension:0.35,
        pointRadius:2.5
      }]
    },
    options:{
      scales:{y:{min:0,max:100,ticks:{stepSize:20}}},
      plugins:{legend:{display:false}},
      animation:{duration:700,easing:"easeOutBack"}
    }
  });
}

/* MODAL DETAIL */
function ensureModal(){
  if(document.getElementById("detailModal")) return;
  const modal=document.createElement("div");
  modal.id="detailModal";
  modal.style.position="fixed";
  modal.style.top=0;
  modal.style.left=0;
  modal.style.width="100%";
  modal.style.height="100%";
  modal.style.background="rgba(0,0,0,0.45)";
  modal.style.display="none";
  modal.style.justifyContent="center";
  modal.style.alignItems="center";
  modal.style.zIndex=9999;
  modal.innerHTML=`
    <div style="background:white;width:90%;max-width:420px;border-radius:16px;padding:18px;box-shadow:0 18px 45px rgba(15,23,42,0.2);animation:modalPop .35s ease-out;">
      <div style="display:flex;gap:10px;align-items:center;margin-bottom:8px;">
        <img id="modalHoHo" src="hoho-pointsmile.png" style="width:56px;">
        <div>
          <div id="modalDate" style="font-weight:700;font-size:16px;">-</div>
          <div id="modalPercent" style="font-size:13px;color:#4b5563;">-</div>
        </div>
      </div>
      <div id="modalTasks" style="font-size:13px;line-height:1.5;margin-bottom:10px;">Loading...</div>
      <button id="closeModalBtn" style="width:100%;border-radius:10px;background:#ffb443;border:none;padding:8px 10px;font-weight:700;cursor:pointer;">Close</button>
    </div>
  `;
  const style=document.createElement("style");
  style.innerHTML=`
    @keyframes modalPop{
      0%{transform:scale(.7);opacity:0;}
      70%{transform:scale(1.03);opacity:1;}
      100%{transform:scale(1);opacity:1;}
    }
  `;
  document.head.appendChild(style);
  document.body.appendChild(modal);
  document.getElementById("closeModalBtn").onclick=()=> modal.style.display="none";
}

function openModal(dateKey, kind){
  ensureModal();
  const modal=document.getElementById("detailModal");
  modal.style.display="flex";
  document.getElementById("modalDate").textContent = formatShortDate(dateKey);

  let percent;
  let html;
  if(kind==="tasks"){
    const stats=computeTaskStatsForDate(dateKey);
    percent=stats.percent;
    const tasks=appState.tasks[dateKey]||[];
    html = tasks.length
      ? "<ul style='padding-left:18px;margin:6px 0;'>"+
        tasks.map(t=>`<li><b>${t.name}</b> — Effort ${t.effort} (${t.status})</li>`).join("")+
        "</ul>"
      : "<i>No tasks logged.</i>";
    document.getElementById("modalPercent").textContent = `Task dopamine: ${percent}%`;
  } else {
    const st=computeLearningStatsForDate(dateKey);
    percent=st.percent;
    const entries=appState.learning[dateKey]||[];
    html = entries.length
      ? "<ul style='padding-left:18px;margin:6px 0;'>"+
        entries.map(e=>`<li><b>${categoryLabel(e.category)}</b> – ${e.subskill || "no subskill"} (${LEARNING_XP_PER_EFFORT[e.effort]||0} XP)</li>`).join("")+
        "</ul>"
      : "<i>No learning logged.</i>";
    document.getElementById("modalPercent").textContent = `Learning dopamine: ${percent}%`;
  }
  document.getElementById("modalTasks").innerHTML = html;

  const ho=document.getElementById("modalHoHo");
  if(percent>=80) ho.src="hoho-levelup.png";
  else if(percent>=40) ho.src= kind==="tasks" ? "hoho-pumped.png" : "hoho-book.png";
  else if(percent>0) ho.src= kind==="tasks" ? "hoho-sad.png" : "hoho-thinking.png";
  else ho.src="hoho-happy.png";
}

document.addEventListener("click", e=>{
  const taskCell=e.target.closest("#taskHeatmap .heat-cell");
  if(taskCell) openModal(taskCell.dataset.dateKey,"tasks");
  const learnCell=e.target.closest("#learningHeatmap .heat-cell");
  if(learnCell) openModal(learnCell.dataset.dateKey,"learning");
});

/* PROFILE */
function renderProfile(){
  userNameInput.value = appState.user.name || "";
  userPositionInput.value = appState.user.position || "";
}
userNameInput.addEventListener("change",()=>{
  appState.user.name = userNameInput.value.trim();
  saveState();
});
userPositionInput.addEventListener("change",()=>{
  appState.user.position = userPositionInput.value.trim();
  saveState();
});

/* PDF */
// GANTI exportPDF lama dengan ini
function pad2(n){ return String(n).padStart(2,"0"); }

function monthDayKeys(year, monthIdx){
  // monthIdx: 0-11
  const lastDay = new Date(year, monthIdx + 1, 0).getDate();
  const keys = [];
  for(let d=1; d<=lastDay; d++){
    keys.push(`${year}-${pad2(monthIdx+1)}-${pad2(d)}`);
  }
  return keys;
}

async function exportPDF() {
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "pt",
    format: "a4",
    compress: true,
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 32;
  let y = 36;

  // Helper: cek space, kalau nggak cukup -> new page
  function ensureSpace(extraHeight) {
    if (y + extraHeight > pageHeight - margin) {
      pdf.addPage();
      y = margin;
    }
  }

  // Helper: short date label (misal 2025-11-24 -> 24 Nov)
  function shortLabel(key) {
    const d = new Date(key + "T00:00:00");
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
  }

  // ----- 1. Load logo Savvy & HoHo (kalau ada) -----
  const loadImg = (src) =>
    new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = src;
    });

  const [savvyImg, hohoImg] = await Promise.all([
    loadImg("savvy-logo.png"),
    loadImg("hoho-logo.png"),
  ]);

  // ----- 2. Tentukan bulan report -----
  const todayKey = getTodayKey();
  const today = new Date(todayKey + "T00:00:00");

  let reportMonthStr = document.getElementById("reportMonthInput").value;
  if (!reportMonthStr) {
    reportMonthStr = todayKey.slice(0, 7); // YYYY-MM
  }

  const [reportYearStr, reportMonthIdxStr] = reportMonthStr.split("-");
  const reportYear = parseInt(reportYearStr, 10);
  const reportMonthIdx = parseInt(reportMonthIdxStr, 10) - 1;

  const firstDate = new Date(reportYear, reportMonthIdx, 1);
  const nextMonth = new Date(reportYear, reportMonthIdx + 1, 1);
  const daysInMonth = Math.round(
    (nextMonth - firstDate) / (1000 * 60 * 60 * 24)
  );

  const dayKeys = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const dt = new Date(reportYear, reportMonthIdx, d);
    const iso = new Date(dt.getTime() - dt.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 10);
    dayKeys.push(iso);
  }

  // ----- 3. Hitung summary data -----
  const taskPercents = [];
  let totalTaskPercent = 0;
  let countTaskDays = 0;
  let totalTaskXp = 0;

  dayKeys.forEach((key) => {
    const stats = computeTaskStatsForDate(key);
    taskPercents.push(stats.percent);
    if (stats.percent > 0) {
      totalTaskPercent += stats.percent;
      countTaskDays++;
    }
    totalTaskXp += stats.xp;
  });
  const avgTaskPercent = countTaskDays
    ? Math.round(totalTaskPercent / countTaskDays)
    : 0;

  const learningXpPerDay = [];
  let totalLearningXp = 0;
  dayKeys.forEach((key) => {
    const stats = computeLearningStatsForDate(key);
    learningXpPerDay.push(stats.xp);
    totalLearningXp += stats.xp;
  });

  // Top 3 skill gain
  const skillMonthlyMap = {};
  dayKeys.forEach((key) => {
    const arr = appState.learning[key] || [];
    arr.forEach((e) => {
      const xp = (window.LEARNING_XP_PER_EFFORT && window.LEARNING_XP_PER_EFFORT[e.effort]) || 0;
      if (!skillMonthlyMap[e.category]) skillMonthlyMap[e.category] = 0;
      skillMonthlyMap[e.category] += xp;
    });
  });
  const skillEntries = Object.entries(skillMonthlyMap).sort(
    (a, b) => b[1] - a[1]
  );
  const top3 = skillEntries.slice(0, 3);

  // ----- 4. HEADER -----
  if (savvyImg) {
    pdf.addImage(savvyImg, "PNG", margin, y, 70, 28);
  }
  if (hohoImg) {
    pdf.addImage(hohoImg, "PNG", pageWidth - margin - 70, y, 70, 28);
  }
  y += 40;

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(16);
  pdf.text("HeyHoLetsGo – Monthly Report", margin, y);
  y += 22;

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(11);

  const monthLabel = new Date(reportYear, reportMonthIdx, 1).toLocaleDateString(
    "en-GB",
    { month: "long", year: "numeric" }
  );
  const name = appState.user.name || "-";
  const pos = appState.user.position || "-";

  pdf.text(`Name: ${name}`, margin, y);
  y += 14;
  pdf.text(`Position: ${pos}`, margin, y);
  y += 14;
  pdf.text(`Month: ${monthLabel}`, margin, y);
  y += 18;

  pdf.setDrawColor(220, 220, 220);
  pdf.line(margin, y, pageWidth - margin, y);
  y += 18;

  // ==========================
  // 5. SECTION 1 – TASKS SUMMARY
  // ==========================
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(13);
  pdf.text("1. Tasks & Productivity Summary", margin, y);
  y += 16;

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(13);
  pdf.text(`Average dopamine: ${avgTaskPercent}%`, margin, y);
  y += 16;

  pdf.setFontSize(11);
  pdf.text(`Total task XP this month: ${totalTaskXp}`, margin, y);
  y += 18;

  // Line chart dopamine
  const chartX = margin;
  const chartY = y;
  const chartW = pageWidth - margin * 2;
  const chartH = 80;

  pdf.setDrawColor(210, 210, 210);
  pdf.rect(chartX, chartY, chartW, chartH);

  if (taskPercents.length > 1) {
    pdf.setDrawColor(255, 180, 67);
    let prevX = chartX;
    let prevY =
      chartY + chartH - (taskPercents[0] / 100) * chartH;
    for (let i = 1; i < taskPercents.length; i++) {
      const x =
        chartX + (i / (taskPercents.length - 1)) * chartW;
      const yLine =
        chartY + chartH - (taskPercents[i] / 100) * chartH;
      pdf.line(prevX, prevY, x, yLine);
      prevX = x;
      prevY = yLine;
    }
  }

  pdf.setFontSize(9);
  pdf.setTextColor(100, 100, 100);
  pdf.text("Daily dopamine %", chartX, chartY - 4);
  pdf.setTextColor(0, 0, 0);

  y = chartY + chartH + 20;

  // Heatmap task
  pdf.setFontSize(11);
  pdf.text("Monthly dopamine heatmap:", margin, y);
  y += 10;

  const cellSize = 14;
  const cellGap = 3;
  const cols = 7;
  const startY = y;

  dayKeys.forEach((key, idx) => {
    const row = Math.floor(idx / cols);
    const col = idx % cols;
    const x = margin + col * (cellSize + cellGap);
    const cy = startY + row * (cellSize + cellGap);

    const stats = computeTaskStatsForDate(key);
    const p = stats.percent;

    let r = 230, g = 230, b = 230;
    if (p >= 80) { r = 110; g = 231; b = 183; }      // hijau
    else if (p >= 40) { r = 253; g = 230; b = 138; } // kuning
    else if (p > 0) { r = 252; g = 165; b = 165; }   // merah

    pdf.setFillColor(r, g, b);
    pdf.setDrawColor(220, 220, 220);
    pdf.rect(x, cy, cellSize, cellSize, "F");

    const day = parseInt(key.slice(8, 10), 10);
    pdf.setFontSize(7);
    pdf.setTextColor(60, 60, 60);
    pdf.text(String(day), x + cellSize / 2, cy + cellSize + 8, {
      align: "center",
    });
    pdf.setTextColor(0, 0, 0);
  });

  const heatRows = Math.ceil(dayKeys.length / cols);
  y = startY + heatRows * (cellSize + cellGap) + 22;
  
// ==========================
  // 5B. SECTION – 4DX (MONTHLY)
  // ==========================
  // Page break safety
  if (y > pageHeight - margin - 120) {
    pdf.addPage();
    y = margin + 10;
  }

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(14);
  pdf.text("4DX – Execution Discipline (This Month)", margin, y);
  y += 10;

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.setTextColor(90, 90, 90);
  pdf.text("Green % + per-lead calendar (Off / Miss / RYG). Future & inactive shown as empty slots.", margin, y);
  y += 14;

  // Prepare month keys
  ensure4DXState();
  const monthKeys = monthDayKeys(reportYear, reportMonthIdx);

  const leads = (appState.fourdx && appState.fourdx.leadMeasures) ? appState.fourdx.leadMeasures : [];

  // If no leads
  if (!leads.length) {
    pdf.setTextColor(70,70,70);
    pdf.text("No 4DX lead measures set for this month.", margin, y);
    y += 16;
  } else {
    // --------- Global green percentage (expected-slot based) ---------
    let gTotal = 0, expectedTotal = 0, missTotal = 0, offTotal = 0;

    monthKeys.forEach(dk => {
      if (dk <= todayKey && fourdxIsOffday(dk)) offTotal++;
    });

    leads.forEach((lead) => {
      const expectedKeys = fourdxExpectedKeysForLead(lead, monthKeys); // already excludes future + offdays + before activeFrom
      expectedTotal += expectedKeys.length;

      expectedKeys.forEach((dk) => {
        const raw = fourdxGetRawStatus(dk, lead.name);
        if (raw === "GREEN") gTotal++;
        if (!raw) missTotal++;
      });
    });

    const greenPct = expectedTotal ? Math.round((gTotal / expectedTotal) * 100) : 0;

    // Draw bar
    const barW = pageWidth - (margin * 2) - 140;
    const barH = 10;
    const barX = margin;
    const barY = y;

    // Track
    pdf.setDrawColor(200,200,200);
    pdf.setFillColor(245,245,245);
    pdf.roundedRect(barX, barY, barW, barH, 5, 5, "FD");

    // Fill
    const fillW = Math.max(0, Math.min(barW, (barW * greenPct) / 100));
    pdf.setFillColor(34,197,94);
    pdf.roundedRect(barX, barY, fillW, barH, 5, 5, "F");

    // Text
    pdf.setTextColor(30,30,30);
    pdf.setFont("helvetica", "bold");
    pdf.text(`${greenPct}%`, barX + barW + 10, barY + 8);

    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(90,90,90);
    pdf.text(`${gTotal}/${expectedTotal} expected`, barX + barW + 45, barY + 8);

    y += 18;

    // Small counters
    pdf.setTextColor(60,60,60);
    pdf.text(`MISS: ${missTotal}   |   OFF days (month-to-date): ${offTotal}`, margin, y);
    y += 16;

    // Legend (tiny)
    const legendY = y;
    const box = 8;
    const gap = 10;
    let lx = margin;

    function legendItem(label, fill, stroke){
      if (stroke) pdf.setDrawColor(...stroke);
      else pdf.setDrawColor(210,210,210);
      if (fill) pdf.setFillColor(...fill);
      else pdf.setFillColor(255,255,255);

      pdf.rect(lx, legendY-7, box, box, "FD");
      lx += box + 5;
      pdf.setTextColor(80,80,80);
      pdf.text(label, lx, legendY-1);
      lx += pdf.getTextWidth(label) + gap;
    }

    legendItem("Green",  [34,197,94],  [34,197,94]);
    legendItem("Yellow", [234,179,8],  [234,179,8]);
    legendItem("Red",    [239,68,68],  [239,68,68]);
    legendItem("Miss",   [251,191,36], [251,191,36]);
    legendItem("Off",    [148,163,184],[148,163,184]);
    legendItem("Empty",  null,         [210,210,210]);

    y += 14;

    // --------- Per-lead calendar grid ---------
    const cols = 7;
    const cell = 14;
    const cg = 4; // gap
    const rowH = cell + cg;

    leads.forEach((lead, leadIdx) => {
      // Page break for each lead block
      const approxH = 14 + 10 + (Math.ceil(monthKeys.length / cols) * rowH) + 14;
      if (y + approxH > pageHeight - margin) {
        pdf.addPage();
        y = margin + 10;
      }

      // Lead title
      pdf.setTextColor(20,20,20);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(11);
      pdf.text(`${lead.name}`, margin, y);
      y += 10;

      // Lead metrics
      const expectedKeys = fourdxExpectedKeysForLead(lead, monthKeys);
      let g=0,yw=0,r=0,miss=0;
      expectedKeys.forEach((dk)=>{
        const raw = fourdxGetRawStatus(dk, lead.name);
        if (raw === "GREEN") g++;
        else if (raw === "YELLOW") yw++;
        else if (raw === "RED") r++;
        else miss++;
      });
      const leadGreenPct = expectedKeys.length ? Math.round((g/expectedKeys.length)*100) : 0;

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(9);
      pdf.setTextColor(90,90,90);
      pdf.text(`Green: ${leadGreenPct}%   |   Expected: ${expectedKeys.length}   |   MISS: ${miss}   |   Active from: ${lead.activeFrom || "-"}`, margin, y);
      y += 10;

      // Calendar cells (1..lastDay)
      const startX = margin;
      let x = startX;
      let col = 0;

      monthKeys.forEach((dk) => {
        const dayNum = Number(dk.slice(8,10));

        // status using your display logic
        const st = fourdxGetDisplayStatus(dk, lead.name, lead.activeFrom);

        // color mapping
        let fill = null, stroke = [210,210,210], textColor = [80,80,80], label = null;

        if (st === "GREEN") { fill = [34,197,94]; stroke = [34,197,94]; }
        else if (st === "YELLOW") { fill = [234,179,8]; stroke = [234,179,8]; }
        else if (st === "RED") { fill = [239,68,68]; stroke = [239,68,68]; }
        else if (st === "MISS") { fill = [251,191,36]; stroke = [251,191,36]; }
        else if (st === "OFF") { fill = [148,163,184]; stroke = [148,163,184]; label = "OFF"; }
        else {
          // FUTURE or INACTIVE => empty slot
          fill = null;
          stroke = [210,210,210];
        }

        // Draw cell
        pdf.setDrawColor(...stroke);
        if (fill) {
          pdf.setFillColor(fill[0], fill[1], fill[2]);
          // light fill
          pdf.rect(x, y, cell, cell, "FD");
        } else {
          pdf.setFillColor(255,255,255);
          pdf.rect(x, y, cell, cell, "D");
        }

        // Day number (small)
        pdf.setTextColor(...textColor);
        pdf.setFontSize(7);
        pdf.text(String(dayNum), x + 3, y + 5);

        // OFF label
        if (label) {
          pdf.setFontSize(6);
          pdf.setTextColor(30,30,30);
          pdf.text(label, x + 2, y + cell - 3);
        }

        // move
        col++;
        if (col >= cols) {
          col = 0;
          x = startX;
          y += rowH;
        } else {
          x += (cell + cg);
        }
      });

      // after grid: move y if last row not ended perfectly
      if (col !== 0) y += rowH;
      y += 10;
    });
  }

  // Divider line before next section
  pdf.setDrawColor(220, 220, 220);
  pdf.line(margin, y, pageWidth - margin, y);
  y += 14;
  
  // ==========================
  // 6. SECTION 2 – LEARNING SUMMARY
  // ==========================
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(13);
  pdf.text("2. Learning & Skills Summary", margin, y);
  y += 16;

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(11);
  pdf.text(`Total learning XP this month: ${totalLearningXp}`, margin, y);
  y += 16;

  pdf.text("Top 3 highest skill gain:", margin, y);
  y += 10;

  if (!top3.length) {
    pdf.setFontSize(10);
    pdf.setTextColor(120, 120, 120);
    pdf.text("No learning data for this month.", margin, y);
    pdf.setTextColor(0, 0, 0);
    y += 18;
  } else {
    const barMaxWidth = pageWidth - margin * 2 - 60;
    const maxXp = top3[0][1] || 1;

    top3.forEach(([cat, xp]) => {
      const label = (typeof categoryLabel === "function")
        ? categoryLabel(cat)
        : cat;
      const width = (xp / maxXp) * barMaxWidth;

      pdf.setFontSize(10);
      pdf.text(label, margin, y);
      pdf.setFontSize(9);
      pdf.setTextColor(100, 100, 100);
      pdf.text(`${xp} XP`, pageWidth - margin - 40, y);
      pdf.setTextColor(0, 0, 0);

      const barY = y + 4;
      pdf.setFillColor(255, 180, 67);
      pdf.setDrawColor(230, 230, 230);
      pdf.rect(margin, barY, width, 6, "F");
      y += 18;
    });
  }

  ensureSpace(40);
  pdf.setFontSize(11);
  pdf.text("Learning activity heatmap (XP per day):", margin, y);
  y += 10;

  // Heatmap learning (warna berdasarkan XP harian)
  const lCellSize = 10;
  const lCellGap = 2;
  const lCols = 14;
  const lStartY = y;

  dayKeys.forEach((key, idx) => {
    const row = Math.floor(idx / lCols);
    const col = idx % lCols;
    const x = margin + col * (lCellSize + lCellGap);
    const cy = lStartY + row * (lCellSize + lCellGap);

    const stats = computeLearningStatsForDate(key);
    const xp = stats.xp || 0;

    let r = 230, g = 230, b = 230;
    if (xp > 0 && xp < 20) { r = 219; g = 234; b = 254; }       // biru muda
    else if (xp >= 20 && xp < 50) { r = 147; g = 197; b = 253; } // biru medium
    else if (xp >= 50) { r = 59; g = 130; b = 246; }             // biru tua

    pdf.setFillColor(r, g, b);
    pdf.setDrawColor(220, 220, 220);
    pdf.rect(x, cy, lCellSize, lCellSize, "F");
  });

  const lHeatRows = Math.ceil(dayKeys.length / lCols);
  y = lStartY + lHeatRows * (lCellSize + lCellGap) + 24;

  // =====================================================
  // 7. SECTION 3 – TASK DETAILS (PER DAY)
  // =====================================================
  ensureSpace(40);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(13);
  pdf.text("3. Task Details (per day)", margin, y);
  y += 20;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);

  dayKeys.forEach((key) => {
    const tasks = (appState.tasks && appState.tasks[key]) || [];
    if (!tasks.length) return;

    ensureSpace(18);
    const dateLabel = new Date(key + "T00:00:00").toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
    pdf.setFont("helvetica", "bold");
    pdf.text(dateLabel, margin, y);
    y += 12;

    pdf.setFont("helvetica", "normal");
    tasks.forEach((t) => {
      ensureSpace(12);
      const status = t.status || "-";
      const effort = t.effort != null ? t.effort : "-";
      const xp = t.xp != null ? t.xp : 0;
      const name = t.name || t.title || "(no title)";

      const line = `• [${status} | Effort ${effort} | ${xp} XP] ${name}`;
      const wrapped = pdf.splitTextToSize(line, pageWidth - margin * 2 - 12);
      pdf.text(wrapped, margin + 12, y);
      y += wrapped.length * 11 + 2;
    });

    y += 4;
  });

  // =====================================================
  // 8. SECTION 4 – LEARNING & REFLECTION DETAILS
  // =====================================================
  ensureSpace(40);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(13);
  pdf.text("4. Learning & Reflection Details", margin, y);
  y += 20;

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);

  dayKeys.forEach((key) => {
    const entries = (appState.learning && appState.learning[key]) || [];
    if (!entries.length) return;

    ensureSpace(18);
    const dateLabel = new Date(key + "T00:00:00").toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
    pdf.setFont("helvetica", "bold");
    pdf.text(dateLabel, margin, y);
    y += 12;

    pdf.setFont("helvetica", "normal");

    entries.forEach((entry) => {
      ensureSpace(20);
      const cat = entry.category || "-";
      const sub = entry.subskill || entry.skill || "";
      const eff = entry.effort || "-";
      const xp =
        (window.LEARNING_XP_PER_EFFORT && window.LEARNING_XP_PER_EFFORT[entry.effort]) ||
        0;

      const titleLine = `• [${cat}${sub ? " – " + sub : ""} | Effort ${eff} | ${xp} XP]`;
      pdf.text(titleLine, margin + 12, y);
      y += 12;

      const parts = [];
      if (entry.topic) parts.push(entry.topic);
      if (entry.what) parts.push(entry.what);
      if (entry.note) parts.push(entry.note);
      if (entry.description) parts.push(entry.description);
      if (entry.benefit) parts.push("Benefit: " + entry.benefit);
      if (entry.reflection) parts.push("Reflection: " + entry.reflection);

      const detailText = parts.join(" | ");
      if (detailText) {
        const wrapped = pdf.splitTextToSize(
          detailText,
          pageWidth - margin * 2 - 24
        );
        pdf.text(wrapped, margin + 18, y);
        y += wrapped.length * 11 + 4;
      } else {
        y += 4;
      }
    });

    y += 4;
  });

  // ----- 9. Save file -----
  pdf.save("HeyHoLetsGo_Monthly_Report.pdf");
}


exportPdfBtn.addEventListener("click", exportPDF);

/* HO-HO MOOD & BOUNCE */
function updateHoHoMood() {
  const todayKey = getTodayKey();
  const tStats = computeTaskStatsForDate(todayKey);
  const lStats = computeLearningStatsForDate(todayKey);

  // Ho-Ho di tab Tasks
  if (tStats.percent >= 80) hohoTaskFloat.src = "hoho-levelup.png";
  else if (tStats.percent >= 40) hohoTaskFloat.src = "hoho-pumped.png";
  else if (tStats.percent > 0) hohoTaskFloat.src = "hoho-sad.png";
  else hohoTaskFloat.src = "hoho-happy.png";

  // Ho-Ho di tab Learning
  if (lStats.percent >= 80) hohoLearningFloat.src = "hoho-levelup.png";
  else if (lStats.percent >= 40) hohoLearningFloat.src = "hoho-book.png";
  else if (lStats.percent > 0) hohoLearningFloat.src = "hoho-thinking.png";
  else hohoLearningFloat.src = "hoho-book.png";
}

function bounceOnce(el) {
  if (!el) return;
  el.style.animation = "none";
  void el.offsetWidth; // force reflow
  el.style.animation = "hohoBounce 0.6s cubic-bezier(0.34,1.56,0.64,1)";
}

hohoTaskFloat.addEventListener("click", () => bounceOnce(hohoTaskFloat));
hohoLearningFloat.addEventListener("click", () => bounceOnce(hohoLearningFloat));

function scheduleRandomBounce() {
  const delay = 3500 + Math.random() * 2500;
  setTimeout(() => {
    if (!hohoTaskFloat.classList.contains("hidden")) {
      bounceOnce(hohoTaskFloat);
    }
    if (!hohoLearningFloat.classList.contains("hidden")) {
      bounceOnce(hohoLearningFloat);
    }
    scheduleRandomBounce();
  }, delay);
}
// ===== 4DX RENDER (DUMMY UI) =====
function hohoIconForStatus(status){
  if(status === "GREEN") return "assets/emothoho/hoho4dx_green.png";
  if(status === "YELLOW") return "assets/emothoho/hoho4dx_yellow.png";
  return "assets/emothoho/hoho4dx_red.png";
}
function fourdxIsOffday(dateKey){
  ensure4DXState();
  return !!appState.fourdx.offdays[dateKey];
}

// raw status: bisa null kalau belum diisi
function fourdxGetRawStatus(dateKey, leadName){
  ensure4DXState();
  const dayObj = appState.fourdx.checkins[dateKey];
  return dayObj ? (dayObj[leadName] || null) : null;
}

// display status: kalau belum diisi → dianggap RED (anti green palsu), tapi completion tetap ngitung "missing"
function fourdxGetDisplayStatus(dateKey, leadName, leadActiveFrom){
  // OFFDAY global
  if (fourdxIsOffday(dateKey)) return "OFF";

  const todayKey = getTodayKey();

  // Future date: tetap ada slot tapi kosong
  if (dateKey > todayKey) return "FUTURE";

  // Sebelum lead berlaku: slot kosong beda style
  const activeFrom = leadActiveFrom || "0000-01-01";
  if (dateKey < activeFrom) return "INACTIVE";

  // Past/today dan sudah aktif:
  const raw = fourdxGetRawStatus(dateKey, leadName);

  // Belum diisi → MISS (lebih jujur daripada RED)
  if (!raw) return "MISS";

  return raw; // GREEN/YELLOW/RED
}

function fourdxLastNDaysKeys(n){
  const todayKey = getTodayKey();
  const today = new Date(todayKey + "T00:00:00");
  const keys = [];
  for(let i = n - 1; i >= 0; i--){
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    keys.push(d.toISOString().slice(0,10));
  }
  return keys;
}
function fourdxExpectedKeysForLead(lead, dayKeys){
  ensure4DXState();
  const activeFrom = lead.activeFrom || "0000-01-01";
  const todayKey = getTodayKey();

  return dayKeys.filter(dk =>
    dk >= activeFrom &&
    dk <= todayKey &&          // exclude future
    !fourdxIsOffday(dk)        // exclude global offdays
  );
}
function fourdxComputeLeadCompletion(lead, dayKeys){
  const expectedDays = fourdxExpectedKeysForLead(lead, dayKeys);

  const filledDays = expectedDays.filter(dk => !!fourdxGetRawStatus(dk, lead.name));

  const expected = expectedDays.length;
  const filled = filledDays.length;
  const miss = Math.max(0, expected - filled);
  const pct = expected ? Math.round((filled/expected)*100) : 0;

  return { expected, filled, miss, pct };
}
function ensure4DXState() {
  if (!appState.fourdx) {
    appState.fourdx = {
      wig: "",
      leadMeasures: [],   // [{ name, activeFrom }]
      lagMeasures: [],
      checkins: {},       // { "YYYY-MM-DD": { "Lead name": "RED|YELLOW|GREEN" } }
      offdays: {}         // { "YYYY-MM-DD": true }
    };
  }

  if (!Array.isArray(appState.fourdx.leadMeasures)) appState.fourdx.leadMeasures = [];
  if (!Array.isArray(appState.fourdx.lagMeasures)) appState.fourdx.lagMeasures = [];
  if (!appState.fourdx.checkins || typeof appState.fourdx.checkins !== "object") appState.fourdx.checkins = {};
  if (!appState.fourdx.offdays || typeof appState.fourdx.offdays !== "object") appState.fourdx.offdays = {};

  // MIGRATION: kalau leadMeasures masih array string → ubah jadi object + activeFrom (hari ini)
  const todayKey = getTodayKey();
  if (appState.fourdx.leadMeasures.length && typeof appState.fourdx.leadMeasures[0] === "string") {
    appState.fourdx.leadMeasures = appState.fourdx.leadMeasures.slice(0,4).map((nm) => ({
      name: (nm || "").trim() || "Masukkan Lead 1",
      activeFrom: todayKey
    }));
    saveState();
  }
}
function render4DX() {
    ensure4DXState();

  if (!fourdxMonthlyRows) return;

  // default: cukup 1 lead dulu biar user rename (lebih clean)
if (!appState.fourdx.leadMeasures || !appState.fourdx.leadMeasures.length) {
  appState.fourdx.leadMeasures = [{ name: "Masukkan Lead 1", activeFrom: getTodayKey() }];
  saveState();
}

// normalisasi max 4
const finalLeads = (appState.fourdx.leadMeasures || []).slice(0, 4);

  const periodVal = (fourdxPeriodSelect && fourdxPeriodSelect.value) || "30";
  const period = (periodVal === "month") ? new Date().getDate() : parseInt(periodVal, 10);
  const todayKey = getTodayKey();
  const today = new Date(todayKey + "T00:00:00");

  const dayKeys = [];
  if (periodVal === "month") {
    const daysInThisMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    for (let i = daysInThisMonth - 1; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth(), daysInThisMonth - i);
      const iso = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
      dayKeys.push(iso);
    }
  } else {
    const n = parseInt(periodVal, 10) || 30;
    for (let i = n - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      dayKeys.push(d.toISOString().slice(0, 10));
    }
  }

  // bikin emoji row sepanjang period
const rows = finalLeads.map((lead) => ({
  lead,
  cells: dayKeys.map((dk) => fourdxGetDisplayStatus(dk, lead.name, lead.activeFrom))
}));

// overall % green (expected-slot based)
let g = 0, total = 0;

finalLeads.forEach((lead) => {
  const expectedKeys = fourdxExpectedKeysForLead(lead, dayKeys);
  total += expectedKeys.length;

  expectedKeys.forEach((dk) => {
    const raw = fourdxGetRawStatus(dk, lead.name);
    if (raw === "GREEN") g++;
  });
});

const pct = total ? Math.round((g / total) * 100) : 0;

  if (fourdxOverallGreen) fourdxOverallGreen.textContent = pct + "%";
    // Battery bar (dummy) – %green + fraction
  if (fourdxBatteryPct) fourdxBatteryPct.textContent = pct + "%";
  if (fourdxBatteryFill) fourdxBatteryFill.style.width = pct + "%";
  if (fourdxBatteryFraction) fourdxBatteryFraction.textContent = `${g}/${total}`;


  // Render Monthly Lead Progress (emoji berjejer)
  fourdxMonthlyRows.innerHTML = "";
  rows.forEach((row) => {
// ✅ expected slots khusus lead ini (ikut activeFrom + offday + sampai hari ini)
const expectedKeys = fourdxExpectedKeysForLead(row.lead, dayKeys);

// hitung GREEN/YELLOW/RED dari expectedKeys (raw status aja)
// kalau null (belum diisi) => itu MISS, bukan RED
let green = 0, yellow = 0, red = 0;

expectedKeys.forEach((dk) => {
  const raw = fourdxGetRawStatus(dk, row.lead.name);
  if (raw === "GREEN") green++;
  else if (raw === "YELLOW") yellow++;
  else if (raw === "RED") red++;
});

const expected = expectedKeys.length;
const greenPct = expected ? Math.round((green / expected) * 100) : 0;

// completion (udah include miss)
const comp = fourdxComputeLeadCompletion(row.lead, dayKeys);

    const block = document.createElement("div");
const gridHtml = row.cells.map((status) => {
  // FUTURE: slot kosong tapi keliatan (dashed)
  if (status === "FUTURE") {
    return `<div class="fourdx-emoji-cell is-future" data-status="${status}" title="Future day"></div>`;
  }

  // INACTIVE: sebelum activeFrom (abu tipis)
  if (status === "INACTIVE") {
    return `<div class="fourdx-emoji-cell is-inactive" data-status="${status}" title="Belum berlaku"></div>`;
  }

  // OFF: offday (tulisan OFF)
  if (status === "OFF") {
    return `<div class="fourdx-emoji-cell is-off" data-status="${status}" title="Off day">OFF</div>`;
  }

  // MISS: belum diisi
  if (status === "MISS") {
    return `<div class="fourdx-emoji-cell is-miss" data-status="${status}" title="Belum diisi">MISS</div>`;
  }

  // GREEN/YELLOW/RED: icon
  return `
    <div class="fourdx-emoji-cell" data-status="${status}">
      <img class="fourdx-icon" src="${hohoIconForStatus(status)}" alt="${status}">
    </div>
  `;
}).join("");

    block.className = "fourdx-lead-box";
    block.innerHTML = `
      <div class="fourdx-lead-head">
        <div style="font-weight:800;">${row.lead.name}</div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:2px;white-space:nowrap;">
  <div style="font-size:12px;color:var(--text-light);">
    <b>${greenPct}% green</b>
  </div>
  <div style="font-size:11px;color:var(--text-light);">
  Completion: <b>${comp.pct}%</b> (${comp.filled}/${comp.expected}) · MISS: <b>${comp.miss}</b></div>
</div>
      </div>

      <div class="fourdx-emoji-grid">
        ${gridHtml}
      </div>

      <div style="font-size:12px;color:var(--text-light);margin-top:8px;">
        Green ${green} · Yellow ${yellow} · Red ${red}
      </div>

      <div style="font-size:12px;margin-top:6px;">
        🔥 Streak: <b>0</b> hari
      </div>

      <div style="font-size:12px;margin-top:4px;color:var(--text-light);">
        🎯 ${greenPct < 50 ? "😡 Needs focus" : (greenPct < 80 ? "😐 Keep pushing" : "😄 Good job")}
      </div>
    `;
    
    fourdxMonthlyRows.appendChild(block);
  });

  // Render Lead Measures list (dummy input UI)
  if (leadMeasuresList) {
    leadMeasuresList.innerHTML = "";
    finalLeads.forEach((lead, idx) => {
  const row = document.createElement("div");
  row.style.display = "grid";
  row.style.gridTemplateColumns = "minmax(0,1fr) 160px 42px";
  row.style.gap = "10px";
  row.style.alignItems = "center";

  const input = document.createElement("input");
  input.type = "text";
  input.value = lead.name || `Masukkan Lead ${idx + 1}`;

const activeWrap = document.createElement("div");
activeWrap.style.display = "flex";
activeWrap.style.flexDirection = "column";
activeWrap.style.gap = "4px";

const active = document.createElement("input");
active.type = "date";
active.value = lead.activeFrom || getTodayKey();

const hint = document.createElement("div");
hint.style.fontSize = "11px";
hint.style.color = "var(--text-light)";
hint.textContent = "Mulai dihitung dari tanggal ini";

activeWrap.appendChild(active);
activeWrap.appendChild(hint);

  input.addEventListener("change", () => {
    ensure4DXState();

    const oldName = (appState.fourdx.leadMeasures[idx]?.name || "").trim();
    const newName = input.value.trim() || `Masukkan Lead ${idx + 1}`;

    // rename lead
    appState.fourdx.leadMeasures[idx].name = newName;

    // MIGRATE CHECKINS KEY (biar data lama gak hilang)
    if (oldName && oldName !== newName) {
      Object.keys(appState.fourdx.checkins || {}).forEach((dk) => {
        const dayObj = appState.fourdx.checkins[dk];
        if (dayObj && dayObj[oldName]) {
          dayObj[newName] = dayObj[oldName];
          delete dayObj[oldName];
        }
      });
    }

    saveState();
    render4DX();
  });

  active.addEventListener("change", () => {
    ensure4DXState();
    appState.fourdx.leadMeasures[idx].activeFrom = active.value || getTodayKey();
    saveState();
    render4DX();
  });

  const del = document.createElement("button");
  del.type = "button";
  del.className = "btn-ghost";
  del.textContent = "✕";
  del.style.width = "42px";
  del.style.background = "#f97373";
  del.style.color = "#111827";
  del.addEventListener("click", () => {
    ensure4DXState();
    appState.fourdx.leadMeasures.splice(idx, 1);
    saveState();
    render4DX();
  });

  row.appendChild(input);
  row.appendChild(activeWrap);;
  row.appendChild(del);
  leadMeasuresList.appendChild(row);
});
  }

// add lead measure (max 4)
if (addLeadMeasureBtn && !addLeadMeasureBtn.dataset.bound) {
  addLeadMeasureBtn.dataset.bound = "1";
  addLeadMeasureBtn.addEventListener("click", () => {
    ensure4DXState();
    if (appState.fourdx.leadMeasures.length >= 4) {
      alert("Max 4 lead measures ya bro 😄");
      return;
    }
    appState.fourdx.leadMeasures.push({
      name: `Masukkan Lead ${appState.fourdx.leadMeasures.length + 1}`,
      activeFrom: getTodayKey()
    });
    saveState();
    render4DX();
  });
}
   // Render Daily Lead Check-in (dummy buttons with hoho icons)
// Render Daily Lead Check-in (Today)
if (leadCheckinToday) {
  ensure4DXState();

  const todayKey = getTodayKey();
  const isOff = fourdxIsOffday(todayKey);
  const todayObj = appState.fourdx.checkins[todayKey] || {};

  leadCheckinToday.innerHTML =
    finalLeads.map((lead) => `
      <div data-lead="${lead.name}" style="display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:10px;">
        <div style="font-size:13px;font-weight:700;">${lead.name}</div>

        <div style="display:flex;gap:10px;align-items:center;${isOff ? "opacity:0.55;pointer-events:none;" : ""}">
          <button type="button" class="fourdx-check-btn ${todayObj[lead.name] === "RED" ? "selected" : ""}" data-status="RED"
            style="width:40px;height:40px;border-radius:12px;border:1px solid var(--border);background:rgba(255,255,255,0.65);display:flex;align-items:center;justify-content:center;">
            <img class="fourdx-icon" src="${hohoIconForStatus("RED")}" alt="RED" draggable="false">
          </button>

          <button type="button" class="fourdx-check-btn ${todayObj[lead.name] === "YELLOW" ? "selected" : ""}" data-status="YELLOW"
            style="width:40px;height:40px;border-radius:12px;border:1px solid var(--border);background:rgba(255,255,255,0.65);display:flex;align-items:center;justify-content:center;">
            <img class="fourdx-icon" src="${hohoIconForStatus("YELLOW")}" alt="YELLOW" draggable="false">
          </button>

          <button type="button" class="fourdx-check-btn ${todayObj[lead.name] === "GREEN" ? "selected" : ""}" data-status="GREEN"
            style="width:40px;height:40px;border-radius:12px;border:1px solid var(--border);background:rgba(255,255,255,0.65);display:flex;align-items:center;justify-content:center;">
            <img class="fourdx-icon" src="${hohoIconForStatus("GREEN")}" alt="GREEN" draggable="false">
          </button>
        </div>
      </div>
    `).join("") +
    (isOff ? `<div style="margin-top:8px;font-size:12px;color:var(--text-light);">Hari ini OFFDAY. Check-in dimatikan.</div>` : "");
}

  // Render Lag Measures (dummy)
   if (lagMeasuresList) {
    ensure4DXState();
    lagMeasuresList.innerHTML = "";
    const lags = appState.fourdx.lagMeasures.length ? appState.fourdx.lagMeasures : ["Profit IFMN 200jt per bulan sepanjang 2026"];
    if (!appState.fourdx.lagMeasures.length) appState.fourdx.lagMeasures = lags;

    appState.fourdx.lagMeasures.forEach((name, idx) => {
      const row = document.createElement("div");
      row.style.display = "flex";
      row.style.gap = "10px";
      row.style.alignItems = "center";

      const input = document.createElement("input");
      input.type = "text";
      input.value = name;
      input.style.flex = "1";
      input.addEventListener("change", () => {
        appState.fourdx.lagMeasures[idx] = input.value.trim() || `Lag ${idx + 1}`;
        saveState();
      });

      const del = document.createElement("button");
      del.type = "button";
      del.className = "btn-ghost";
      del.textContent = "✕";
      del.style.width = "42px";
      del.style.background = "#f97373";
      del.style.color = "#111827";
      del.addEventListener("click", () => {
        appState.fourdx.lagMeasures.splice(idx, 1);
        saveState();
        render4DX();
      });

      row.appendChild(input);
      row.appendChild(del);
      lagMeasuresList.appendChild(row);
    });
  }

  if (addLagMeasureBtn && !addLagMeasureBtn.dataset.bound) {
  addLagMeasureBtn.dataset.bound = "1";
  addLagMeasureBtn.addEventListener("click", () => {
    ensure4DXState();
    appState.fourdx.lagMeasures.push(`Lag Measure ${appState.fourdx.lagMeasures.length + 1}`);
    saveState();
    render4DX();
  });
}

  // WIG dummy default
  if (wigInput) {
    ensure4DXState();
    if (!appState.fourdx.wig) appState.fourdx.wig = "Meningkatkan pertumbuhan revenue 30% YoY di 2026";
    wigInput.value = appState.fourdx.wig;

    if (!wigInput.dataset.bound) {
      wigInput.dataset.bound = "1";
      wigInput.addEventListener("change", () => {
        ensure4DXState();
        appState.fourdx.wig = wigInput.value.trim();
        saveState();
      });
    }
  }
}
function fourdxOpenEditModal(){
  const modal = document.getElementById("fourdxEditModal");
  if(!modal) return;
  modal.classList.remove("hidden");
  modal.setAttribute("aria-hidden","false");
  fourdxRenderEditGrid();
}

function fourdxCloseEditModal(){
  const modal = document.getElementById("fourdxEditModal");
  if(!modal) return;
  modal.classList.add("hidden");
  modal.setAttribute("aria-hidden","true");
}

function fourdxCycleStatus(current){
  // cycle: RED → YELLOW → GREEN → OFF
  if(current === "RED") return "YELLOW";
  if(current === "YELLOW") return "GREEN";
  if(current === "GREEN") return "OFF";
  return "RED";
}

function fourdxSetStatus(dateKey, leadName, status){
  ensure4DXState();

  // OFFDAY global per tanggal
  if(status === "OFF"){
    appState.fourdx.offdays[dateKey] = true;
    saveState();
    return;
  }

  // kalau status bukan OFF, pastikan tanggal bukan offday
  if(appState.fourdx.offdays[dateKey]) delete appState.fourdx.offdays[dateKey];

  if(!appState.fourdx.checkins[dateKey]) appState.fourdx.checkins[dateKey] = {};
  appState.fourdx.checkins[dateKey][leadName] = status;
  saveState();
}

function fourdxRenderEditGrid(){
  ensure4DXState();
  const grid = document.getElementById("fourdxEditGrid");
  if(!grid) return;

  const leads = (appState.fourdx.leadMeasures || []).slice(0,4);
  const dayKeys = fourdxLastNDaysKeys(14);

  // Header row: label + 14 dates
  let html = `<div class="fourdx-edit-row">`;
  html += `<div class="fourdx-edit-cell fourdx-edit-head fourdx-edit-leadname">Lead \\ Date</div>`;
  dayKeys.forEach(dk=>{
    const day = new Date(dk+"T00:00:00").getDate();
    const off = fourdxIsOffday(dk);
    html += `<div class="fourdx-edit-cell fourdx-edit-head ${off ? "fourdx-edit-offday" : ""}" data-datehead="${dk}">
      ${day}<div style="font-size:10px;margin-top:2px;">${off ? "OFF" : ""}</div>
    </div>`;
  });
  html += `</div>`;

  // Rows per lead
  leads.forEach(lead=>{
    html += `<div class="fourdx-edit-row">`;
    html += `<div class="fourdx-edit-cell fourdx-edit-leadname">${lead.name || "Lead"}</div>`;

    dayKeys.forEach(dk=>{
      const disp = fourdxGetDisplayStatus(dk, lead.name);
      const isOff = (disp === "OFF");
      html += `<div class="fourdx-edit-cell ${isOff ? "fourdx-edit-offday" : ""}">
        <div class="fourdx-edit-btn" data-date="${dk}" data-lead="${lead.name}" data-status="${disp}">
          ${isOff ? `<span style="font-size:11px;font-weight:900;color:var(--text-light);">OFF</span>`
                  : `<img src="${hohoIconForStatus(disp)}" alt="${disp}" draggable="false">`}
        </div>
      </div>`;
    });

    html += `</div>`;
  });

  grid.innerHTML = html;

  // Click handler: cell cycle
  grid.onclick = (e) => {
    const btn = e.target.closest(".fourdx-edit-btn");
    if(btn){
      const dateKey = btn.getAttribute("data-date");
      const leadName = btn.getAttribute("data-lead");
      const cur = btn.getAttribute("data-status") || "RED";
      const next = fourdxCycleStatus(cur);

      fourdxSetStatus(dateKey, leadName, next);

      // refresh modal + main UI
      fourdxRenderEditGrid();
      render4DX();
      return;
    }

    // Click date header: toggle OFFDAY (lebih gampang buat meeting)
    const head = e.target.closest("[data-datehead]");
    if(head){
      const dk = head.getAttribute("data-datehead");
      ensure4DXState();
      if(appState.fourdx.offdays[dk]) delete appState.fourdx.offdays[dk];
      else appState.fourdx.offdays[dk] = true;
      saveState();
      fourdxRenderEditGrid();
      render4DX();
    }
  };
}
function setAuthStatus(message, isError) {
  if (!authStatusText) return;
  authStatusText.textContent = message || "";
  authStatusText.style.color = isError ? "#dc2626" : "var(--text-light)";
}

function showAuthScreen() {
  if (authScreenEl) authScreenEl.classList.remove("hidden");
  if (fullReportAreaEl) fullReportAreaEl.classList.add("hidden");
  if (topBarEl) topBarEl.classList.add("hidden");
  if (hohoTaskFloat) hohoTaskFloat.classList.add("hidden");
  if (hohoLearningFloat) hohoLearningFloat.classList.add("hidden");
}

function showAppShell() {
  if (authScreenEl) authScreenEl.classList.add("hidden");
  if (fullReportAreaEl) fullReportAreaEl.classList.remove("hidden");
  if (topBarEl) topBarEl.classList.remove("hidden");
}

function renderAll() {
  applyTheme(appState.theme || "light");
  updateRoleVisibility();
  showTab("tasksTab");
  renderTasksForToday();
  renderTaskHeatmap();
  renderLearningForToday();
  renderLearningHeatmap();
  renderSkillProgress();
  renderTop3Skills();
  renderProfile();
  render4DX();
}

function canUseDashboard() {
  const currentProfile = window.HoHoCloudService ? window.HoHoCloudService.getCurrentProfile() : null;
  const role = (currentProfile && currentProfile.role) || appState.user.role || "regular_user";
  return role === "superuser" || role === "admin";
}

function updateRoleVisibility() {
  const currentProfile = window.HoHoCloudService ? window.HoHoCloudService.getCurrentProfile() : null;
  const role = (currentProfile && currentProfile.role) || appState.user.role || "regular_user";
  const canDashboard = role === "superuser" || role === "admin";
  if (dashboardTabBtn) dashboardTabBtn.classList.toggle("hidden", !canDashboard);
  document.querySelectorAll(".admin-only-card").forEach((el) => {
    el.classList.toggle("hidden", !canDashboard);
  });
  document.querySelectorAll(".superuser-only-card").forEach((el) => {
    el.classList.toggle("hidden", role !== "superuser");
  });
  [settingsRoleInput, settingsManagerInput, saveUserRoleBtn].forEach((el) => {
    if (el) el.disabled = role !== "superuser";
  });
  if (dashboardRoleLabel) dashboardRoleLabel.textContent = role === "superuser" ? "Superuser view" : "Admin view";
}

function populateAssignableUsers() {
  const currentUser = window.HoHoCloudService ? window.HoHoCloudService.getCurrentUser() : null;
  const profiles = window.HoHoCloudService ? window.HoHoCloudService.getAssignableProfiles() : [];
  const currentProfile = window.HoHoCloudService ? window.HoHoCloudService.getCurrentProfile() : null;
  const role = (currentProfile && currentProfile.role) || appState.user.role || "regular_user";

  if (profileRoleText) profileRoleText.textContent = role;
  if (sessionUserText) sessionUserText.textContent = appState.user.name || appState.user.email || "Signed in";

  if (taskOwnerInput) {
    taskOwnerInput.innerHTML = `<option value="self">Me</option>`;
    profiles.forEach((profile) => {
      if (!currentUser || profile.id === currentUser.id) return;
      if (profile.status && profile.status !== "active") return;
      const opt = document.createElement("option");
      opt.value = profile.id;
      opt.textContent = `${profile.name || profile.email} (${profile.role || "regular_user"})`;
      taskOwnerInput.appendChild(opt);
    });
  }

  if (settingsAssignableUsers) {
    settingsAssignableUsers.innerHTML = "";
    profiles.forEach((profile) => {
      const opt = document.createElement("option");
      opt.value = profile.id;
      opt.textContent = `${profile.name || profile.email} — ${profile.role || "regular_user"}${profile.status && profile.status !== "active" ? " (" + profile.status + ")" : ""}`;
      opt.dataset.role = profile.role || "regular_user";
      opt.dataset.managerId = profile.manager_id || "";
      settingsAssignableUsers.appendChild(opt);
    });
    if (settingsRoleInput && settingsAssignableUsers.selectedOptions[0]) {
      settingsRoleInput.value = settingsAssignableUsers.selectedOptions[0].dataset.role || "regular_user";
    }
    populateManagerOptions();
  }
  syncTaskSourceOptions();
}

function populateManagerOptions() {
  if (!settingsManagerInput || !settingsAssignableUsers) return;
  const profiles = window.HoHoCloudService ? window.HoHoCloudService.getAssignableProfiles() : [];
  const selectedUserId = settingsAssignableUsers.value;
  const selectedManagerId = settingsAssignableUsers.selectedOptions[0]?.dataset.managerId || "";

  settingsManagerInput.innerHTML = `<option value="">No manager</option>`;
  profiles
    .filter((profile) => profile.id !== selectedUserId && (profile.role === "admin" || profile.role === "superuser"))
    .forEach((profile) => {
      const opt = document.createElement("option");
      opt.value = profile.id;
      opt.textContent = `${profile.name || profile.email} (${profile.role})`;
      settingsManagerInput.appendChild(opt);
    });

  settingsManagerInput.value = Array.from(settingsManagerInput.options).some((opt) => opt.value === selectedManagerId)
    ? selectedManagerId
    : "";
}

function syncTaskSourceOptions() {
  if (!taskOwnerInput || !taskSourceInput) return;
  const currentUser = window.HoHoCloudService ? window.HoHoCloudService.getCurrentUser() : null;
  const currentProfile = window.HoHoCloudService ? window.HoHoCloudService.getCurrentProfile() : null;
  const profiles = window.HoHoCloudService ? window.HoHoCloudService.getAssignableProfiles() : [];
  const role = (currentProfile && currentProfile.role) || appState.user.role || "regular_user";
  const sendingToOther = currentUser && taskOwnerInput.value && taskOwnerInput.value !== "self";
  const selectedProfile = profiles.find((profile) => profile.id === taskOwnerInput.value);
  const canAssignSelected =
    role === "superuser" ||
    (role === "admin" && selectedProfile && selectedProfile.manager_id === currentUser.id);

  Array.from(taskSourceInput.options).forEach((option) => {
    option.disabled = false;
  });

  if (!sendingToOther) {
    taskSourceInput.value = "self";
    Array.from(taskSourceInput.options).forEach((option) => {
      option.disabled = option.value !== "self";
    });
    return;
  }

  const selfOption = taskSourceInput.querySelector('option[value="self"]');
  if (selfOption) selfOption.disabled = true;

  const assignedOption = taskSourceInput.querySelector('option[value="assigned"]');
  if (assignedOption && !canAssignSelected) {
    assignedOption.disabled = true;
  }

  if (canAssignSelected) {
    if (taskSourceInput.value === "self") taskSourceInput.value = "assigned";
  } else {
    taskSourceInput.value = "delegated";
  }
}

function dashboardDefaultDates() {
  const today = new Date(getTodayKey() + "T00:00:00");
  const start = new Date(today.getFullYear(), today.getMonth(), 1);
  return {
    startDate: new Date(start.getTime() - start.getTimezoneOffset() * 60000).toISOString().slice(0, 10),
    endDate: getTodayKey()
  };
}

function ensureDashboardDates() {
  if (!dashboardStartDate || !dashboardEndDate) return dashboardDefaultDates();
  const defaults = dashboardDefaultDates();
  if (!dashboardStartDate.value) dashboardStartDate.value = defaults.startDate;
  if (!dashboardEndDate.value) dashboardEndDate.value = defaults.endDate;
  return { startDate: dashboardStartDate.value, endDate: dashboardEndDate.value };
}

function formatDashPct(value) {
  return Math.max(0, Math.min(100, Math.round(Number(value) || 0))) + "%";
}

function setDashboardStatus(message, isError) {
  if (!dashboardStatusText) return;
  dashboardStatusText.textContent = message || "";
  dashboardStatusText.style.color = isError ? "#dc2626" : "var(--text-light)";
}

function populateDashboardFilters(rows) {
  if (!dashboardUserFilter) return;
  const selected = dashboardUserFilter.value || "all";
  dashboardUserFilter.innerHTML = `<option value="all">All visible users</option>`;
  rows.forEach((row) => {
    const opt = document.createElement("option");
    opt.value = row.profile.id;
    opt.textContent = row.profile.name || row.profile.email || "Unnamed user";
    dashboardUserFilter.appendChild(opt);
  });
  dashboardUserFilter.value = Array.from(dashboardUserFilter.options).some((opt) => opt.value === selected) ? selected : "all";
}

function filterDashboardRows(rows) {
  const userId = dashboardUserFilter ? dashboardUserFilter.value : "all";
  const role = dashboardRoleFilter ? dashboardRoleFilter.value : "all";
  return rows.filter((row) => {
    if (userId !== "all" && row.profile.id !== userId) return false;
    if (role !== "all" && row.profile.role !== role) return false;
    return true;
  });
}

function renderDashboardTotals(rows) {
  const totalTaskXp = rows.reduce((sum, row) => sum + row.totalTaskXp, 0);
  const totalDone = rows.reduce((sum, row) => sum + row.done, 0);
  const totalLearningXp = rows.reduce((sum, row) => sum + row.totalLearningXp, 0);
  const greenRows = rows.filter((row) => row.fourdxGreenPct > 0);
  const avgGreen = greenRows.length
    ? Math.round(greenRows.reduce((sum, row) => sum + row.fourdxGreenPct, 0) / greenRows.length)
    : 0;
  if (dashTotalTaskXp) dashTotalTaskXp.textContent = totalTaskXp;
  if (dashTotalTasksDone) dashTotalTasksDone.textContent = totalDone;
  if (dashTotalLearningXp) dashTotalLearningXp.textContent = totalLearningXp;
  if (dashAvgFourdxGreen) dashAvgFourdxGreen.textContent = avgGreen + "%";
}

function renderDashboardTable(rows) {
  if (!dashboardTableBody) return;
  dashboardTableBody.innerHTML = "";
  if (!rows.length) {
    dashboardTableBody.innerHTML = `<tr><td colspan="11">No visible dashboard data for this filter.</td></tr>`;
    return;
  }

  rows.forEach((row) => {
    const tr = document.createElement("tr");
    tr.dataset.userId = row.profile.id;
    tr.innerHTML = `
      <td>${row.profile.name || row.profile.email || "-"}</td>
      <td>${row.profile.role || "-"}</td>
      <td>${row.totalTaskXp}</td>
      <td>${row.done}</td>
      <td>${row.progress}</td>
      <td>${row.blocked}</td>
      <td>${row.totalLearningXp}</td>
      <td>${row.learningEntries}</td>
      <td>${formatDashPct(row.fourdxGreenPct)}</td>
      <td>${row.assigned}</td>
      <td>${row.delegated}</td>
    `;
    tr.addEventListener("click", () => renderDashboardDetail(row));
    dashboardTableBody.appendChild(tr);
  });
}

function renderDashboardDetail(row) {
  if (!dashboardDetailTitle || !dashboardDetailBody || !dashboardDetailMeta) return;
  dashboardDetailTitle.textContent = row.profile.name || row.profile.email || "User Detail";
  dashboardDetailMeta.textContent = `${row.profile.role || "regular_user"} • ${row.profile.email || "-"}`;

  const recentTasks = row.tasks.slice(0, 8).map((task) =>
    `<li>${task.task_date}: <b>${task.title}</b> (${task.status}, effort ${task.effort}, ${task.source})</li>`
  ).join("");
  const recentLearning = row.learning.slice(0, 8).map((entry) =>
    `<li>${entry.entry_date}: <b>${categoryLabel(entry.category)}</b>${entry.subskill ? " - " + entry.subskill : ""} (${entry.effort})</li>`
  ).join("");

  dashboardDetailBody.className = "dashboard-detail-grid";
  dashboardDetailBody.innerHTML = `
    <div class="dashboard-detail-block">
      <h4>Tasks</h4>
      <div>XP: <b>${row.totalTaskXp}</b></div>
      <div>Done: <b>${row.done}</b> • Progress: <b>${row.progress}</b> • Blocked: <b>${row.blocked}</b></div>
      <ul>${recentTasks || "<li>No task rows in this period.</li>"}</ul>
    </div>
    <div class="dashboard-detail-block">
      <h4>Learning</h4>
      <div>XP: <b>${row.totalLearningXp}</b></div>
      <div>Entries: <b>${row.learningEntries}</b></div>
      <ul>${recentLearning || "<li>No learning rows in this period.</li>"}</ul>
    </div>
    <div class="dashboard-detail-block">
      <h4>4DX</h4>
      <div>Green: <b>${formatDashPct(row.fourdxGreenPct)}</b></div>
      <div>Check-ins: <b>${row.fourdxExpected}</b></div>
      <div>Legacy task XP: <b>${row.legacyTaskXp}</b></div>
      <div>Legacy learning XP: <b>${row.legacyLearningXp}</b></div>
    </div>
  `;
}

async function renderDashboard() {
  if (!canUseDashboard() || !window.HoHoDashboardService) return;
  const currentProfile = window.HoHoCloudService ? window.HoHoCloudService.getCurrentProfile() : null;
  const { startDate, endDate } = ensureDashboardDates();
  setDashboardStatus("Loading dashboard...");
  try {
    const rows = await window.HoHoDashboardService.loadDashboardData({ startDate, endDate, currentProfile });
    window.__hohoDashboardRows = rows;
    populateDashboardFilters(rows);
    const filtered = filterDashboardRows(rows);
    renderDashboardTotals(filtered);
    renderDashboardTable(filtered);
    setDashboardStatus(`Showing ${filtered.length} user(s), ${startDate} to ${endDate}.`);
  } catch (err) {
    console.error("Dashboard load failed", err);
    setDashboardStatus("Dashboard failed: " + (err.message || err), true);
  }
}

function rerenderDashboardFromCache() {
  const rows = window.__hohoDashboardRows || [];
  const filtered = filterDashboardRows(rows);
  renderDashboardTotals(filtered);
  renderDashboardTable(filtered);
}

function bindAppEventsOnce() {
  if (taskOwnerInput && !taskOwnerInput.dataset.bound) {
    taskOwnerInput.dataset.bound = "1";
    taskOwnerInput.addEventListener("change", syncTaskSourceOptions);
  }

  if (taskSourceInput && !taskSourceInput.dataset.bound) {
    taskSourceInput.dataset.bound = "1";
    taskSourceInput.addEventListener("change", syncTaskSourceOptions);
  }

  if (refreshDashboardBtn && !refreshDashboardBtn.dataset.bound) {
    refreshDashboardBtn.dataset.bound = "1";
    refreshDashboardBtn.addEventListener("click", renderDashboard);
  }

  [dashboardStartDate, dashboardEndDate].forEach((input) => {
    if (input && !input.dataset.bound) {
      input.dataset.bound = "1";
      input.addEventListener("change", renderDashboard);
    }
  });

  [dashboardUserFilter, dashboardRoleFilter].forEach((input) => {
    if (input && !input.dataset.bound) {
      input.dataset.bound = "1";
      input.addEventListener("change", rerenderDashboardFromCache);
    }
  });

  if (importTaskLearningCsvBtn && !importTaskLearningCsvBtn.dataset.bound) {
    importTaskLearningCsvBtn.dataset.bound = "1";
    importTaskLearningCsvBtn.addEventListener("click", async () => {
      if (!legacyTaskLearningCsv || !legacyTaskLearningCsv.value.trim()) {
        if (legacyImportStatusText) legacyImportStatusText.textContent = "Paste Task/Learning CSV first.";
        return;
      }
      importTaskLearningCsvBtn.disabled = true;
      try {
        const result = await window.HoHoDashboardService.importTaskLearningCsv(legacyTaskLearningCsv.value);
        if (legacyImportStatusText) legacyImportStatusText.textContent = `Imported ${result.count} Task/Learning legacy row(s).`;
        await renderDashboard();
      } catch (err) {
        console.error("Task/Learning CSV import failed", err);
        if (legacyImportStatusText) legacyImportStatusText.textContent = "Task/Learning import failed: " + (err.message || err);
      } finally {
        importTaskLearningCsvBtn.disabled = false;
      }
    });
  }

  if (importFourdxCsvBtn && !importFourdxCsvBtn.dataset.bound) {
    importFourdxCsvBtn.dataset.bound = "1";
    importFourdxCsvBtn.addEventListener("click", async () => {
      if (!legacyFourdxCsv || !legacyFourdxCsv.value.trim()) {
        if (legacyImportStatusText) legacyImportStatusText.textContent = "Paste 4DX CSV first.";
        return;
      }
      importFourdxCsvBtn.disabled = true;
      try {
        const result = await window.HoHoDashboardService.importFourdxCsv(legacyFourdxCsv.value);
        if (legacyImportStatusText) legacyImportStatusText.textContent = `Imported ${result.count} 4DX legacy row(s).`;
        await renderDashboard();
      } catch (err) {
        console.error("4DX CSV import failed", err);
        if (legacyImportStatusText) legacyImportStatusText.textContent = "4DX import failed: " + (err.message || err);
      } finally {
        importFourdxCsvBtn.disabled = false;
      }
    });
  }

  if (fourdxPeriodSelect && !fourdxPeriodSelect.dataset.bound) {
    fourdxPeriodSelect.dataset.bound = "1";
    fourdxPeriodSelect.addEventListener("change", render4DX);
  }

  if (leadCheckinToday && !leadCheckinToday.dataset.bound) {
    leadCheckinToday.dataset.bound = "1";
    leadCheckinToday.addEventListener("click", (e) => {
      const btn = e.target.closest(".fourdx-check-btn");
      if (!btn) return;

      const row = btn.closest("[data-lead]");
      if (!row) return;

      row.querySelectorAll(".fourdx-check-btn").forEach((b) => b.classList.remove("selected"));
      btn.classList.add("selected");

      ensure4DXState();
      const leadName = row.getAttribute("data-lead");
      const status = btn.getAttribute("data-status") || "RED";
      const todayKey = getTodayKey();

      if (!appState.fourdx.checkins[todayKey]) appState.fourdx.checkins[todayKey] = {};
      appState.fourdx.checkins[todayKey][leadName] = status;

      saveState();
      render4DX();
    });
  }

  const editBtn = document.getElementById("fourdxEditBtn");
  const closeBtn = document.getElementById("fourdxEditCloseBtn");
  const modal = document.getElementById("fourdxEditModal");

  if (editBtn && !editBtn.dataset.bound) {
    editBtn.dataset.bound = "1";
    editBtn.addEventListener("click", fourdxOpenEditModal);
  }
  if (closeBtn && !closeBtn.dataset.bound) {
    closeBtn.dataset.bound = "1";
    closeBtn.addEventListener("click", fourdxCloseEditModal);
  }
  if (modal && !modal.dataset.bound) {
    modal.dataset.bound = "1";
    modal.addEventListener("click", (e) => {
      if (e.target && e.target.getAttribute("data-close") === "1") {
        fourdxCloseEditModal();
      }
    });
  }

  const syncBtn = document.getElementById("syncWeeklyBtn");
  if (syncBtn && !syncBtn.dataset.bound) {
    syncBtn.dataset.bound = "1";
    syncBtn.addEventListener("click", () => {
      if (syncBtn.disabled) return;
      syncWeeklyToGoogleSheet();
    });
  }

  const sync4dxBtn = document.getElementById("sync4DXWeeklyBtn");
  if (sync4dxBtn && !sync4dxBtn.dataset.bound) {
    sync4dxBtn.dataset.bound = "1";
    sync4dxBtn.addEventListener("click", () => {
      if (sync4dxBtn.disabled) return;
      sync4DXWeeklyToGoogleSheet();
    });
  }

  if (importLegacyBtn && !importLegacyBtn.dataset.bound) {
    importLegacyBtn.dataset.bound = "1";
    importLegacyBtn.addEventListener("click", async () => {
      const currentUser = window.HoHoCloudService ? window.HoHoCloudService.getCurrentUser() : null;
      if (!currentUser) return;
      const ok = confirm("Import data HoHo v1 dari localStorage browser ini ke akun yang sedang login?");
      if (!ok) return;
      importLegacyBtn.disabled = true;
      try {
        const result = await window.HoHoMigrationService.importLegacyState(currentUser.id);
        if (migrationStatusText) migrationStatusText.textContent = result.message;
        renderAll();
      } catch (err) {
        console.error("Legacy import failed", err);
        if (migrationStatusText) migrationStatusText.textContent = "Import gagal: " + (err.message || err);
      } finally {
        importLegacyBtn.disabled = false;
      }
    });
  }

  if (settingsAssignableUsers && !settingsAssignableUsers.dataset.bound) {
    settingsAssignableUsers.dataset.bound = "1";
    settingsAssignableUsers.addEventListener("change", () => {
      if (settingsRoleInput && settingsAssignableUsers.selectedOptions[0]) {
        settingsRoleInput.value = settingsAssignableUsers.selectedOptions[0].dataset.role || "regular_user";
      }
      populateManagerOptions();
    });
  }

  if (saveUserRoleBtn && !saveUserRoleBtn.dataset.bound) {
    saveUserRoleBtn.dataset.bound = "1";
    saveUserRoleBtn.addEventListener("click", async () => {
      const userId = settingsAssignableUsers ? settingsAssignableUsers.value : "";
      const role = settingsRoleInput ? settingsRoleInput.value : "regular_user";
      const managerId = settingsManagerInput ? settingsManagerInput.value : "";
      if (!userId) return;
      saveUserRoleBtn.disabled = true;
      if (roleSaveStatusText) roleSaveStatusText.textContent = "Saving role...";
      try {
        const updated = await window.HoHoProfileService.updateManagedProfile(userId, {
          role,
          manager_id: managerId || null
        });
        if (roleSaveStatusText) {
          roleSaveStatusText.textContent = `User updated: ${updated.email} → ${updated.role}${updated.manager_id ? " with manager set" : ""}`;
        }
        await window.HoHoCloudService.hydrate({ user: window.HoHoCloudService.getCurrentUser() });
        populateAssignableUsers();
        await renderDashboard();
      } catch (err) {
        console.error("Role update failed", err);
        if (roleSaveStatusText) roleSaveStatusText.textContent = "User update failed: " + (err.message || err);
      } finally {
        saveUserRoleBtn.disabled = false;
      }
    });
  }

  if (!window.__hohoBounceStarted) {
    window.__hohoBounceStarted = true;
    scheduleRandomBounce();
  }
}

async function openAuthenticatedApp(session) {
  if (cloudStatusText) cloudStatusText.textContent = "Loading cloud data...";
  await window.HoHoCloudService.hydrate(session);
  populateAssignableUsers();
  showAppShell();
  renderAll();
  bindAppEventsOnce();
  if (cloudStatusText) cloudStatusText.textContent = "Cloud synced";
}

let authOpenInProgress = false;
let lastOpenedSessionUserId = null;

function queueAuthenticatedOpen(session) {
  if (!session || !session.user) return;
  const userId = session.user.id;
  if (authOpenInProgress || lastOpenedSessionUserId === userId) return;

  authOpenInProgress = true;
  window.setTimeout(async () => {
    try {
      await openAuthenticatedApp(session);
      lastOpenedSessionUserId = userId;
    } catch (err) {
      console.error("Failed to open authenticated app", err);
      setAuthStatus("Gagal load data Supabase: " + (err.message || err), true);
      showAuthScreen();
    } finally {
      authOpenInProgress = false;
    }
  }, 0);
}

function bindAuthEventsOnce() {
  if (loginForm && !loginForm.dataset.bound) {
    loginForm.dataset.bound = "1";
    loginForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      setAuthStatus("Logging in...");
      if (loginBtn) loginBtn.disabled = true;
      try {
        const { error } = await window.HoHoAuthService.signIn(
          loginEmailInput.value.trim(),
          loginPasswordInput.value
        );
        if (error) throw error;
        setAuthStatus("Login berhasil. Loading data...");
      } catch (err) {
        setAuthStatus(err.message || "Login gagal.", true);
      } finally {
        if (loginBtn) loginBtn.disabled = false;
      }
    });
  }

  if (googleLoginBtn && !googleLoginBtn.dataset.bound) {
    googleLoginBtn.dataset.bound = "1";
    googleLoginBtn.addEventListener("click", async () => {
      setAuthStatus("Opening Google login...");
      const { error } = await window.HoHoAuthService.signInWithGoogle();
      if (error) setAuthStatus(error.message, true);
    });
  }

  if (logoutBtn && !logoutBtn.dataset.bound) {
    logoutBtn.dataset.bound = "1";
    logoutBtn.addEventListener("click", async () => {
      await window.HoHoAuthService.signOut();
      window.HoHoCloudService.resetSession();
      showAuthScreen();
      setAuthStatus("Logged out.");
    });
  }
}

/* INIT */
document.addEventListener("DOMContentLoaded", async () => {
  loadState();
  applyTheme(appState.theme || "light");
  showAuthScreen();
  bindAuthEventsOnce();

  const configured = window.HoHoAuthService && window.HoHoAuthService.isConfigured();
  if (supabaseConfigWarning) supabaseConfigWarning.classList.toggle("hidden", configured);
  if (googleLoginBtn && window.HOHO_ENV && window.HOHO_ENV.ENABLE_GOOGLE_OAUTH) {
    googleLoginBtn.classList.remove("hidden");
  }

  if (!configured) {
    setAuthStatus("Isi Supabase URL dan publishable/anon key dulu untuk mengaktifkan login.", true);
    return;
  }

  window.HoHoAuthService.onAuthStateChange((event, session) => {
    if (event === "SIGNED_OUT") {
      lastOpenedSessionUserId = null;
      window.HoHoCloudService.resetSession();
      showAuthScreen();
      return;
    }
    if (session && (event === "INITIAL_SESSION" || event === "SIGNED_IN" || event === "TOKEN_REFRESHED")) {
      queueAuthenticatedOpen(session);
    }
  });

  const { session, error } = await window.HoHoAuthService.getSession();
  if (error) {
    setAuthStatus(error.message, true);
    return;
  }
  if (session) {
    queueAuthenticatedOpen(session);
  } else {
    setAuthStatus("Silakan login dengan akun yang sudah dibuat/diundang.");
  }
});
