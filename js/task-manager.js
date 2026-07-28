(() => {
  "use strict";

  const form = document.querySelector("[data-task-form]");
  if (!form) return;

  const storageKey = "rdprassy-eisenhower-tasks-v1";
  const quadrants = ["do", "schedule", "delegate", "eliminate"];
  const quadrantLabels = {
    do: "Do first",
    schedule: "Schedule",
    delegate: "Delegate",
    eliminate: "Eliminate / Limit"
  };
  const quadrantCopy = {
    do: "Urgent and important",
    schedule: "Important, but not urgent",
    delegate: "Urgent, but not important",
    eliminate: "Neither urgent nor important"
  };
  const allowedCategories = new Set(["Work", "Personal", "Learning", "Health", "Finance", "Other"]);
  const elements = {
    title: document.querySelector("[data-task-title]"),
    notes: document.querySelector("[data-task-notes]"),
    due: document.querySelector("[data-task-due]"),
    category: document.querySelector("[data-task-category]"),
    important: document.querySelector("[data-task-important]"),
    urgent: document.querySelector("[data-task-urgent]"),
    preview: document.querySelector("[data-quadrant-preview]"),
    previewCopy: document.querySelector("[data-quadrant-preview-copy]"),
    submit: document.querySelector("[data-task-submit]"),
    cancelEdit: document.querySelector("[data-task-cancel-edit]"),
    formTitle: document.querySelector("[data-task-form-title]"),
    formStatus: document.querySelector("[data-task-form-status]"),
    titleCount: document.querySelector("[data-title-count]"),
    search: document.querySelector("[data-task-search]"),
    open: document.querySelector("[data-task-open]"),
    completed: document.querySelector("[data-task-completed]"),
    today: document.querySelector("[data-task-today]"),
    progress: document.querySelector("[data-task-progress]"),
    exportButton: document.querySelector("[data-task-export]"),
    importInput: document.querySelector("[data-task-import]"),
    clearCompleted: document.querySelector("[data-clear-completed]"),
    toast: document.querySelector("[data-task-toast]"),
    toastCopy: document.querySelector("[data-task-toast-copy]"),
    undo: document.querySelector("[data-task-undo]")
  };

  let tasks = loadTasks();
  let editingId = null;
  let activeFilter = "all";
  let searchTerm = "";
  let draggedTaskId = null;
  let undoSnapshot = null;
  let toastTimer;

  function createId() {
    if (window.crypto?.randomUUID) return window.crypto.randomUUID();
    return `task-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function localDate() {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function sanitiseTask(value) {
    if (!value || typeof value !== "object") return null;
    const title = String(value.title || "").trim().slice(0, 120);
    if (!title) return null;
    const quadrant = quadrants.includes(value.quadrant) ? value.quadrant : "eliminate";
    const dueDate = /^\d{4}-\d{2}-\d{2}$/.test(String(value.dueDate || "")) ? String(value.dueDate) : "";
    return {
      id: typeof value.id === "string" && value.id ? value.id : createId(),
      title,
      notes: String(value.notes || "").trim().slice(0, 360),
      dueDate,
      category: allowedCategories.has(value.category) ? value.category : "Other",
      quadrant,
      completed: Boolean(value.completed),
      createdAt: value.createdAt || new Date().toISOString(),
      updatedAt: value.updatedAt || value.createdAt || new Date().toISOString(),
      completedAt: value.completed ? (value.completedAt || new Date().toISOString()) : null
    };
  }

  function loadTasks() {
    try {
      const stored = JSON.parse(localStorage.getItem(storageKey));
      const values = Array.isArray(stored) ? stored : stored?.tasks;
      return Array.isArray(values) ? values.map(sanitiseTask).filter(Boolean) : [];
    } catch {
      return [];
    }
  }

  function saveTasks() {
    try {
      localStorage.setItem(storageKey, JSON.stringify({ version: 1, tasks }));
      elements.formStatus.textContent = "Saved locally in this browser.";
    } catch {
      elements.formStatus.textContent = "Storage is unavailable; changes will last only for this tab.";
    }
  }

  function track(name, properties = {}) {
    window.rdprassyTrack?.(name, { product: "eisenhower_task_manager", ...properties });
  }

  function quadrantFromChoices() {
    if (elements.important.checked && elements.urgent.checked) return "do";
    if (elements.important.checked) return "schedule";
    if (elements.urgent.checked) return "delegate";
    return "eliminate";
  }

  function choicesFromQuadrant(quadrant) {
    elements.important.checked = quadrant === "do" || quadrant === "schedule";
    elements.urgent.checked = quadrant === "do" || quadrant === "delegate";
  }

  function updatePreview() {
    const quadrant = quadrantFromChoices();
    elements.preview.textContent = quadrantLabels[quadrant];
    elements.previewCopy.textContent = quadrantCopy[quadrant];
  }

  function dueInformation(dueDate, completed) {
    if (!dueDate) return null;
    const today = localDate();
    const todayTime = new Date(`${today}T12:00:00`).getTime();
    const dueTime = new Date(`${dueDate}T12:00:00`).getTime();
    const days = Math.round((dueTime - todayTime) / 86400000);
    const formatted = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(new Date(`${dueDate}T12:00:00`));
    if (!completed && days < 0) return { label: `Overdue · ${formatted}`, className: "task-chip--overdue", days };
    if (!completed && days === 0) return { label: "Due today", className: "task-chip--due-today", days };
    if (!completed && days <= 7) return { label: `Due ${formatted}`, className: "task-chip--soon", days };
    return { label: `Due ${formatted}`, className: "", days };
  }

  function matchesFilter(task) {
    const searchable = `${task.title} ${task.notes} ${task.category}`.toLowerCase();
    if (searchTerm && !searchable.includes(searchTerm)) return false;
    if (activeFilter === "active") return !task.completed;
    if (activeFilter === "completed") return task.completed;
    if (activeFilter === "due") {
      const due = dueInformation(task.dueDate, task.completed);
      return !task.completed && due && due.days <= 7;
    }
    return true;
  }

  function compareTasks(first, second) {
    if (first.completed !== second.completed) return first.completed ? 1 : -1;
    if (first.dueDate && second.dueDate && first.dueDate !== second.dueDate) return first.dueDate.localeCompare(second.dueDate);
    if (first.dueDate !== second.dueDate) return first.dueDate ? -1 : 1;
    return new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime();
  }

  function createChip(label, className = "") {
    const chip = document.createElement("span");
    chip.className = `task-chip${className ? ` ${className}` : ""}`;
    chip.textContent = label;
    return chip;
  }

  function createTaskCard(task) {
    const card = document.createElement("article");
    card.className = `task-card${task.completed ? " is-completed" : ""}`;
    card.dataset.taskId = task.id;
    card.draggable = true;

    const top = document.createElement("div");
    top.className = "task-card__top";

    const checkLabel = document.createElement("label");
    checkLabel.className = "task-check";
    checkLabel.title = task.completed ? "Mark task active" : "Mark task complete";
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = task.completed;
    checkbox.dataset.taskComplete = task.id;
    checkbox.setAttribute("aria-label", `${task.completed ? "Mark active" : "Mark complete"}: ${task.title}`);
    const checkVisual = document.createElement("span");
    checkVisual.setAttribute("aria-hidden", "true");
    checkLabel.append(checkbox, checkVisual);

    const title = document.createElement("strong");
    title.className = "task-card__title";
    title.textContent = task.title;

    const dragHandle = document.createElement("span");
    dragHandle.className = "task-card__drag";
    dragHandle.textContent = "⠿";
    dragHandle.title = "Drag task to another quadrant";
    dragHandle.setAttribute("aria-hidden", "true");
    top.append(checkLabel, title, dragHandle);
    card.append(top);

    if (task.notes) {
      const notes = document.createElement("p");
      notes.className = "task-card__notes";
      notes.textContent = task.notes;
      card.append(notes);
    }

    const meta = document.createElement("div");
    meta.className = "task-card__meta";
    meta.append(createChip(task.category));
    const due = dueInformation(task.dueDate, task.completed);
    if (due) meta.append(createChip(due.label, due.className));
    if (task.completed && task.completedAt) meta.append(createChip("Completed"));
    card.append(meta);

    const actions = document.createElement("div");
    actions.className = "task-card__actions";
    const edit = document.createElement("button");
    edit.type = "button";
    edit.dataset.taskAction = "edit";
    edit.dataset.taskId = task.id;
    edit.textContent = "Edit";
    const remove = document.createElement("button");
    remove.type = "button";
    remove.dataset.taskAction = "delete";
    remove.dataset.taskId = task.id;
    remove.textContent = "Delete";
    const move = document.createElement("select");
    move.dataset.taskMove = task.id;
    move.setAttribute("aria-label", `Move ${task.title} to another quadrant`);
    quadrants.forEach((quadrant) => {
      const option = document.createElement("option");
      option.value = quadrant;
      option.textContent = `Move: ${quadrantLabels[quadrant]}`;
      option.selected = task.quadrant === quadrant;
      move.append(option);
    });
    actions.append(edit, remove, move);
    card.append(actions);
    return card;
  }

  function render() {
    quadrants.forEach((quadrant) => {
      const list = document.querySelector(`[data-task-list="${quadrant}"]`);
      const empty = document.querySelector(`[data-task-empty="${quadrant}"]`);
      const visible = tasks.filter((task) => task.quadrant === quadrant && matchesFilter(task)).sort(compareTasks);
      list.replaceChildren(...visible.map(createTaskCard));
      empty.hidden = visible.length > 0;
      document.querySelector(`[data-quadrant-count="${quadrant}"]`).textContent = String(visible.length);
    });

    const openCount = tasks.filter((task) => !task.completed).length;
    const completedCount = tasks.length - openCount;
    const todayCount = tasks.filter((task) => !task.completed && task.dueDate === localDate()).length;
    elements.open.textContent = String(openCount);
    elements.completed.textContent = String(completedCount);
    elements.today.textContent = String(todayCount);
    elements.progress.textContent = `${tasks.length ? Math.round((completedCount / tasks.length) * 100) : 0}%`;
    elements.clearCompleted.disabled = completedCount === 0;
  }

  function showToast(copy, allowUndo = false) {
    clearTimeout(toastTimer);
    elements.toastCopy.textContent = copy;
    elements.undo.hidden = !allowUndo;
    elements.toast.hidden = false;
    toastTimer = window.setTimeout(() => {
      elements.toast.hidden = true;
      undoSnapshot = null;
    }, 5200);
  }

  function resetForm() {
    editingId = null;
    form.reset();
    elements.formTitle.textContent = "Create a task";
    elements.submit.textContent = "Add task";
    elements.cancelEdit.hidden = true;
    elements.titleCount.textContent = "0/120";
    updatePreview();
  }

  function editTask(id) {
    const task = tasks.find((candidate) => candidate.id === id);
    if (!task) return;
    editingId = id;
    elements.title.value = task.title;
    elements.notes.value = task.notes;
    elements.due.value = task.dueDate;
    elements.category.value = task.category;
    choicesFromQuadrant(task.quadrant);
    elements.formTitle.textContent = "Edit task";
    elements.submit.textContent = "Save changes";
    elements.cancelEdit.hidden = false;
    elements.titleCount.textContent = `${task.title.length}/120`;
    updatePreview();
    document.querySelector(".task-composer").scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
    window.setTimeout(() => elements.title.focus(), 250);
  }

  function deleteTask(id) {
    const index = tasks.findIndex((task) => task.id === id);
    if (index < 0) return;
    undoSnapshot = { type: "single", task: tasks[index], index };
    tasks.splice(index, 1);
    if (editingId === id) resetForm();
    saveTasks();
    render();
    showToast("Task deleted.", true);
    track("task_delete");
  }

  function moveTask(id, quadrant, source = "control") {
    const task = tasks.find((candidate) => candidate.id === id);
    if (!task || !quadrants.includes(quadrant) || task.quadrant === quadrant) return;
    const from = task.quadrant;
    task.quadrant = quadrant;
    task.updatedAt = new Date().toISOString();
    saveTasks();
    render();
    showToast(`Moved to ${quadrantLabels[quadrant]}.`);
    track("task_move", { from, to: quadrant, source });
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const title = elements.title.value.trim();
    if (!title) {
      elements.title.focus();
      elements.formStatus.textContent = "Add a task title before saving.";
      return;
    }
    const now = new Date().toISOString();
    const quadrant = quadrantFromChoices();
    const values = {
      title: title.slice(0, 120),
      notes: elements.notes.value.trim().slice(0, 360),
      dueDate: elements.due.value,
      category: elements.category.value,
      quadrant,
      updatedAt: now
    };
    if (editingId) {
      const task = tasks.find((candidate) => candidate.id === editingId);
      if (!task) return;
      Object.assign(task, values);
      showToast("Task updated.");
      track("task_update", { quadrant });
    } else {
      tasks.push({
        id: createId(),
        ...values,
        completed: false,
        createdAt: now,
        completedAt: null
      });
      showToast(`Task added to ${quadrantLabels[quadrant]}.`);
      track("task_create", { quadrant, has_due_date: Boolean(values.dueDate), category: values.category });
    }
    saveTasks();
    render();
    resetForm();
  });

  elements.cancelEdit.addEventListener("click", resetForm);
  elements.title.addEventListener("input", () => {
    elements.titleCount.textContent = `${elements.title.value.length}/120`;
  });
  elements.important.addEventListener("change", updatePreview);
  elements.urgent.addEventListener("change", updatePreview);
  elements.search.addEventListener("input", () => {
    searchTerm = elements.search.value.trim().toLowerCase();
    render();
  });

  document.querySelectorAll("[data-task-filter]").forEach((button) => button.addEventListener("click", () => {
    activeFilter = button.dataset.taskFilter;
    document.querySelectorAll("[data-task-filter]").forEach((candidate) => {
      const active = candidate === button;
      candidate.classList.toggle("is-active", active);
      candidate.setAttribute("aria-pressed", String(active));
    });
    render();
  }));

  document.querySelector(".eisenhower-matrix").addEventListener("change", (event) => {
    if (event.target.matches("[data-task-complete]")) {
      const task = tasks.find((candidate) => candidate.id === event.target.dataset.taskComplete);
      if (!task) return;
      task.completed = event.target.checked;
      task.completedAt = task.completed ? new Date().toISOString() : null;
      task.updatedAt = new Date().toISOString();
      saveTasks();
      render();
      showToast(task.completed ? "Task completed." : "Task returned to active.");
      track("task_completion_change", { completed: task.completed, quadrant: task.quadrant });
    }
    if (event.target.matches("[data-task-move]")) {
      moveTask(event.target.dataset.taskMove, event.target.value);
    }
  });

  document.querySelector(".eisenhower-matrix").addEventListener("click", (event) => {
    const button = event.target.closest("[data-task-action]");
    if (!button) return;
    if (button.dataset.taskAction === "edit") editTask(button.dataset.taskId);
    if (button.dataset.taskAction === "delete") deleteTask(button.dataset.taskId);
  });

  document.querySelector(".eisenhower-matrix").addEventListener("dragstart", (event) => {
    const card = event.target.closest("[data-task-id]");
    if (!card) return;
    draggedTaskId = card.dataset.taskId;
    card.classList.add("is-dragging");
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", draggedTaskId);
  });
  document.querySelector(".eisenhower-matrix").addEventListener("dragend", (event) => {
    event.target.closest("[data-task-id]")?.classList.remove("is-dragging");
    document.querySelectorAll(".matrix-quadrant").forEach((quadrant) => quadrant.classList.remove("is-drag-over"));
    draggedTaskId = null;
  });
  document.querySelectorAll("[data-quadrant]").forEach((quadrant) => {
    quadrant.addEventListener("dragover", (event) => {
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
      quadrant.classList.add("is-drag-over");
    });
    quadrant.addEventListener("dragleave", (event) => {
      if (!quadrant.contains(event.relatedTarget)) quadrant.classList.remove("is-drag-over");
    });
    quadrant.addEventListener("drop", (event) => {
      event.preventDefault();
      quadrant.classList.remove("is-drag-over");
      const id = draggedTaskId || event.dataTransfer.getData("text/plain");
      moveTask(id, quadrant.dataset.quadrant, "drag");
    });
  });

  elements.clearCompleted.addEventListener("click", () => {
    const completedTasks = tasks.map((task, index) => ({ task, index })).filter(({ task }) => task.completed);
    if (!completedTasks.length) {
      showToast("There are no completed tasks to clear.");
      return;
    }
    undoSnapshot = { type: "many", values: completedTasks };
    tasks = tasks.filter((task) => !task.completed);
    saveTasks();
    render();
    showToast(`${completedTasks.length} completed ${completedTasks.length === 1 ? "task" : "tasks"} cleared.`, true);
    track("task_clear_completed", { count: completedTasks.length });
  });

  elements.undo.addEventListener("click", () => {
    if (!undoSnapshot) return;
    if (undoSnapshot.type === "single") {
      tasks.splice(Math.min(undoSnapshot.index, tasks.length), 0, undoSnapshot.task);
    } else {
      undoSnapshot.values.forEach(({ task, index }) => tasks.splice(Math.min(index, tasks.length), 0, task));
    }
    undoSnapshot = null;
    saveTasks();
    render();
    showToast("Deletion undone.");
    track("task_delete_undo");
  });

  elements.exportButton.addEventListener("click", () => {
    const payload = JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), tasks }, null, 2);
    const url = URL.createObjectURL(new Blob([payload], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `rdprassy-task-matrix-${localDate()}.json`;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    showToast("Task backup exported.");
    track("task_export", { count: tasks.length });
  });

  elements.importInput.addEventListener("change", () => {
    const file = elements.importInput.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        const values = Array.isArray(parsed) ? parsed : parsed.tasks;
        if (!Array.isArray(values)) throw new Error("Invalid task file");
        const imported = values.map(sanitiseTask).filter(Boolean);
        const merged = new Map(tasks.map((task) => [task.id, task]));
        imported.forEach((task) => merged.set(task.id, task));
        tasks = Array.from(merged.values());
        saveTasks();
        render();
        showToast(`${imported.length} ${imported.length === 1 ? "task" : "tasks"} imported.`);
        track("task_import", { count: imported.length });
      } catch {
        showToast("That file is not a valid task backup.");
      } finally {
        elements.importInput.value = "";
      }
    });
    reader.readAsText(file);
  });

  window.addEventListener("storage", (event) => {
    if (event.key !== storageKey) return;
    tasks = loadTasks();
    render();
    showToast("Tasks were updated in another tab.");
  });

  updatePreview();
  render();
})();
