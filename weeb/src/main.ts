
document.addEventListener("DOMContentLoaded", () => {
    initApp();
});

function initApp(): void {
   
    const state = {
        searchQuery: "",
        theme: localStorage.getItem("theme") === "css/style.css" ? "dark" : "light"
    };

   
    const nameInput = document.querySelector("#nameInput") as HTMLInputElement | null;
    const greeting = document.querySelector("#greeting") as HTMLElement | null;
    const btn = document.querySelector("#btn") as HTMLButtonElement | null;  
    const currencyBtn = document.querySelector("#currencyBtn") as HTMLButtonElement | null;  
    const scrollBox = document.querySelector("#scrollBox") as HTMLElement | null;
    const scrollMsg = document.querySelector("#scrollMsg") as HTMLElement | null;
    const projectList = document.querySelector("#projectList") as HTMLElement | null;
    const toggleSkillsBtn = document.querySelector("#toggleSkillsBtn") as HTMLButtonElement | null;
    const skillsSection = document.querySelector("#skills") as HTMLElement | null;
    const projectContainer = document.querySelector("#projectContainer") as HTMLElement | null;
    const projectSearch = document.querySelector("#projectSearch") as HTMLInputElement | null;
    const themeBtn = document.querySelector("#themeBtn") as HTMLButtonElement | null;
    const themeStyle = document.querySelector("#themeStyle") as HTMLLinkElement | null;
    const result = document.getElementById("result") as HTMLElement | null;
    const currencySelect = document.getElementById("currency") as HTMLSelectElement | null;
    const currencySearch = document.getElementById("currencySearch") as HTMLInputElement | null;

    const projects = [
        { title: "Сайт портфоліо", description: "Особистий сайт для демонстрації навичок та проєктів.", url: "https://github.com/Polinaluna1" },
        { title: "Галерея зображень", description: "Веб-галерея з фільтрами та анімаціями.", url: "https://github.com/Polinaluna1" },
        { title: "ToDo App", description: "Проста веб-застосунок для планування завдань.", url: "https://github.com/Polinaluna1" },
        { title: "Міні-гра на JS", description: "Інтерактивна гра для розваги та навчання.", url: "https://github.com/Polinaluna1" }
    ];

    function escapeHtml(str: string): string {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    function applyTheme(): void {
        if (!themeStyle) return;
        themeStyle.setAttribute(
            "href",
            state.theme === "light" ? "css/style1.css" : "css/style.css"
        );
        localStorage.setItem("theme", themeStyle.getAttribute("href") || "");
    }

    function loadSettings(): void {
        applyTheme();
    }

    
    function renderProjects(): void {
        if (!projectContainer) return;

        projectContainer.innerHTML = "";

        const filtered = projects.filter(p =>
            p.title.toLowerCase().includes(state.searchQuery.toLowerCase())
        );

        if (filtered.length === 0) {
            projectContainer.innerHTML = "<p>Проєкти не знайдені</p>";
            return;
        }

        filtered.forEach(proj => {
            const div = document.createElement("div");
            div.classList.add("project-item");

            div.innerHTML = `
                <h3>${escapeHtml(proj.title)}</h3>
                <p>${escapeHtml(proj.description)}</p>
                <a href="${proj.url}" target="_blank" class="btn-view">Переглянути →</a>
            `;

            projectContainer.appendChild(div);
        });
    }

    async function loadCurrencyRates(): Promise<void> {
        console.log("🔄 Завантаження курсів валют...");
        
        if (!currencySelect) {
            console.log("⚠️ currencySelect не знайдено");
            return;
        }
        
        if (!result) {
            console.log("⚠️ result не знайдено");
            return;
        }

        const baseCurrency = currencySelect.value;
        console.log(`📊 Базова валюта: ${baseCurrency}`);

        try {
            result.innerHTML = '<div class="loading">⏳ Завантаження курсів валют...</div>';
            
            const response = await fetch(`https://open.er-api.com/v6/latest/${baseCurrency}`);
            
            if (!response.ok) {
                throw new Error(`HTTP помилка: ${response.status}`);
            }

            const data = await response.json();
            console.log("✅ Дані отримано");

            if (data.result !== "success") {
                throw new Error("API повернуло помилку");
            }

            renderCurrencyTable(data);
            console.log("✅ Таблицю відображено");

        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "Невідома помилка";
            console.error(" Помилка:", errorMessage);
            result.innerHTML = `<p style="color:red"> Помилка: ${errorMessage}</p>`;
        }
    }

    function renderCurrencyTable(data: any): void {
        if (!result) return;

        let html = `
            <div class="info">
                <p> Базова валюта: <strong>${escapeHtml(data.base_code)}</strong></p>
                <p> Оновлено: ${escapeHtml(data.time_last_update_utc)}</p>
                <p> Кількість валют: ${Object.keys(data.rates).length}</p>
            </div>
            <table class="currency-table">
                <thead>
                    <tr>
                        <th>Код валюти</th>
                        <th>Курс до ${escapeHtml(data.base_code)}</th>
                    </tr>
                </thead>
                <tbody>
        `;

        for (const [currency, rate] of Object.entries(data.rates)) {
            html += `
                <tr data-currency="${currency}">
                    <td><strong>${escapeHtml(currency)}</strong></td>
                    <td>${typeof rate === 'number' ? rate.toFixed(4) : rate}</td>
                   </tr>
            `;
        }

        html += `</tbody>
         </table>`;

        result.innerHTML = html;
    }

    function filterCurrencyTable(): void {
        if (!currencySearch || !result) return;

        const query = currencySearch.value.toLowerCase();
        const rows = result.querySelectorAll("tbody tr");

        rows.forEach((row: Element) => {
            const firstCell = row.children[0];
            const currency = firstCell?.textContent?.toLowerCase() || "";
            (row as HTMLElement).style.display = currency.includes(query) ? "" : "none";
        });
    }

    function showGreeting(): void {
        console.log(" Кнопку привітання натиснуто!");
        
        if (!greeting) return;
        
        const val = nameInput?.value.trim() || "";
        
        if (val) {
            greeting.innerHTML = `Привіт, <strong>${escapeHtml(val)}</strong>! 🎉 Рада тебе бачити!`;
            greeting.className = "greeting-success";
            console.log(` Привітання показано для: ${val}`);
        } else {
            greeting.innerHTML = `Привіт! Будь ласка, введи своє ім'я у поле вище!`;
            greeting.className = "greeting-warning";
            console.log(" Ім'я не введено");
        }
    }

    function updateGreetingOnInput(): void {
        if (!nameInput || !greeting) return;
        
        const val = nameInput.value.trim();
        if (val) {
            greeting.innerHTML = `Привіт, <strong>${escapeHtml(val)}</strong>! 🎉`;
            greeting.className = "greeting-success";
        } else {
            greeting.innerHTML = "";
            greeting.className = "";
        }
    }

    
    function bindEvents(): void {
       
        nameInput?.addEventListener("input", updateGreetingOnInput);

        btn?.addEventListener("click", showGreeting);

        currencyBtn?.addEventListener("click", () => {
            console.log(" Кнопку 'Отримати курс' натиснуто!");
            loadCurrencyRates();
        });

        toggleSkillsBtn?.addEventListener("click", () => {
            skillsSection?.classList.toggle("hidden");
        });

        scrollBox?.addEventListener("scroll", () => {
            if (!scrollBox || !scrollMsg) return;
            
            const maxScroll = scrollBox.scrollHeight - scrollBox.clientHeight;
            if (maxScroll <= 0) {
                scrollMsg.textContent = "";
                return;
            }

            const percent = Math.round((scrollBox.scrollTop / maxScroll) * 100);
            scrollMsg.textContent = `Прокручено: ${percent}%`;
        });

        themeBtn?.addEventListener("click", () => {
            state.theme = state.theme === "light" ? "dark" : "light";
            applyTheme();
        });

        projectSearch?.addEventListener("input", (e: Event) => {
            const target = e.target as HTMLInputElement;
            state.searchQuery = target.value;
            renderProjects();
        });

       
        currencySearch?.addEventListener("input", filterCurrencyTable);

      
        if (projectList) {
            const skills = projects.map(p => p.title);

            skills.forEach(skill => {
                const li = document.createElement("li");
                li.textContent = skill;
                li.classList.add("skill-item");

                li.addEventListener("click", () => {
                    li.classList.toggle("highlight");
                });

                projectList.appendChild(li);
            });
        }
    }
    loadSettings();
    bindEvents();
    renderProjects();
  
 }