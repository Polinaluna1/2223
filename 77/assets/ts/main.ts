import type { Shipment, ShipmentFilter } from "./types.js";

declare const rxjs: typeof import("rxjs");

const { BehaviorSubject, combineLatest, fromEvent, map, debounceTime, filter } = rxjs;

const shipmentForm = document.getElementById("shipmentForm") as HTMLFormElement | null;
const trackingInput = document.getElementById("trackingInput") as HTMLInputElement | null;
const destinationInput = document.getElementById("destinationInput") as HTMLInputElement | null;
const filterButtons = document.getElementById("filterButtons") as HTMLDivElement | null;
const shipmentList = document.getElementById("shipmentList") as HTMLUListElement | null;
const statsInfo = document.getElementById("statsInfo") as HTMLDivElement | null;
const clearAllBtn = document.getElementById("clearAllBtn") as HTMLButtonElement | null;

const STORAGE_KEY = "logistics_shipments";

const shipments$ = new BehaviorSubject<Shipment[]>(loadShipmentsFromStorage());
const filter$ = new BehaviorSubject<ShipmentFilter>("all");

init();
function init(): void {
  if (!shipmentForm || !trackingInput || !destinationInput || !filterButtons || !shipmentList || !statsInfo) {
    console.error("Не вдалося ініціалізувати інтерфейс.");
    return;
  }

  bindAddShipment();
  bindFilters();
  bindListActions();
  bindRendering();
  bindPersistence();
  bindClearAll();
  bindInputValidation();
  bindStatusScrollSelection(); 
}

function bindAddShipment(): void {
  if (!shipmentForm || !trackingInput || !destinationInput) return;

  fromEvent<SubmitEvent>(shipmentForm, "submit")
    .pipe(
      map((event) => {
        event.preventDefault();
        const tracking = trackingInput.value.trim();
        const destination = destinationInput.value.trim();
        
        if (tracking.length === 0 || destination.length === 0) {
          showNotification("Будь ласка, заповніть усі поля", "warning");
          return null;
        }
        
        if (tracking.length < 8) {
          showNotification("Трек-номер занадто короткий", "warning");
          return null;
        }
        
        return { tracking, destination };
      }),
      filter((data): data is { tracking: string; destination: string } => data !== null),
      map((data) => {
        const shipment: Shipment = {
          id: makeShipmentId(),
          trackingNumber: data.tracking.toUpperCase(),
          destination: data.destination,
          status: "pending",
          createdAt: Date.now()
        };
        return shipment;
      })
    )
    .subscribe((shipment) => {
      if (!shipment || !trackingInput || !destinationInput) return;
      
      const current = shipments$.getValue();
      shipments$.next([shipment, ...current]);
      trackingInput.value = "";
      destinationInput.value = "";
      showNotification(`✅ Відправлення ${shipment.trackingNumber} додано!`, "success");
      

      trackingInput.focus();
    });
}


function bindInputValidation(): void {
  if (!trackingInput || !destinationInput) return;
  
  fromEvent(trackingInput, "input")
    .pipe(
      debounceTime(300),
      map((e) => (e.target as HTMLInputElement).value.trim())
    )
    .subscribe((value) => {
      const isValid = value.length >= 8 || value.length === 0;
      trackingInput.classList.toggle("invalid", !isValid && value.length > 0);
    });
}


function bindStatusScrollSelection(): void {
  if (!shipmentList) return;

  fromEvent<WheelEvent>(shipmentList, "wheel")
    .pipe(
      filter((event) => {
        const target = event.target as HTMLElement;
        return !!target.closest(".shipment-card");
      }),
      map((event) => {
        event.preventDefault();
        const target = event.target as HTMLElement;
        const card = target.closest(".shipment-card");
        const id = card?.getAttribute("data-id");
        
        if (!id) return null;
        
        const current = shipments$.getValue();
        const shipment = current.find((s) => s.id === id);
        if (!shipment) return null;
        
        let newStatus: Shipment["status"] | null = null;
        
        if (event.deltaY > 0) {
        
          if (shipment.status === "pending") newStatus = "in-transit";
          else if (shipment.status === "in-transit") newStatus = "delivered";
        } else if (event.deltaY < 0) {
         
          if (shipment.status === "delivered") newStatus = "in-transit";
          else if (shipment.status === "in-transit") newStatus = "pending";
        }
        
        return newStatus ? { id, newStatus } : null;
      }),
      filter((data): data is { id: string; newStatus: Shipment["status"] } => data !== null)
    )
    .subscribe(({ id, newStatus }) => {
      const current = shipments$.getValue();
      const updated = current.map((s) =>
        s.id === id ? { ...s, status: newStatus } : s
      );
      shipments$.next(updated);
      
      const card = document.querySelector(`.shipment-card[data-id="${id}"]`);
      if (card) {
        card.classList.add("status-changed");
        setTimeout(() => card.classList.remove("status-changed"), 300);
      }
      
      showNotification(` Статус змінено прокруткою`, "success");
    });
}

