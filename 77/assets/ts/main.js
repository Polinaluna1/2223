"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const { BehaviorSubject, combineLatest, fromEvent, map } = rxjs;
const todoForm = document.getElementById("todoForm");
const todoInput = document.getElementById("todoInput");
const filterButtons = document.getElementById("filterButtons");
const todoList = document.getElementById("todoList");
const metaInfo = document.getElementById("metaInfo");
const STORAGE_KEY = "pr7_todos";
const todos$ = new BehaviorSubject(loadTodosFromStorage());
const filter$ = new BehaviorSubject("all");
init();
function init() {
    if (!todoForm || !todoInput || !filterButtons || !todoList || !metaInfo) {
        console.error("Не вдалося ініціалізувати інтерфейс.");
        return;
    }
    bindAddTodo();
    bindFilters();
    bindListActions();
    bindRendering();
    bindPersistence();
}
function bindAddTodo() {
    if (!todoForm || !todoInput)
        return;
    fromEvent(todoForm, "submit")
        .pipe(map((event) => {
        event.preventDefault();
        return todoInput.value.trim();
    }), map((text) => {
        if (text.length === 0) {
            return null;
        }
        const todo = {
            id: makeTodoId(),
            text,
            completed: false,
            createdAt: Date.now()
        };
        return todo;
    }))
        .subscribe((todo) => {
        if (!todo || !todoInput)
            return;
        const current = todos$.getValue();
        todos$.next([todo, ...current]);
        todoInput.value = "";
    });
}
function bindFilters() {
    if (!filterButtons)
        return;
    fromEvent(filterButtons, "click")
        .pipe(map((event) => {
        const target = event.target;
        const button = target?.closest("button[data-filter]");
        return button?.dataset.filter;
    }), map((value) => (value === "all" || value === "active" || value === "completed" ? value : null)))
        .subscribe((filter) => {
        if (!filter || !filterButtons)
            return;
        filter$.next(filter);
        updateActiveFilterButton(filter);
    });
}
function bindListActions() {
    if (!todoList)
        return;
    fromEvent(todoList, "click")
        .pipe(map((event) => {
        const target = event.target;
        const button = target?.closest("button[data-action][data-id]");
        if (!button)
            return null;
        return {
            action: button.dataset.action,
            id: button.dataset.id
        };
    }))
        .subscribe((payload) => {
        if (!payload || !payload.id)
            return;
        const current = todos$.getValue();
        if (payload.action === "edit") {
            const targetTodo = current.find((todo) => todo.id === payload.id);
            if (!targetTodo)
                return;
            const updatedText = window.prompt("Редагувати задачу:", targetTodo.text);
            if (updatedText === null)
                return;
            const trimmedText = updatedText.trim();
            if (!trimmedText)
                return;
            const next = current.map((todo) => todo.id === payload.id ? { ...todo, text: trimmedText } : todo);
            todos$.next(next);
        }
        if (payload.action === "delete") {
            const next = current.filter((todo) => todo.id !== payload.id);
            todos$.next(next);
        }
    });
    fromEvent(todoList, "change")
        .pipe(map((event) => {
        const target = event.target;
        const checkbox = target?.closest('input[data-action="toggle"][data-id]');
        if (!checkbox)
            return null;
        return {
            id: checkbox.dataset.id,
            completed: checkbox.checked
        };
    }))
        .subscribe((payload) => {
        if (!payload?.id)
            return;
        const current = todos$.getValue();
        const next = current.map((todo) => todo.id === payload.id ? { ...todo, completed: payload.completed } : todo);
        todos$.next(next);
    });
}
function bindRendering() {
    if (!todoList || !metaInfo)
        return;
    const visibleTodos$ = combineLatest([
        todos$,
        filter$
    ]).pipe(map(([todos, filter]) => {
        const visible = todos.filter((todo) => {
            if (filter === "active")
                return !todo.completed;
            if (filter === "completed")
                return todo.completed;
            return true;
        });
        return {
            todos,
            visible
        };
    }));
    visibleTodos$.subscribe(({ todos, visible }) => {
        renderTodoList(visible);
        renderMeta(todos);
    });
}
function renderTodoList(items) {
    if (!todoList)
        return;
    if (items.length === 0) {
        todoList.innerHTML = '<li class="todo-empty">Задач за поточним фільтром не знайдено.</li>';
        return;
    }
    todoList.innerHTML = items
        .map((todo) => {
        const safeText = escapeHtml(todo.text);
        return `
        <li class="todo-item ${todo.completed ? "todo-item--done" : ""}">
          <input class="todo-item__checkbox" type="checkbox" data-action="toggle" data-id="${todo.id}" ${todo.completed ? "checked" : ""} aria-label="Змінити стан задачі">
          <p class="todo-item__text">${safeText}</p>
          <button class="btn btn--ghost" type="button" data-action="edit" data-id="${todo.id}">Редагувати</button>
          <button class="btn btn--ghost btn--danger" type="button" data-action="delete" data-id="${todo.id}">Видалити</button>
        </li>
      `;
    })
        .join("");
}
function renderMeta(todos) {
    if (!metaInfo)
        return;
    const completed = todos.filter((todo) => todo.completed).length;
    const active = todos.length - completed;
    metaInfo.textContent = `Всього: ${todos.length} | Активні: ${active} | Виконані: ${completed}`;
}
function updateActiveFilterButton(activeFilter) {
    if (!filterButtons)
        return;
    const buttons = Array.from(filterButtons.querySelectorAll("button[data-filter]"));
    buttons.forEach((button) => {
        const isActive = button.dataset.filter === activeFilter;
        button.classList.toggle("is-active", isActive);
    });
}
function bindPersistence() {
    todos$.subscribe((todos) => {
        saveTodosToStorage(todos);
    });
}
function makeTodoId() {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
function loadTodosFromStorage() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw)
            return [];
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed))
            return [];
        return parsed.filter(isTodo);
    }
    catch {
        return [];
    }
}
function saveTodosToStorage(todos) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
    }
    catch {
        // Ignore quota/storage errors in this training example.
    }
}
function isTodo(value) {
    if (!value || typeof value !== "object")
        return false;
    const todo = value;
    return (typeof todo.id === "string" &&
        typeof todo.text === "string" &&
        typeof todo.completed === "boolean" &&
        typeof todo.createdAt === "number");
}
function escapeHtml(value) {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
//# sourceMappingURL=main.js.map