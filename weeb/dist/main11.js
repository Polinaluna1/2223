// 1. Кращий імпорт (якщо використовуєте модулі)
import { fromEvent, map, Subscription } from "rxjs";
// 2. Зберігаємо підписки для очищення
let subscriptions = [];
function init() {
    // ... ваш код
    subscriptions.push(bindAddTodo());
    subscriptions.push(bindFilters());
    // ... тощо
}
function bindAddTodo() {
    if (!todoForm || !todoInput)
        return new Subscription();
    return fromEvent(todoForm, "submit")
        .pipe(
    // ... ваш код
    )
        .subscribe( /* ... */);
}
// 3. Виправлена обробка change
fromEvent(todoList, "change")
    .pipe(map((event) => {
    const target = event.target;
    if (!target?.dataset?.id)
        return null;
    return {
        id: target.dataset.id,
        completed: target.checked
    };
}))
    .subscribe( /* ... */);
// 4. Додаємо функцію очищення
function destroy() {
    subscriptions.forEach(sub => sub.unsubscribe());
}