function bindClearAll(): void {
  if (!clearAllBtn) return;
  
  fromEvent(clearAllBtn, "click")
    .subscribe(() => {
      if (shipments$.getValue().length === 0) return;
      
      const confirmed = confirm(" Ви дійсно хочете видалити ВСІ відправлення?");
      if (confirmed) {
        shipments$.next([]);
        showNotification(" Всі відправлення видалено", "info");
      }
    });
}


function bindFilters(): void {
  if (!filterButtons) return;

  fromEvent<MouseEvent>(filterButtons, "click")
    .pipe(
      map((event) => {
        const target = event.target as HTMLElement | null;
        const button = target?.closest<HTMLButtonElement>("button[data-filter]");
        return button?.dataset.filter as ShipmentFilter | undefined;
      }),
      filter((value): value is ShipmentFilter => 
        value === "all" || value === "pending" || value === "in-transit" || value === "delivered"
      )
    )
    .subscribe((filter) => {
      if (!filter || !filterButtons) return;
      
      filter$.next(filter);
      updateActiveFilterButton(filter);
      showNotification(` Фільтр: ${getFilterName(filter)}`, "info");
    });
}

function getFilterName(filter: ShipmentFilter): string {
  const names = {
    "all": "Усі",
    "pending": "Очікує",
    "in-transit": "В дорозі",
    "delivered": "Доставлено"
  };
  return names[filter];
}


function bindListActions(): void {
  if (!shipmentList) return;

  fromEvent<MouseEvent>(shipmentList, "click")
    .pipe(
      map((event) => {
        const target = event.target as HTMLElement | null;
        
        const deleteBtn = target?.closest<HTMLButtonElement>("button[data-action='delete'][data-id]");
        if (deleteBtn) {
          return { action: "delete", id: deleteBtn.dataset.id };
        }
        
        const statusBtn = target?.closest<HTMLButtonElement>("button[data-action='status'][data-id]");
        if (statusBtn) {
          return { 
            action: "status", 
            id: statusBtn.dataset.id, 
            status: statusBtn.dataset.status 
          };
        }
        
        return null;
      })
    )
    .subscribe((payload) => {
      if (!payload || !payload.id) return;
      
      const current = shipments$.getValue();

      if (payload.action === "delete") {
        const deletedItem = current.find((s) => s.id === payload.id);
        const next = current.filter((s) => s.id !== payload.id);
        shipments$.next(next);
        if (deletedItem) {
          showNotification(` Видалено: ${deletedItem.trackingNumber}`, "warning");
        }
      }

      if (payload.action === "status" && payload.status) {
        const next = current.map((s) =>
          s.id === payload.id 
            ? { ...s, status: payload.status as Shipment["status"] } 
            : s
        );
        shipments$.next(next);
        
        const statusName = payload.status === "in-transit" ? "В дорозі" : "Доставлено";
        showNotification(` Статус змінено на "${statusName}"`, "success");
      }
    });
}


function bindRendering(): void {
  if (!shipmentList || !statsInfo) return;

  const visibleShipments$ = combineLatest([shipments$, filter$]).pipe(
    map(([shipments, filter]) => {
      let visible = shipments;
      if (filter === "pending") visible = shipments.filter((s) => s.status === "pending");
      if (filter === "in-transit") visible = shipments.filter((s) => s.status === "in-transit");
      if (filter === "delivered") visible = shipments.filter((s) => s.status === "delivered");
      
      return { shipments, visible, filter };
    })
  );

  visibleShipments$.subscribe(({ shipments, visible, filter }) => {
    renderShipmentList(visible);
    renderStats(shipments);
    updateEmptyStateMessage(filter);
  });
}

function updateEmptyStateMessage(filter: ShipmentFilter): void {
  const emptyEl = document.querySelector(".empty-state");
  if (!emptyEl && shipmentList?.children.length === 0) {
    const filterNames = {
      "all": "жодних",
      "pending": "очікуваних",
      "in-transit": "в дорозі",
      "delivered": "доставлених"
    };
    
  }
}

