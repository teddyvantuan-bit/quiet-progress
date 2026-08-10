/* ==========================================================
   Quiet Progress — app logic
   Single-user, static, offline-first. Data lives in localStorage
   on this device/browser only — use Settings > Xuất/Nhập to move
   data between your phone and laptop.
   ========================================================== */
(() => {
  "use strict";

  const STORAGE_KEY = "qp_state_v1";
  const THEME_KEY   = "qp_theme";

  /* ---------------- icons ---------------- */
  const ICON = {
    dashboard: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12 12 4l8 8"/><path d="M6 10.5V20h12v-9.5"/></svg>`,
    habits: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="3.5" width="7" height="7" rx="1.6"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.6"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.6"/><path d="m15.5 17 1.8 1.8L20.5 15"/></svg>`,
    tasks: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6h11M9 12h11M9 18h11"/><path d="m4 6 .8.8L6.5 5"/><path d="m4 12 .8.8L6.5 11"/><path d="m4 18 .8.8L6.5 17"/></svg>`,
    mood: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8.2"/><path d="M8.6 10.2h.01M15.4 10.2h.01"/><path d="M8.3 14.2c1 1.1 2.3 1.7 3.7 1.7s2.7-.6 3.7-1.7"/></svg>`,
    check: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 12.5 9 17l10.5-11"/></svg>`,
    plus: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>`,
    chevLeft: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 5 8 12l6.5 7"/></svg>`,
    chevRight: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9.5 5 16 12l-6.5 7"/></svg>`,
    dots: `<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.7"/><circle cx="12" cy="12" r="1.7"/><circle cx="19" cy="12" r="1.7"/></svg>`,
    close: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>`,
    leaf: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 19c9 0 14-5 14-14-9 0-14 5-14 14Z"/><path d="M5 19c3-4 6-7 9-10"/></svg>`,
  };

  const MOOD_EMOJI = ["😞", "🙁", "😐", "🙂", "😄"];
  const WEEKDAYS_SHORT = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
  const MONTH_NAMES = ["Tháng 1","Tháng 2","Tháng 3","Tháng 4","Tháng 5","Tháng 6","Tháng 7","Tháng 8","Tháng 9","Tháng 10","Tháng 11","Tháng 12"];
  const QUIET_LINES = [
    "Không cần hoàn hảo. Chỉ cần tiếp tục.",
    "Một bước nhỏ hôm nay cũng là tiến bộ.",
    "Bỏ lỡ một ngày không xoá đi những ngày đã cố gắng.",
    "Sự đều đặn quan trọng hơn cường độ.",
    "Hôm nay chỉ cần tốt hơn một chút so với hôm qua.",
    "Ghi lại là để hiểu mình, không phải để tự trách.",
  ];

  /* ---------------- storage ---------------- */
  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { habits: [], tasks: [], moods: {} };
      const parsed = JSON.parse(raw);
      return {
        habits: parsed.habits || [],
        tasks: parsed.tasks || [],
        moods: parsed.moods || {},
      };
    } catch (e) {
      console.error("Không đọc được dữ liệu đã lưu:", e);
      return { habits: [], tasks: [], moods: {} };
    }
  }
  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.error("Không lưu được dữ liệu:", e);
      toast("Không lưu được dữ liệu trên thiết bị này");
    }
  }

  let state = loadState();
  const ui = { tab: "dashboard", habitMonth: new Date(), moodMonth: new Date() };

  /* ---------------- helpers ---------------- */
  const pad = (n) => (n < 10 ? "0" + n : "" + n);
  const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const todayKey = () => ymd(new Date());
  const daysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();
  const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const escapeHtml = (s) => (s || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  function dateFromKey(key) {
    const [y, m, d] = key.split("-").map(Number);
    return new Date(y, m - 1, d);
  }
  function formatDayLabel(date) {
    return `${WEEKDAYS_SHORT[date.getDay()] === "CN" ? "Chủ Nhật" : "Thứ " + (date.getDay() + 1)}, ${date.getDate()} ${MONTH_NAMES[date.getMonth()]}`;
  }
  function formatShort(key) {
    const d = dateFromKey(key);
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
  }
  function dayOfYear(d) {
    const start = new Date(d.getFullYear(), 0, 0);
    return Math.floor((d - start) / 86400000);
  }
  function greeting() {
    const h = new Date().getHours();
    if (h < 11) return "Chào buổi sáng";
    if (h < 14) return "Chào buổi trưa";
    if (h < 18) return "Chào buổi chiều";
    return "Chào buổi tối";
  }

  /* ---------------- render engine ---------------- */
  const view = document.getElementById("view");
  const tabbar = document.getElementById("tabbar");
  const desktopNav = document.getElementById("desktopNav");
  const fabHolder = { el: null };

  const TABS = [
    { id: "dashboard", label: "Tổng quan", icon: ICON.dashboard },
    { id: "habits", label: "Thói quen", icon: ICON.habits },
    { id: "tasks", label: "Công việc", icon: ICON.tasks },
    { id: "mood", label: "Tâm trạng", icon: ICON.mood },
  ];

  function buildNav() {
    const html = TABS.map(
      (t) => `<button class="tab-btn${t.id === ui.tab ? " active" : ""}" data-tab="${t.id}">${t.icon}<span>${t.label}</span></button>`
    ).join("");
    tabbar.innerHTML = html;
    desktopNav.innerHTML = html;
    [tabbar, desktopNav].forEach((nav) =>
      nav.querySelectorAll(".tab-btn").forEach((btn) =>
        btn.addEventListener("click", () => setTab(btn.dataset.tab))
      )
    );
  }

  function setTab(id) {
    ui.tab = id;
    buildNav();
    removeFab();
    render();
    if (typeof view.scrollTo === "function") view.scrollTo({ top: 0 });
    else view.scrollTop = 0;
  }

  function removeFab() {
    if (fabHolder.el) { fabHolder.el.remove(); fabHolder.el = null; }
  }
  function addFab(onClick, label) {
    removeFab();
    const btn = document.createElement("button");
    btn.className = "fab";
    btn.setAttribute("aria-label", label || "Thêm");
    btn.innerHTML = ICON.plus;
    btn.addEventListener("click", onClick);
    document.body.appendChild(btn);
    fabHolder.el = btn;
  }

  function render() {
    if (ui.tab === "dashboard") return renderDashboard();
    if (ui.tab === "habits") return renderHabits();
    if (ui.tab === "tasks") return renderTasks();
    if (ui.tab === "mood") return renderMood();
  }

  /* ================= DASHBOARD ================= */
  function renderDashboard() {
    removeFab();
    const today = new Date();
    const tKey = todayKey();
    const habits = state.habits;
    const doneToday = habits.filter((h) => h.marks[tKey]).length;
    const allDone = habits.length > 0 && doneToday === habits.length;
    const line = QUIET_LINES[dayOfYear(today) % QUIET_LINES.length];

    // week stat: avg completion ratio over last 7 days
    let weekSum = 0, weekDays = 0;
    const strip = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today); d.setDate(d.getDate() - i);
      const key = ymd(d);
      const done = habits.filter((h) => h.marks[key]).length;
      const ratio = habits.length ? done / habits.length : 0;
      strip.push({ d, ratio, key });
      weekSum += ratio; weekDays++;
    }
    const weekPct = weekDays ? Math.round((weekSum / weekDays) * 100) : 0;

    const tasksToday = state.tasks.filter((t) => t.status !== "Hoàn thành" && t.due && (t.due <= tKey));
    const moodToday = state.moods[tKey];
    const moodDisplay = moodToday ? MOOD_EMOJI[moodToday.mood - 1] : "–";

    view.innerHTML = `
      <div class="hero">
        <div class="hero-eyebrow">${formatDayLabel(today)}</div>
        <h1 class="hero-title">${greeting()}.</h1>
        <p class="hero-sub">${line}</p>
        ${
          habits.length
            ? `<div class="stamp">${allDone ? ICON.leaf : ""}<span>${allDone ? "Hôm nay bạn đã hoàn thành." : `${doneToday}/${habits.length} thói quen hôm nay`}</span></div>`
            : `<div class="stamp"><span>Thêm thói quen đầu tiên ở tab Thói quen.</span></div>`
        }
      </div>

      <div class="stat-row">
        <div class="stat"><div class="stat-num">${weekPct}%</div><div class="stat-label">Hoàn thành<br>7 ngày qua</div></div>
        <div class="stat"><div class="stat-num">${tasksToday.length}</div><div class="stat-label">Việc cần làm<br>hôm nay</div></div>
        <div class="stat"><div class="stat-num">${moodDisplay}</div><div class="stat-label">Tâm trạng<br>hôm nay</div></div>
      </div>

      <div class="section-title">Hôm nay</div>
      <div class="card">
        ${
          habits.length === 0
            ? `<div class="empty">Chưa có thói quen nào để theo dõi.</div>`
            : habits.map((h) => {
                const done = !!h.marks[tKey];
                return `<div class="check-row">
                  <button class="check-box${done ? " done" : ""}" data-habit-toggle-today="${h.id}">${ICON.check}</button>
                  <div class="check-label">${escapeHtml(h.name)}</div>
                </div>`;
              }).join("")
        }
      </div>

      <div class="section-title">7 ngày qua</div>
      <div class="card">
        <div class="week-strip">
          ${strip.map(({ d, ratio, key }) => {
            const lvl = ratio === 0 ? 0 : ratio < 0.4 ? 1 : ratio < 0.9 ? 2 : 3;
            return `<div class="week-day">
              <div class="week-dot lvl-${lvl}${key === tKey ? " today" : ""}"></div>
              <div class="week-day-label">${WEEKDAYS_SHORT[d.getDay()]}</div>
            </div>`;
          }).join("")}
        </div>
      </div>

      ${tasksToday.length ? `
      <div class="section-title">Cần làm hôm nay</div>
      <div class="card">
        ${tasksToday.slice(0, 5).map((t) => `
          <div class="check-row">
            <button class="check-box" data-quick-done-task="${t.id}">${ICON.check}</button>
            <div class="check-label">${escapeHtml(t.text)}</div>
            ${t.due && t.due < tKey ? `<div class="check-meta" style="color:var(--danger)">Trễ hạn</div>` : ""}
          </div>`).join("")}
      </div>` : ""}
    `;

    view.querySelectorAll("[data-habit-toggle-today]").forEach((btn) =>
      btn.addEventListener("click", () => {
        const h = state.habits.find((x) => x.id === btn.dataset.habitToggleToday);
        if (!h) return;
        h.marks[tKey] = !h.marks[tKey];
        if (!h.marks[tKey]) delete h.marks[tKey];
        saveState();
        renderDashboard();
      })
    );
    view.querySelectorAll("[data-quick-done-task]").forEach((btn) =>
      btn.addEventListener("click", () => {
        const t = state.tasks.find((x) => x.id === btn.dataset.quickDoneTask);
        if (!t) return;
        t.status = "Hoàn thành";
        saveState();
        renderDashboard();
      })
    );
  }

  /* ================= HABITS ================= */
  function renderHabits() {
    const y = ui.habitMonth.getFullYear(), m = ui.habitMonth.getMonth();
    const nDays = daysInMonth(y, m);
    const tKey = todayKey();
    const isCurrentMonth = new Date().getFullYear() === y && new Date().getMonth() === m;

    view.innerHTML = `
      <div class="month-switch">
        <button class="icon-btn" id="prevMonth">${ICON.chevLeft}</button>
        <div class="month-switch-label">${MONTH_NAMES[m]} ${y}</div>
        <button class="icon-btn" id="nextMonth">${ICON.chevRight}</button>
      </div>
      ${
        state.habits.length === 0
          ? `<div class="card"><div class="empty">Chưa có thói quen nào.<br>Bấm nút + để thêm thói quen đầu tiên.</div></div>`
          : state.habits.map((h) => habitCardHtml(h, y, m, nDays, tKey, isCurrentMonth)).join("")
      }
    `;

    document.getElementById("prevMonth").addEventListener("click", () => {
      ui.habitMonth = new Date(y, m - 1, 1);
      renderHabits();
    });
    document.getElementById("nextMonth").addEventListener("click", () => {
      ui.habitMonth = new Date(y, m + 1, 1);
      renderHabits();
    });

    view.querySelectorAll("[data-day-toggle]").forEach((cell) =>
      cell.addEventListener("click", () => {
        const [habitId, key] = cell.dataset.dayToggle.split("|");
        const h = state.habits.find((x) => x.id === habitId);
        if (!h) return;
        if (h.marks[key]) delete h.marks[key]; else h.marks[key] = true;
        saveState();
        renderHabits();
      })
    );
    view.querySelectorAll("[data-habit-menu]").forEach((btn) =>
      btn.addEventListener("click", () => openHabitMenu(btn.dataset.habitMenu))
    );

    addFab(() => openHabitForm(null), "Thêm thói quen");
  }

  function habitCardHtml(h, y, m, nDays, tKey, isCurrentMonth) {
    let done = 0;
    for (let d = 1; d <= nDays; d++) {
      const key = `${y}-${pad(m + 1)}-${pad(d)}`;
      if (h.marks[key]) done++;
    }
    const target = h.target || nDays;
    const pct = Math.round((done / target) * 100);
    const cells = [];
    for (let d = 1; d <= nDays; d++) {
      const key = `${y}-${pad(m + 1)}-${pad(d)}`;
      const isFuture = key > tKey;
      const cls = ["day-cell"];
      if (h.marks[key]) cls.push("done");
      if (isFuture) cls.push("future");
      if (key === tKey) cls.push("today");
      cells.push(`<div class="${cls.join(" ")}" ${isFuture ? "" : `data-day-toggle="${h.id}|${key}"`}>${d}</div>`);
    }
    return `<div class="card habit-card">
      <div class="habit-head">
        <div>
          <div class="habit-name">${escapeHtml(h.name)}</div>
          <div class="habit-target">Mục tiêu ${target} ngày/tháng · ${done} đã làm</div>
        </div>
        <div class="row-between" style="gap:8px;">
          <div class="habit-pct">${isNaN(pct) ? 0 : pct}%</div>
          <button class="habit-menu-btn" data-habit-menu="${h.id}">${ICON.dots}</button>
        </div>
      </div>
      <div class="day-grid">${cells.join("")}</div>
    </div>`;
  }

  function openHabitMenu(id) {
    const h = state.habits.find((x) => x.id === id);
    if (!h) return;
    openModal(`
      <div class="modal-head"><h2 class="modal-title">${escapeHtml(h.name)}</h2><button class="icon-btn" data-close>${ICON.close}</button></div>
      <button class="btn btn-ghost btn-block" data-edit-habit="${id}">Sửa thói quen</button>
      <div style="height:8px"></div>
      <button class="btn btn-danger btn-block" data-delete-habit="${id}">Xoá thói quen</button>
    `);
    document.querySelector("[data-edit-habit]").addEventListener("click", () => openHabitForm(id));
    document.querySelector("[data-delete-habit]").addEventListener("click", () => {
      if (confirm(`Xoá "${h.name}"? Toàn bộ lịch sử theo dõi của thói quen này sẽ mất.`)) {
        state.habits = state.habits.filter((x) => x.id !== id);
        saveState();
        closeModal();
        renderHabits();
      }
    });
  }

  function openHabitForm(id) {
    const h = id ? state.habits.find((x) => x.id === id) : null;
    const y = ui.habitMonth.getFullYear(), m = ui.habitMonth.getMonth();
    const defaultTarget = daysInMonth(y, m);
    openModal(`
      <div class="modal-head"><h2 class="modal-title">${h ? "Sửa thói quen" : "Thói quen mới"}</h2><button class="icon-btn" data-close>${ICON.close}</button></div>
      <div class="field">
        <label>Tên thói quen</label>
        <input class="qp-input" id="hName" placeholder="VD: Uống đủ 2 lít nước" value="${h ? escapeHtml(h.name) : ""}">
      </div>
      <div class="field">
        <label>Mục tiêu (số ngày mỗi tháng)</label>
        <input class="qp-input" id="hTarget" type="number" min="1" max="31" value="${h ? h.target : defaultTarget}">
      </div>
      <button class="btn btn-primary btn-block" id="hSave">Lưu</button>
    `);
    document.getElementById("hSave").addEventListener("click", () => {
      const name = document.getElementById("hName").value.trim();
      const target = clamp(parseInt(document.getElementById("hTarget").value, 10) || defaultTarget, 1, 31);
      if (!name) { toast("Vui lòng nhập tên thói quen"); return; }
      if (h) {
        h.name = name; h.target = target;
      } else {
        state.habits.push({ id: uid(), name, target, marks: {}, createdAt: todayKey() });
      }
      saveState();
      closeModal();
      renderHabits();
      toast("Đã lưu");
    });
  }

  /* ================= TASKS ================= */
  const TASK_FILTERS = ["Tất cả", "Hôm nay", "Quá hạn", "Hoàn thành"];
  let taskFilter = "Tất cả";

  function renderTasks() {
    const tKey = todayKey();
    let list = state.tasks.slice();
    if (taskFilter === "Hôm nay") list = list.filter((t) => t.due === tKey && t.status !== "Hoàn thành");
    if (taskFilter === "Quá hạn") list = list.filter((t) => t.due && t.due < tKey && t.status !== "Hoàn thành");
    if (taskFilter === "Hoàn thành") list = list.filter((t) => t.status === "Hoàn thành");

    list.sort((a, b) => {
      if (a.status === "Hoàn thành" && b.status !== "Hoàn thành") return 1;
      if (b.status === "Hoàn thành" && a.status !== "Hoàn thành") return -1;
      const ad = a.due || "9999", bd = b.due || "9999";
      return ad < bd ? -1 : ad > bd ? 1 : 0;
    });

    view.innerHTML = `
      <div class="chip-row">
        ${TASK_FILTERS.map((f) => `<button class="chip${f === taskFilter ? " active" : ""}" data-filter="${f}">${f}</button>`).join("")}
      </div>
      <div class="card">
        ${
          list.length === 0
            ? `<div class="empty">Không có công việc nào ở đây.</div>`
            : list.map((t) => taskRowHtml(t, tKey)).join("")
        }
      </div>
    `;

    view.querySelectorAll("[data-filter]").forEach((chip) =>
      chip.addEventListener("click", () => { taskFilter = chip.dataset.filter; renderTasks(); })
    );
    view.querySelectorAll("[data-task-cycle]").forEach((dot) =>
      dot.addEventListener("click", (e) => {
        e.stopPropagation();
        const t = state.tasks.find((x) => x.id === dot.dataset.taskCycle);
        const order = ["Chưa làm", "Đang làm", "Hoàn thành"];
        t.status = order[(order.indexOf(t.status) + 1) % order.length];
        saveState();
        renderTasks();
      })
    );
    view.querySelectorAll("[data-task-open]").forEach((row) =>
      row.addEventListener("click", () => openTaskForm(row.dataset.taskOpen))
    );

    addFab(() => openTaskForm(null), "Thêm công việc");
  }

  function taskRowHtml(t, tKey) {
    const done = t.status === "Hoàn thành";
    const doing = t.status === "Đang làm";
    const overdue = t.due && t.due < tKey && !done;
    const prioClass = t.priority === "Cao" ? "prio-Cao" : t.priority === "Trung bình" ? "prio-TrungBinh" : "";
    return `<div class="task-row" data-task-open="${t.id}">
      <button class="task-status-dot${done ? " done" : doing ? " doing" : ""}" data-task-cycle="${t.id}">${ICON.check}</button>
      <div class="task-body">
        <div class="task-title${done ? " done" : ""}">${escapeHtml(t.text)}</div>
        <div class="task-tags">
          ${t.priority ? `<span class="tag ${prioClass}">${t.priority}</span>` : ""}
          ${t.category ? `<span class="tag">${escapeHtml(t.category)}</span>` : ""}
          ${t.due ? `<span class="tag${overdue ? " due-overdue" : ""}">${overdue ? "Trễ · " : ""}${formatShort(t.due)}</span>` : ""}
        </div>
      </div>
    </div>`;
  }

  function openTaskForm(id) {
    const t = id ? state.tasks.find((x) => x.id === id) : null;
    openModal(`
      <div class="modal-head"><h2 class="modal-title">${t ? "Sửa công việc" : "Công việc mới"}</h2><button class="icon-btn" data-close>${ICON.close}</button></div>
      <div class="field">
        <label>Công việc</label>
        <input class="qp-input" id="tText" placeholder="VD: Gửi báo cáo tuần" value="${t ? escapeHtml(t.text) : ""}">
      </div>
      <div class="field-row">
        <div class="field">
          <label>Danh mục</label>
          <input class="qp-input" id="tCategory" placeholder="Công việc, cá nhân..." value="${t ? escapeHtml(t.category || "") : ""}">
        </div>
        <div class="field">
          <label>Hạn chót</label>
          <input class="qp-input" id="tDue" type="date" value="${t ? t.due || "" : ""}">
        </div>
      </div>
      <div class="field">
        <label>Ưu tiên</label>
        <div class="seg" id="tPriority">
          ${["Thấp", "Trung bình", "Cao"].map((p) => `<button type="button" class="seg-btn${(t ? t.priority : "Trung bình") === p ? " active" : ""}" data-val="${p}">${p}</button>`).join("")}
        </div>
      </div>
      ${t ? `
      <div class="field">
        <label>Trạng thái</label>
        <div class="seg" id="tStatus">
          ${["Chưa làm", "Đang làm", "Hoàn thành"].map((s) => `<button type="button" class="seg-btn${t.status === s ? " active" : ""}" data-val="${s}">${s}</button>`).join("")}
        </div>
      </div>` : ""}
      <div class="field">
        <label>Ghi chú</label>
        <textarea class="qp-input" id="tNote">${t ? escapeHtml(t.note || "") : ""}</textarea>
      </div>
      <button class="btn btn-primary btn-block" id="tSave">Lưu</button>
      ${t ? `<div style="height:8px"></div><button class="btn btn-danger btn-block" id="tDelete">Xoá công việc</button>` : ""}
    `);

    let priorityVal = t ? t.priority : "Trung bình";
    document.getElementById("tPriority").querySelectorAll(".seg-btn").forEach((b) =>
      b.addEventListener("click", () => {
        priorityVal = b.dataset.val;
        b.parentElement.querySelectorAll(".seg-btn").forEach((x) => x.classList.remove("active"));
        b.classList.add("active");
      })
    );
    let statusVal = t ? t.status : "Chưa làm";
    const statusSeg = document.getElementById("tStatus");
    if (statusSeg) {
      statusSeg.querySelectorAll(".seg-btn").forEach((b) =>
        b.addEventListener("click", () => {
          statusVal = b.dataset.val;
          b.parentElement.querySelectorAll(".seg-btn").forEach((x) => x.classList.remove("active"));
          b.classList.add("active");
        })
      );
    }

    document.getElementById("tSave").addEventListener("click", () => {
      const text = document.getElementById("tText").value.trim();
      if (!text) { toast("Vui lòng nhập nội dung công việc"); return; }
      const category = document.getElementById("tCategory").value.trim();
      const due = document.getElementById("tDue").value || null;
      const note = document.getElementById("tNote").value.trim();
      if (t) {
        Object.assign(t, { text, category, due, note, priority: priorityVal, status: statusVal });
      } else {
        state.tasks.push({ id: uid(), text, category, due, note, priority: priorityVal, status: "Chưa làm", createdAt: todayKey() });
      }
      saveState();
      closeModal();
      renderTasks();
      toast("Đã lưu");
    });
    const del = document.getElementById("tDelete");
    if (del) del.addEventListener("click", () => {
      if (confirm("Xoá công việc này?")) {
        state.tasks = state.tasks.filter((x) => x.id !== id);
        saveState();
        closeModal();
        renderTasks();
      }
    });
  }

  /* ================= MOOD ================= */
  function renderMood() {
    removeFab();
    const tKey = todayKey();
    const today = state.moods[tKey];
    const y = ui.moodMonth.getFullYear(), m = ui.moodMonth.getMonth();

    const entries = Object.keys(state.moods)
      .filter((k) => k.startsWith(`${y}-${pad(m + 1)}`))
      .sort((a, b) => (a < b ? 1 : -1));

    view.innerHTML = `
      <div class="section-title">Hôm nay</div>
      <div class="card">
        <div style="font-size:13px;color:var(--muted);margin-bottom:4px;">Tâm trạng</div>
        <div class="scale-row" id="moodScale">
          ${MOOD_EMOJI.map((e, i) => `<button type="button" class="scale-btn${today && today.mood === i + 1 ? " active" : ""}" data-val="${i + 1}">${e}</button>`).join("")}
        </div>
        <div style="font-size:13px;color:var(--muted);margin:14px 0 4px;">Năng lượng</div>
        <div class="scale-row" id="energyScale">
          ${[1,2,3,4,5].map((n) => `<button type="button" class="scale-btn${today && today.energy === n ? " active" : ""}" data-val="${n}">${n}</button>`).join("")}
        </div>
        <div class="field" style="margin-top:14px;">
          <label>Ghi chú nhanh</label>
          <textarea class="qp-input" id="moodNote" placeholder="Điều gì ảnh hưởng đến hôm nay?">${today ? escapeHtml(today.note || "") : ""}</textarea>
        </div>
        <button class="btn btn-primary btn-block" id="moodSave">${today ? "Cập nhật" : "Lưu"}</button>
      </div>

      <div class="month-switch" style="margin-top:22px;">
        <button class="icon-btn" id="prevMonthMood">${ICON.chevLeft}</button>
        <div class="month-switch-label">${MONTH_NAMES[m]} ${y}</div>
        <button class="icon-btn" id="nextMonthMood">${ICON.chevRight}</button>
      </div>
      <div class="card">
        ${
          entries.length === 0
            ? `<div class="empty">Chưa có nhật ký nào trong tháng này.</div>`
            : entries.map((k) => {
                const e = state.moods[k];
                return `<div class="mood-history-row">
                  <div class="mood-date">${formatShort(k)}</div>
                  <div class="mood-emo">${MOOD_EMOJI[e.mood - 1]}</div>
                  <div class="mood-note">${escapeHtml(e.note || "")}</div>
                </div>`;
              }).join("")
        }
      </div>
    `;

    let moodVal = today ? today.mood : null;
    let energyVal = today ? today.energy : null;
    document.querySelectorAll("#moodScale .scale-btn").forEach((b) =>
      b.addEventListener("click", () => {
        moodVal = parseInt(b.dataset.val, 10);
        b.parentElement.querySelectorAll(".scale-btn").forEach((x) => x.classList.remove("active"));
        b.classList.add("active");
      })
    );
    document.querySelectorAll("#energyScale .scale-btn").forEach((b) =>
      b.addEventListener("click", () => {
        energyVal = parseInt(b.dataset.val, 10);
        b.parentElement.querySelectorAll(".scale-btn").forEach((x) => x.classList.remove("active"));
        b.classList.add("active");
      })
    );
    document.getElementById("moodSave").addEventListener("click", () => {
      if (!moodVal || !energyVal) { toast("Chọn tâm trạng và năng lượng trước nhé"); return; }
      state.moods[tKey] = { mood: moodVal, energy: energyVal, note: document.getElementById("moodNote").value.trim() };
      saveState();
      renderMood();
      toast("Đã lưu");
    });
    document.getElementById("prevMonthMood").addEventListener("click", () => { ui.moodMonth = new Date(y, m - 1, 1); renderMood(); });
    document.getElementById("nextMonthMood").addEventListener("click", () => { ui.moodMonth = new Date(y, m + 1, 1); renderMood(); });
  }

  /* ================= SETTINGS ================= */
  function openSettings() {
    const theme = document.documentElement.dataset.theme === "dark";
    openModal(`
      <div class="modal-head"><h2 class="modal-title">Cài đặt</h2><button class="icon-btn" data-close>${ICON.close}</button></div>

      <div class="settings-row">
        <div>
          <div class="settings-row-text">Giao diện tối</div>
          <div class="settings-row-sub">Dịu mắt hơn khi dùng buổi tối</div>
        </div>
        <div class="switch${theme ? " on" : ""}" id="themeSwitch"></div>
      </div>

      <div class="divider"></div>

      <div class="settings-row">
        <div>
          <div class="settings-row-text">Xuất dữ liệu</div>
          <div class="settings-row-sub">Tải file sao lưu .json</div>
        </div>
        <button class="btn btn-ghost" id="exportBtn">Xuất</button>
      </div>
      <div class="settings-row">
        <div>
          <div class="settings-row-text">Nhập dữ liệu</div>
          <div class="settings-row-sub">Khôi phục từ file .json</div>
        </div>
        <button class="btn btn-ghost" id="importBtn">Nhập</button>
        <input type="file" id="importFile" accept="application/json" hidden>
      </div>

      <div class="divider"></div>
      <div class="settings-row">
        <div>
          <div class="settings-row-text" style="color:var(--danger)">Xoá toàn bộ dữ liệu</div>
          <div class="settings-row-sub">Không thể hoàn tác</div>
        </div>
        <button class="btn btn-danger" id="resetBtn">Xoá</button>
      </div>

      <p class="muted" style="font-size:11.5px;line-height:1.6;margin-top:16px;">
        Dữ liệu chỉ lưu trên trình duyệt của thiết bị này. Dùng "Xuất" trên điện thoại rồi "Nhập" trên laptop (hoặc ngược lại) để đồng bộ thủ công.
      </p>
    `);
    document.getElementById("themeSwitch").addEventListener("click", toggleTheme);
    document.getElementById("exportBtn").addEventListener("click", exportData);
    document.getElementById("importBtn").addEventListener("click", () => document.getElementById("importFile").click());
    document.getElementById("importFile").addEventListener("change", importData);
    document.getElementById("resetBtn").addEventListener("click", () => {
      if (confirm("Xoá toàn bộ dữ liệu? Hành động này không thể hoàn tác.")) {
        state = { habits: [], tasks: [], moods: {} };
        saveState();
        closeModal();
        render();
        toast("Đã xoá dữ liệu");
      }
    });
  }

  function exportData() {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `quiet-progress-${todayKey()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
  function importData(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        if (!confirm("Nhập dữ liệu sẽ THAY THẾ toàn bộ dữ liệu hiện tại trên thiết bị này. Tiếp tục?")) return;
        state = {
          habits: parsed.habits || [],
          tasks: parsed.tasks || [],
          moods: parsed.moods || {},
        };
        saveState();
        closeModal();
        render();
        toast("Đã nhập dữ liệu");
      } catch (err) {
        toast("File không hợp lệ");
      }
    };
    reader.readAsText(file);
  }

  /* ---------------- theme ---------------- */
  function toggleTheme() {
    const isDark = document.documentElement.dataset.theme === "dark";
    document.documentElement.dataset.theme = isDark ? "light" : "dark";
    localStorage.setItem(THEME_KEY, isDark ? "light" : "dark");
    const sw = document.getElementById("themeSwitch");
    if (sw) sw.classList.toggle("on", !isDark);
  }
  function initTheme() {
    const saved = localStorage.getItem(THEME_KEY);
    const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    document.documentElement.dataset.theme = saved || (prefersDark ? "dark" : "light");
  }

  /* ---------------- modal / toast ---------------- */
  const modalRoot = document.getElementById("modalRoot");
  const modalContent = document.getElementById("modalContent");
  function openModal(html) {
    modalContent.innerHTML = html;
    modalRoot.hidden = false;
    modalContent.querySelectorAll("[data-close]").forEach((b) => b.addEventListener("click", closeModal));
  }
  function closeModal() { modalRoot.hidden = true; modalContent.innerHTML = ""; }
  modalRoot.addEventListener("click", (e) => { if (e.target === modalRoot) closeModal(); });

  let toastTimer = null;
  function toast(msg) {
    const el = document.getElementById("toast");
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("show"), 2200);
  }

  /* ---------------- init ---------------- */
  document.getElementById("themeToggle").addEventListener("click", toggleTheme);
  document.getElementById("settingsBtn").addEventListener("click", openSettings);

  initTheme();
  buildNav();
  render();

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("sw.js").catch(() => {});
    });
  }
})();
