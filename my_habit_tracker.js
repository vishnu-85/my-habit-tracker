const STORAGE_KEY = "my_habit_tracker_v2";
    const THEME_KEY = "my_habit_tracker_theme";
    const SOUND_KEY = "my_habit_tracker_sound";
    const REFLECTION_KEY = "my_habit_tracker_reflection";
    const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const CATEGORIES = ["All", "Health", "Learning", "Personal", "Focus"];
    const TODAY_INDEX = (new Date().getDay() + 6) % 7;

    const DEFAULT_HABITS = [
      { id: 1, name: "Drink a glass of water", category: "Health", goal: 7, note: "", days: [false, false, false, false, false, false, false] },
      { id: 2, name: "Read for 10 minutes", category: "Learning", goal: 5, note: "", days: [false, false, false, false, false, false, false] },
      { id: 3, name: "Go for a short walk", category: "Health", goal: 4, note: "", days: [false, false, false, false, false, false, false] }
    ];

    function normalizeHabit(habit, index) {
      let days = Array.isArray(habit.days) && habit.days.length === 7
        ? habit.days.map(Boolean)
        : [Boolean(habit.done), false, false, false, false, false, false];
      const category = CATEGORIES.slice(1).includes(habit.category) ? habit.category : "Personal";
      const parsedGoal = Number(habit.goal);
      const goal = parsedGoal >= 1 && parsedGoal <= 7 ? parsedGoal : 7;
      return {
        id: habit.id || index + 1,
        name: String(habit.name || "Untitled habit"),
        category,
        goal,
        note: typeof habit.note === "string" ? habit.note : "",
        days
      };
    }

    function loadHabits() {
      try {
        const saved = localStorage.getItem(STORAGE_KEY) || localStorage.getItem("my_habit_tracker_v1");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            return parsed.map(normalizeHabit);
          }
        }
      } catch (e) {
        // Fallback to default habits if storage is unavailable
      }
      return DEFAULT_HABITS.map((h) => ({ ...h, days: [...h.days] }));
    }

    function saveHabits() {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(habits));
      } catch (e) {
        // Ignore storage errors in restricted environments
      }
    }

    function loadTheme() {
      try {
        return localStorage.getItem(THEME_KEY) === "dark";
      } catch (e) {
        return false;
      }
    }

    function saveTheme(isDark) {
      try {
        localStorage.setItem(THEME_KEY, isDark ? "dark" : "light");
      } catch (e) {
        // Ignore storage errors
      }
    }

    function loadSoundPref() {
      try {
        return localStorage.getItem(SOUND_KEY) !== "off";
      } catch (e) {
        return true;
      }
    }

    function saveSoundPref(enabled) {
      try {
        localStorage.setItem(SOUND_KEY, enabled ? "on" : "off");
      } catch (e) {
        // Ignore storage errors
      }
    }

    function loadReflection() {
      try {
        return localStorage.getItem(REFLECTION_KEY) || "";
      } catch (e) {
        return "";
      }
    }

    function saveReflection(text) {
      try {
        localStorage.setItem(REFLECTION_KEY, text);
      } catch (e) {
        // Ignore storage errors
      }
    }

    function getStreak(days) {
      let best = 0;
      let current = 0;
      for (let i = 0; i < days.length; i++) {
        if (days[i]) {
          current++;
          if (current > best) best = current;
        } else {
          current = 0;
        }
      }
      return best;
    }

    let habits = loadHabits();
    let nextId = habits.reduce((max, h) => Math.max(max, h.id || 0), 0) + 1;
    let activeFilter = "All";
    let searchQuery = "";
    let editingId = null;
    let editingNoteId = null;
    let isDark = loadTheme();
    let soundEnabled = loadSoundPref();
    let toastTimer = null;
    let audioCtx = null;
    let weeklyChart = null;

    const form = document.getElementById("habit-form");
    const input = document.getElementById("habit-input");
    const categorySelect = document.getElementById("habit-category");
    const goalSelect = document.getElementById("habit-goal");
    const searchInput = document.getElementById("search-input");
    const checkAllTodayBtn = document.getElementById("check-all-today-btn");
    const filterRow = document.getElementById("filter-row");
    const list = document.getElementById("habit-list");
    const progress = document.getElementById("progress");
    const progressBarFill = document.getElementById("progress-bar-fill");
    const summaryGoals = document.getElementById("summary-goals");
    const summaryStreak = document.getElementById("summary-streak");
    const summaryCheckins = document.getElementById("summary-checkins");
    const resetWeekBtn = document.getElementById("reset-week-btn");
    const themeToggleBtn = document.getElementById("theme-toggle-btn");
    const soundToggleBtn = document.getElementById("sound-toggle-btn");
    const themeToggleIcon = themeToggleBtn.querySelector(".button-icon");
    const themeToggleLabel = themeToggleBtn.querySelector(".button-label");
    const soundToggleLabel = soundToggleBtn.querySelector(".button-label");
    const exportBtn = document.getElementById("export-btn");
    const importBtn = document.getElementById("import-btn");
    const importFileInput = document.getElementById("import-file-input");
    const reflectionInput = document.getElementById("reflection-input");
    const reflectionStatus = document.getElementById("reflection-status");
    const toast = document.getElementById("toast");
    const chartCanvas = document.getElementById("weekly-chart");
    const chartTitle = document.getElementById("chart-title");

    chartTitle.textContent = `Check-ins by Day (Today: ${DAY_LABELS[TODAY_INDEX]})`;
    reflectionInput.value = loadReflection();

    reflectionInput.addEventListener("input", () => {
      saveReflection(reflectionInput.value);
      reflectionStatus.textContent = "Saved";
    });

    document.addEventListener("keydown", (event) => {
      const tag = document.activeElement && document.activeElement.tagName;
      const isTyping = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
      if (isTyping) return;

      if (event.key === "/") {
        event.preventDefault();
        searchInput.focus();
      } else if (event.key === "n" || event.key === "N") {
        event.preventDefault();
        input.focus();
      } else if (event.key === "d" || event.key === "D") {
        event.preventDefault();
        isDark = !isDark;
        saveTheme(isDark);
        applyTheme();
      }
    });

    function getVisibleHabits() {
      const q = searchQuery.trim().toLowerCase();
      return habits.filter((h) => {
        const matchesCat = activeFilter === "All" || h.category === activeFilter;
        const matchesQuery = !q ||
          h.name.toLowerCase().includes(q) ||
          (h.note && h.note.toLowerCase().includes(q));
        return matchesCat && matchesQuery;
      });
    }

    function updateChart() {
      if (typeof Chart !== "function" || !chartCanvas) return;

      const dailyCounts = DAY_LABELS.map((_, dayIndex) =>
        habits.reduce((sum, h) => sum + (h.days[dayIndex] ? 1 : 0), 0)
      );
      const barColors = DAY_LABELS.map((_, dayIndex) =>
        dayIndex === TODAY_INDEX ? "#16a34a" : "#2563eb"
      );
      const tickColor = isDark ? "#94a3b8" : "#64748b";
      const gridColor = isDark ? "#334155" : "#e2e8f0";
      const maxSuggested = Math.max(3, habits.length);

      if (!weeklyChart) {
        weeklyChart = new Chart(chartCanvas.getContext("2d"), {
          type: "bar",
          data: {
            labels: DAY_LABELS,
            datasets: [{
              label: "Habits completed",
              data: dailyCounts,
              backgroundColor: barColors,
              borderRadius: 6,
              maxBarThickness: 28
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false }
            },
            scales: {
              x: {
                grid: { display: false },
                ticks: { color: tickColor, font: { size: 11 } }
              },
              y: {
                beginAtZero: true,
                suggestedMax: maxSuggested,
                ticks: { stepSize: 1, color: tickColor, font: { size: 11 } },
                grid: { color: gridColor }
              }
            }
          }
        });
      } else {
        weeklyChart.data.datasets[0].data = dailyCounts;
        weeklyChart.data.datasets[0].backgroundColor = barColors;
        weeklyChart.options.scales.x.ticks.color = tickColor;
        weeklyChart.options.scales.y.ticks.color = tickColor;
        weeklyChart.options.scales.y.grid.color = gridColor;
        weeklyChart.options.scales.y.suggestedMax = maxSuggested;
        weeklyChart.update();
      }
    }

    function playTone(freq, duration, startOffset = 0) {
      if (!soundEnabled) return;
      try {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) return;
        if (!audioCtx) audioCtx = new AudioContextClass();
        if (audioCtx.state === "suspended") audioCtx.resume();

        const now = audioCtx.currentTime + startOffset;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now);
        osc.stop(now + duration);
      } catch (e) {
        // Ignore audio errors if blocked
      }
    }

    function showToast(message) {
      toast.textContent = message;
      toast.classList.add("visible");
      if (toastTimer) clearTimeout(toastTimer);
      toastTimer = setTimeout(() => {
        toast.classList.remove("visible");
      }, 2500);
    }

    function celebrateGoal(habitName) {
      showToast(`Goal met for "${habitName}"!`);
      playTone(523.25, 0.14, 0);
      playTone(659.25, 0.22, 0.12);
      if (typeof confetti === "function") {
        confetti({
          particleCount: 55,
          spread: 60,
          origin: { y: 0.7 }
        });
      }
    }

    function applyTheme() {
      document.body.classList.toggle("dark", isDark);
      themeToggleIcon.textContent = isDark ? "☀" : "☾";
      themeToggleLabel.textContent = isDark ? "Light" : "Dark";
      themeToggleBtn.setAttribute("aria-pressed", String(isDark));
      updateChart();
    }

    function applySoundPref() {
      soundToggleLabel.textContent = soundEnabled ? "Sound On" : "Sound Off";
      soundToggleBtn.setAttribute("aria-pressed", String(soundEnabled));
    }

    themeToggleBtn.addEventListener("click", () => {
      isDark = !isDark;
      saveTheme(isDark);
      applyTheme();
    });

    soundToggleBtn.addEventListener("click", () => {
      soundEnabled = !soundEnabled;
      saveSoundPref(soundEnabled);
      applySoundPref();
      if (soundEnabled) playTone(440, 0.1);
    });

    searchInput.addEventListener("input", () => {
      searchQuery = searchInput.value;
      renderHabits();
    });

    checkAllTodayBtn.addEventListener("click", () => {
      const targets = getVisibleHabits();
      if (targets.length === 0) return;

      let newlyGoalMetName = null;
      let changed = false;

      targets.forEach((habit) => {
        if (!habit.days[TODAY_INDEX]) {
          const wasGoalMet = habit.days.filter(Boolean).length >= habit.goal;
          habit.days[TODAY_INDEX] = true;
          changed = true;
          const isNowGoalMet = habit.days.filter(Boolean).length >= habit.goal;
          if (!wasGoalMet && isNowGoalMet) {
            newlyGoalMetName = habit.name;
          }
        }
      });

      if (!changed) {
        showToast(`All visible habits are already checked for ${DAY_LABELS[TODAY_INDEX]}.`);
        return;
      }

      saveHabits();
      renderHabits();

      if (newlyGoalMetName) {
        celebrateGoal(newlyGoalMetName);
      } else {
        playTone(587.33, 0.1);
        showToast(`Checked all visible habits for ${DAY_LABELS[TODAY_INDEX]}!`);
      }
    });

    exportBtn.addEventListener("click", () => {
      const backup = {
        habits,
        reflection: reflectionInput.value
      };
      const payload = JSON.stringify(backup, null, 2);
      const blob = new Blob([payload], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "habits-backup.json";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showToast("Exported habits-backup.json");
    });

    importBtn.addEventListener("click", () => {
      importFileInput.value = "";
      importFileInput.click();
    });

    importFileInput.addEventListener("change", (event) => {
      const file = event.target.files && event.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (loadEvent) => {
        try {
          const parsed = JSON.parse(String(loadEvent.target.result || ""));
          const rawHabits = Array.isArray(parsed) ? parsed : (parsed && Array.isArray(parsed.habits) ? parsed.habits : null);
          if (!rawHabits) {
            showToast("Invalid backup file format.");
            return;
          }
          habits = rawHabits.map(normalizeHabit);
          nextId = habits.reduce((max, h) => Math.max(max, h.id || 0), 0) + 1;
          editingId = null;
          editingNoteId = null;
          saveHabits();
          if (parsed && typeof parsed.reflection === "string") {
            reflectionInput.value = parsed.reflection;
            saveReflection(parsed.reflection);
          }
          renderHabits();
          showToast(`Imported ${habits.length} habit${habits.length === 1 ? "" : "s"}`);
        } catch (err) {
          showToast("Could not read JSON backup file.");
        }
      };
      reader.readAsText(file);
    });

    function moveHabit(id, direction) {
      const idx = habits.findIndex((h) => h.id === id);
      const targetIdx = idx + direction;
      if (idx === -1 || targetIdx < 0 || targetIdx >= habits.length) return;
      const temp = habits[idx];
      habits[idx] = habits[targetIdx];
      habits[targetIdx] = temp;
      saveHabits();
      renderHabits();
    }

    function renderFilters() {
      filterRow.innerHTML = "";
      CATEGORIES.forEach((cat) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = activeFilter === cat ? "filter-btn active" : "filter-btn";
        btn.textContent = cat;
        btn.addEventListener("click", () => {
          activeFilter = cat;
          renderFilters();
          renderHabits();
        });
        filterRow.appendChild(btn);
      });
    }

    function renderHabits() {
      list.innerHTML = "";

      const totalGoal = habits.reduce((sum, h) => sum + h.goal, 0);
      const totalCapped = habits.reduce(
        (sum, h) => sum + Math.min(h.days.filter(Boolean).length, h.goal),
        0
      );
      const totalRawCheckins = habits.reduce(
        (sum, h) => sum + h.days.filter(Boolean).length,
        0
      );
      const goalsMetCount = habits.filter(
        (h) => h.days.filter(Boolean).length >= h.goal
      ).length;
      const bestOverallStreak = habits.reduce(
        (max, h) => Math.max(max, getStreak(h.days)),
        0
      );
      const percent = totalGoal > 0 ? Math.round((totalCapped / totalGoal) * 100) : 0;

      progress.textContent = `${totalCapped} of ${totalGoal} weekly goal check-ins (${percent}%)`;
      progressBarFill.style.width = `${percent}%`;
      summaryGoals.textContent = `${goalsMetCount} / ${habits.length}`;
      summaryStreak.textContent = `${bestOverallStreak} ${bestOverallStreak === 1 ? "day" : "days"}`;
      summaryCheckins.textContent = String(totalRawCheckins);
      updateChart();

      const visibleHabits = getVisibleHabits();
      const canReorder = activeFilter === "All" && !searchQuery.trim();

      if (visibleHabits.length === 0) {
        const empty = document.createElement("li");
        empty.className = "empty-state";
        empty.textContent = habits.length === 0
          ? "No habits yet — add one above to get started!"
          : "No habits match your current filter or search.";
        list.appendChild(empty);
        return;
      }

      visibleHabits.forEach((habit) => {
        const checkedDays = habit.days.filter(Boolean).length;
        const goalMet = checkedDays >= habit.goal;
        const streak = getStreak(habit.days);
        const isEditing = editingId === habit.id;
        const isEditingNote = editingNoteId === habit.id;
        const fullIndex = habits.findIndex((h) => h.id === habit.id);

        const li = document.createElement("li");
        li.className = goalMet ? "habit-item all-done" : "habit-item";

        const topRow = document.createElement("div");
        topRow.className = "habit-top";

        const titleWrap = document.createElement("div");
        titleWrap.className = "habit-title-wrap";

        if (isEditing) {
          const editInput = document.createElement("input");
          editInput.type = "text";
          editInput.className = "edit-input";
          editInput.value = habit.name;
          editInput.setAttribute("aria-label", `Rename ${habit.name}`);

          const commitEdit = () => {
            const trimmed = editInput.value.trim();
            if (trimmed) {
              habit.name = trimmed;
              saveHabits();
            }
            editingId = null;
            renderHabits();
          };

          editInput.addEventListener("keydown", (event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              commitEdit();
            } else if (event.key === "Escape") {
              editingId = null;
              renderHabits();
            }
          });

          titleWrap.appendChild(editInput);

          const actions = document.createElement("div");
          actions.className = "habit-actions";

          const saveBtn = document.createElement("button");
          saveBtn.type = "button";
          saveBtn.className = "icon-btn save-btn";
          saveBtn.textContent = "Save";
          saveBtn.addEventListener("click", commitEdit);

          const cancelBtn = document.createElement("button");
          cancelBtn.type = "button";
          cancelBtn.className = "icon-btn";
          cancelBtn.textContent = "Cancel";
          cancelBtn.addEventListener("click", () => {
            editingId = null;
            renderHabits();
          });

          actions.appendChild(saveBtn);
          actions.appendChild(cancelBtn);
          topRow.appendChild(titleWrap);
          topRow.appendChild(actions);
        } else {
          const span = document.createElement("span");
          span.className = "habit-label";
          span.textContent = habit.name;

          const catTag = document.createElement("span");
          catTag.className = `category-tag cat-${habit.category}`;
          catTag.textContent = habit.category;

          const goalBadge = document.createElement("span");
          goalBadge.className = goalMet ? "goal-badge met" : "goal-badge";
          goalBadge.textContent = goalMet
            ? `${checkedDays}/${habit.goal} goal met!`
            : `${checkedDays}/${habit.goal} days`;

          const badge = document.createElement("span");
          badge.className = streak > 0 ? "streak-badge" : "streak-badge zero";
          badge.textContent = streak > 0 ? `${streak}-day streak` : "0-day streak";

          titleWrap.appendChild(span);
          titleWrap.appendChild(catTag);
          titleWrap.appendChild(goalBadge);
          titleWrap.appendChild(badge);

          const actions = document.createElement("div");
          actions.className = "habit-actions";

          if (canReorder) {
            const upBtn = document.createElement("button");
            upBtn.type = "button";
            upBtn.className = "icon-btn";
            upBtn.textContent = "↑";
            upBtn.disabled = fullIndex === 0;
            upBtn.setAttribute("aria-label", `Move ${habit.name} up`);
            upBtn.addEventListener("click", () => moveHabit(habit.id, -1));

            const downBtn = document.createElement("button");
            downBtn.type = "button";
            downBtn.className = "icon-btn";
            downBtn.textContent = "↓";
            downBtn.disabled = fullIndex === habits.length - 1;
            downBtn.setAttribute("aria-label", `Move ${habit.name} down`);
            downBtn.addEventListener("click", () => moveHabit(habit.id, 1));

            actions.appendChild(upBtn);
            actions.appendChild(downBtn);
          }

          const noteBtn = document.createElement("button");
          noteBtn.type = "button";
          noteBtn.className = "icon-btn";
          noteBtn.textContent = "Note";
          noteBtn.setAttribute("aria-label", `Add or edit note for ${habit.name}`);
          noteBtn.addEventListener("click", () => {
            editingNoteId = isEditingNote ? null : habit.id;
            renderHabits();
          });

          const editBtn = document.createElement("button");
          editBtn.type = "button";
          editBtn.className = "icon-btn";
          editBtn.textContent = "Edit";
          editBtn.setAttribute("aria-label", `Edit ${habit.name}`);
          editBtn.addEventListener("click", () => {
            editingId = habit.id;
            renderHabits();
          });

          const deleteBtn = document.createElement("button");
          deleteBtn.type = "button";
          deleteBtn.className = "icon-btn delete-btn";
          deleteBtn.textContent = "×";
          deleteBtn.setAttribute("aria-label", `Delete ${habit.name}`);
          deleteBtn.addEventListener("click", () => {
            habits = habits.filter((h) => h.id !== habit.id);
            saveHabits();
            renderHabits();
          });

          actions.appendChild(noteBtn);
          actions.appendChild(editBtn);
          actions.appendChild(deleteBtn);
          topRow.appendChild(titleWrap);
          topRow.appendChild(actions);
        }

        li.appendChild(topRow);

        if (isEditingNote) {
          const noteEditor = document.createElement("div");
          noteEditor.className = "habit-note-editor";

          const noteInput = document.createElement("input");
          noteInput.type = "text";
          noteInput.className = "note-input";
          noteInput.placeholder = "Add a quick note (e.g., 20 pages, 2L bottle)...";
          noteInput.value = habit.note || "";
          noteInput.setAttribute("aria-label", `Note for ${habit.name}`);

          const saveNote = () => {
            habit.note = noteInput.value.trim();
            editingNoteId = null;
            saveHabits();
            renderHabits();
          };

          noteInput.addEventListener("keydown", (event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              saveNote();
            } else if (event.key === "Escape") {
              editingNoteId = null;
              renderHabits();
            }
          });

          const saveNoteBtn = document.createElement("button");
          saveNoteBtn.type = "button";
          saveNoteBtn.className = "icon-btn save-btn";
          saveNoteBtn.textContent = "Save";
          saveNoteBtn.addEventListener("click", saveNote);

          noteEditor.appendChild(noteInput);
          noteEditor.appendChild(saveNoteBtn);
          li.appendChild(noteEditor);
        } else if (habit.note) {
          const notePreview = document.createElement("p");
          notePreview.className = "habit-note-preview";
          notePreview.textContent = `Note: ${habit.note}`;
          li.appendChild(notePreview);
        }

        const daysGrid = document.createElement("div");
        daysGrid.className = "days-grid";

        DAY_LABELS.forEach((dayName, dayIndex) => {
          const isChecked = habit.days[dayIndex];
          const isToday = dayIndex === TODAY_INDEX;
          const dayBtn = document.createElement("button");
          dayBtn.type = "button";
          dayBtn.className = [
            "day-btn",
            isChecked ? "checked" : "",
            isToday ? "today" : ""
          ].filter(Boolean).join(" ");
          dayBtn.setAttribute("aria-pressed", String(isChecked));
          dayBtn.setAttribute(
            "aria-label",
            `${habit.name} on ${dayName}${isToday ? " (today)" : ""}`
          );

          const labelEl = document.createElement("span");
          labelEl.textContent = dayName;

          const checkEl = document.createElement("span");
          checkEl.className = "day-check";
          checkEl.textContent = isChecked ? "✓" : "·";

          dayBtn.appendChild(labelEl);
          dayBtn.appendChild(checkEl);

          dayBtn.addEventListener("click", () => {
            const wasGoalMet = habit.days.filter(Boolean).length >= habit.goal;
            habit.days[dayIndex] = !habit.days[dayIndex];
            const isNowGoalMet = habit.days.filter(Boolean).length >= habit.goal;
            saveHabits();
            renderHabits();
            if (!wasGoalMet && isNowGoalMet) {
              celebrateGoal(habit.name);
            } else if (habit.days[dayIndex]) {
              playTone(587.33, 0.08);
            }
          });

          daysGrid.appendChild(dayBtn);
        });

        li.appendChild(daysGrid);
        list.appendChild(li);
      });
    }

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const name = input.value.trim();
      if (!name) return;

      habits.push({
        id: nextId++,
        name,
        category: categorySelect.value,
        goal: Number(goalSelect.value) || 7,
        note: "",
        days: [false, false, false, false, false, false, false]
      });
      input.value = "";
      saveHabits();
      renderHabits();
    });

    resetWeekBtn.addEventListener("click", () => {
      habits.forEach((habit) => {
        habit.days = [false, false, false, false, false, false, false];
      });
      saveHabits();
      renderHabits();
    });

    applyTheme();
    applySoundPref();
    renderFilters();
    renderHabits();