function renderShipmentList(items: Shipment[]): void {
  if (!shipmentList) return;

  if (items.length === 0) {
    shipmentList.innerHTML = `
      <li class="empty-state">
        <div class="empty-icon">📭</div>
        <div class="empty-text">Відправлень не знайдено</div>
        <div class="empty-hint">Додайте нове відправлення через форму вище</div>
      </li>
    `;
    return;
  }

  shipmentList.innerHTML = items
    .map((s, index) => {
      const statusMap = {
        "pending": { text: " Очікує", class: "status-pending", icon: "" },
        "in-transit": { text: " В дорозі", class: "status-transit", icon: "" },
        "delivered": { text: " Доставлено", class: "status-delivered", icon: "" }
      };
      const status = statusMap[s.status];
      const date = new Date(s.createdAt);
      const formattedDate = date.toLocaleDateString('uk-UA');
      const formattedTime = date.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' });
      
      return `
        <li class="shipment-card" data-id="${s.id}" style="animation-delay: ${index * 0.03}s">
          <div class="shipment-header">
            <div class="shipment-tracking">
              <span class="tracking-icon"></span>
              ${escapeHtml(s.trackingNumber)}
            </div>
            <span class="shipment-status ${status.class}">
              ${status.icon} ${status.text}
            </span>
          </div>
          <div class="shipment-destination">
            <span class="dest-icon"></span>
            ${escapeHtml(s.destination)}
          </div>
          <div class="shipment-date">
            <span class="date-icon"></span>
            ${formattedDate} о ${formattedTime}
          </div>
          <div class="shipment-actions">
            ${s.status !== "in-transit" ? 
              `<button class="btn-transit" data-action="status" data-id="${s.id}" data-status="in-transit">
                <span></span> В дорозі
              </button>` 
              : ""}
            ${s.status !== "delivered" ? 
              `<button class="btn-delivered" data-action="status" data-id="${s.id}" data-status="delivered">
                <span></span> Доставлено
              </button>` 
              : ""}
            <button class="btn-delete" data-action="delete" data-id="${s.id}">
              <span></span> Видалити
            </button>
          </div>
        </li>
      `;
    })
    .join("");
}

function renderStats(shipments: Shipment[]): void {
  if (!statsInfo) return;
  
  const total = shipments.length;
  const pending = shipments.filter((s) => s.status === "pending").length;
  const inTransit = shipments.filter((s) => s.status === "in-transit").length;
  const delivered = shipments.filter((s) => s.status === "delivered").length;
  
  statsInfo.innerHTML = `
    <div class="stat-item" data-stat="total">
      <span class="stat-icon"></span>
      <span class="stat-label">Усього</span>
      <span class="stat-value">${total}</span>
    </div>
    <div class="stat-item" data-stat="pending">
      <span class="stat-icon"></span>
      <span class="stat-label">Очікує</span>
      <span class="stat-value">${pending}</span>
    </div>
    <div class="stat-item" data-stat="transit">
      <span class="stat-icon"></span>
      <span class="stat-label">В дорозі</span>
      <span class="stat-value">${inTransit}</span>
    </div>
    <div class="stat-item" data-stat="delivered">
      <span class="stat-icon"></span>
      <span class="stat-label">Доставлено</span>
      <span class="stat-value">${delivered}</span>
    </div>
  `;
}


let notificationTimeout: number | null = null;

function showNotification(message: string, type: "success" | "warning" | "info" | "error"): void {
  const notification = document.getElementById("notification");
  if (!notification) {
    createNotificationElement();
  }
  
  const notif = document.getElementById("notification");
  if (notif) {
    notif.textContent = message;
    notif.className = `notification notification-${type} show`;
    
    if (notificationTimeout) {
      clearTimeout(notificationTimeout);
    }
    
    notificationTimeout = window.setTimeout(() => {
      notif.classList.remove("show");
    }, 3000);
  }
}

function createNotificationElement(): void {
  const div = document.createElement("div");
  div.id = "notification";
  div.className = "notification";
  document.body.appendChild(div);
}

function updateActiveFilterButton(activeFilter: ShipmentFilter): void {
  if (!filterButtons) return;
  
  const buttons = Array.from(filterButtons.querySelectorAll<HTMLButtonElement>("button[data-filter]"));
  buttons.forEach((button) => {
    const isActive = button.dataset.filter === activeFilter;
    button.classList.toggle("is-active", isActive);
  });
}


function bindPersistence(): void {
  shipments$.subscribe((shipments) => {
    saveShipmentsToStorage(shipments);
  });
}

function makeShipmentId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function loadShipmentsFromStorage(): Shipment[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return getDemoShipments();
    
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return getDemoShipments();
    
    const valid = parsed.filter(isShipment);
    return valid.length > 0 ? valid : getDemoShipments();
  } catch {
    return getDemoShipments();
  }
}

function getDemoShipments(): Shipment[] {
  return [
    {
      id: "demo-1",
      trackingNumber: "LV123456789UA",
      destination: "Львів, вул. Шевченка 15",
      status: "in-transit",
      createdAt: Date.now() - 86400000
    },
    {
      id: "demo-2",
      trackingNumber: "KY987654321UA",
      destination: "Київ, Хрещатик 22",
      status: "pending",
      createdAt: Date.now()
    },
    {
      id: "demo-3",
      trackingNumber: "OD555888999UA",
      destination: "Одеса, Приморський бульвар 8",
      status: "delivered",
      createdAt: Date.now() - 172800000
    }
  ];
}

function saveShipmentsToStorage(shipments: Shipment[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(shipments));
  } catch {
    console.warn("Не вдалося зберегти дані");
  }
}

function isShipment(value: unknown): value is Shipment {
  if (!value || typeof value !== "object") return false;
  
  const s = value as Record<string, unknown>;
  return (
    typeof s.id === "string" &&
    typeof s.trackingNumber === "string" &&
    typeof s.destination === "string" &&
    (s.status === "pending" || s.status === "in-transit" || s.status === "delivered") &&
    typeof s.createdAt === "number"
  );
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}