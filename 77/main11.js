const { BehaviorSubject, combineLatest, fromEvent, map } = rxjs;

const shipmentForm = document.getElementById("shipmentForm");
const trackingInput = document.getElementById("trackingInput");
const destinationInput = document.getElementById("destinationInput");
const filterButtons = document.getElementById("filterButtons");
const shipmentList = document.getElementById("shipmentList");
const statsInfo = document.getElementById("statsInfo");

const STORAGE_KEY = "logistics_shipments";

const shipments$ = new BehaviorSubject(loadShipmentsFromStorage());
const filter$ = new BehaviorSubject("all");

init();

function init() {
    if (!shipmentForm || !trackingInput || !destinationInput || !filterButtons || !shipmentList || !statsInfo) {
        console.error("Не вдалося ініціалізувати інтерфейс.");
        return;
    }
    bindAddShipment();
    bindFilters();
    bindListActions();
    bindRendering();
    bindPersistence();
}

function bindAddShipment() {
    if (!shipmentForm || !trackingInput || !destinationInput) return;

    fromEvent(shipmentForm, "submit")
        .pipe(
            map((event) => {
                event.preventDefault();
                const tracking = trackingInput.value.trim();
                const destination = destinationInput.value.trim();
                if (tracking.length === 0 || destination.length === 0) return null;
                return { tracking, destination };
            }),
            map((data) => {
                if (!data) return null;
                return {
                    id: makeShipmentId(),
                    trackingNumber: data.tracking,
                    destination: data.destination,
                    status: "pending",
                    createdAt: Date.now()
                };
            })
        )
        .subscribe((shipment) => {
            if (!shipment || !trackingInput || !destinationInput) return;
            const current = shipments$.getValue();
            shipments$.next([shipment, ...current]);
            trackingInput.value = "";
            destinationInput.value = "";
        });
}

function bindFilters() {
    if (!filterButtons) return;

    fromEvent(filterButtons, "click")
        .pipe(
            map((event) => {
                const target = event.target;
                const button = target?.closest("button[data-filter]");
                return button?.dataset.filter;
            }),
            map((value) => (value === "all" || value === "pending" || value === "in-transit" || value === "delivered" ? value : null))
        )
        .subscribe((filter) => {
            if (!filter || !filterButtons) return;
            filter$.next(filter);
            updateActiveFilterButton(filter);
        });
}

function bindListActions() {
    if (!shipmentList) return;

    fromEvent(shipmentList, "click")
        .pipe(
            map((event) => {
                const target = event.target;
                const deleteBtn = target?.closest("button[data-action='delete'][data-id]");
                if (deleteBtn) return { action: "delete", id: deleteBtn.dataset.id };
                
                const statusBtn = target?.closest("button[data-action='status'][data-id]");
                if (statusBtn) return { action: "status", id: statusBtn.dataset.id, status: statusBtn.dataset.status };
                
                return null;
            })
        )
        .subscribe((payload) => {
            if (!payload || !payload.id) return;
            const current = shipments$.getValue();

            if (payload.action === "delete") {
                const next = current.filter((s) => s.id !== payload.id);
                shipments$.next(next);
            }

            if (payload.action === "status" && payload.status) {
                const next = current.map((s) =>
                    s.id === payload.id ? { ...s, status: payload.status } : s
                );
                shipments$.next(next);
            }
        });
}

function bindRendering() {
    if (!shipmentList || !statsInfo) return;

    const visibleShipments$ = combineLatest([shipments$, filter$]).pipe(
        map(([shipments, filter]) => {
            const visible = shipments.filter((s) => {
                if (filter === "pending") return s.status === "pending";
                if (filter === "in-transit") return s.status === "in-transit";
                if (filter === "delivered") return s.status === "delivered";
                return true;
            });
            return { shipments, visible };
        })
    );

    visibleShipments$.subscribe(({ shipments, visible }) => {
        renderShipmentList(visible);
        renderStats(shipments);
    });
}

function renderShipmentList(items) {
    if (!shipmentList) return;

    if (items.length === 0) {
        shipmentList.innerHTML = '<li class="empty">Відправлень не знайдено.</li>';
        return;
    }

    shipmentList.innerHTML = items.map((s) => {
        let statusText = "";
        if (s.status === "pending") statusText = " Очікує";
        if (s.status === "in-transit") statusText = " В дорозі";
        if (s.status === "delivered") statusText = " Доставлено";
        
        return `
            <li class="shipment-item" style="border:1px solid #ccc; margin:10px 0; padding:10px; border-radius:5px">
                <strong>${escapeHtml(s.trackingNumber)}</strong><br>
                 ${escapeHtml(s.destination)}<br>
                 ${new Date(s.createdAt).toLocaleDateString()}<br>
                <span>${statusText}</span>
                <div style="margin-top:10px">
                    ${s.status !== "in-transit" ? `<button data-action="status" data-id="${s.id}" data-status="in-transit">🚛 В дорозі</button>` : ""}
                    ${s.status !== "delivered" ? `<button data-action="status" data-id="${s.id}" data-status="delivered">✅ Доставлено</button>` : ""}
                    <button data-action="delete" data-id="${s.id}">🗑️ Видалити</button>
                </div>
            </li>
        `;
    }).join("");
}

function renderStats(shipments) {
    if (!statsInfo) return;
    const total = shipments.length;
    const pending = shipments.filter((s) => s.status === "pending").length;
    const inTransit = shipments.filter((s) => s.status === "in-transit").length;
    const delivered = shipments.filter((s) => s.status === "delivered").length;
    statsInfo.textContent = `Всього: ${total} | Очікує: ${pending} | В дорозі: ${inTransit} | Доставлено: ${delivered}`;
}

function updateActiveFilterButton(activeFilter) {
    if (!filterButtons) return;
    const buttons = Array.from(filterButtons.querySelectorAll("button[data-filter]"));
    buttons.forEach((button) => {
        if (button.dataset.filter === activeFilter) {
            button.classList.add("is-active");
        } else {
            button.classList.remove("is-active");
        }
    });
}

function bindPersistence() {
    shipments$.subscribe((shipments) => saveShipmentsToStorage(shipments));
}

function makeShipmentId() {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function loadShipmentsFromStorage() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        return parsed.filter(isShipment);
    } catch {
        return [];
    }
}

function saveShipmentsToStorage(shipments) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(shipments));
    } catch {}
}

function isShipment(value) {
    if (!value || typeof value !== "object") return false;
    return (
        typeof value.id === "string" &&
        typeof value.trackingNumber === "string" &&
        typeof value.destination === "string" &&
        (value.status === "pending" || value.status === "in-transit" || value.status === "delivered") &&
        typeof value.createdAt === "number"
    );
}

function escapeHtml(value) {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}