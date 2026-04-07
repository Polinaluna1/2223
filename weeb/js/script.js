
// 1. Integration of JavaScript into the project
document.addEventListener("DOMContentLoaded", () => {
    initApp();
});

function initApp() {

    // 5. Interface state management
    const state = {
        searchQuery: "",
        theme: localStorage.getItem("theme") === "css/style.css" ? "dark" : "light"
    };

    // DOM elements
    const nameInput = document.querySelector("#nameInput");
    const greeting = document.querySelector("#greeting");
    const btn = document.querySelector("#btn");
    const scrollBox = document.querySelector("#scrollBox");
    const scrollMsg = document.querySelector("#scrollMsg");
    const projectList = document.querySelector("#projectList");
    const toggleSkillsBtn = document.querySelector("#toggleSkillsBtn");
    const skillsSection = document.querySelector("#skills");
    const projectContainer = document.querySelector("#projectContainer");
    const projectSearch = document.querySelector("#projectSearch");
    const themeBtn = document.querySelector("#themeBtn");
    const themeStyle = document.querySelector("#themeStyle");

    const result = document.getElementById("result");
    const currencySelect = document.getElementById("currency");
    const currencySearch = document.getElementById("currencySearch");

    // 4. Data
    const projects = [
        { title: "Сайт портфоліо", description: "Особистий сайт для демонстрації навичок та проєктів.", url: "https://github.com/Polinaluna1" },
        { title: "Галерея зображень", description: "Веб-галерея з фільтрами та анімаціями.", url: "https://github.com/Polinaluna1" },
        { title: "ToDo App", description: "Проста веб-застосунок для планування завдань.", url: "https://github.com/Polinaluna1" },
        { title: "Міні-гра на JS", description: "Інтерактивна гра для розваги та навчання.", url: "https://github.com/Polinaluna1" }
    ];

    // Theme
    function applyTheme() {
        if (!themeStyle) return;
        themeStyle.setAttribute(
            "href",
            state.theme === "light" ? "css/style1.css" : "css/style.css"
        );
        localStorage.setItem("theme", themeStyle.getAttribute("href"));
    }

    function loadSettings() {
        applyTheme();
    }

    // Projects
    function renderProjects() {
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
                <h3>${proj.title}</h3>
                <p>${proj.description}</p>
                <a href="${proj.url}" target="_blank" class="btn-view">Переглянути →</a>
            `;

            projectContainer.appendChild(div);
        });
    }

    // API

    async function loadCurrencyRates() {
        const baseCurrency = currencySelect.value;

        try {
            const response = await fetch(`https://open.er-api.com/v6/latest/${baseCurrency}`);
            if (!response.ok) throw new Error("Помилка: " + response.status);

            const data = await response.json();

            if (data.result !== "success") {
                result.innerHTML = "<p>Помилка отримання даних</p>";
                return;
            }

            renderCurrencyTable(data);

        } catch (err) {
            result.innerHTML = "<p>" + err.message + "</p>";
        }
    }

    function renderCurrencyTable(data) {
        let html = `
            <div class="info">
                <p>Базова валюта: <strong>${data.base_code}</strong></p>
                <p>Оновлено: ${data.time_last_update_utc}</p>
            </div>

            <table>
                <thead>
                    <tr>
                        <th>Валюта</th>
                        <th>Курс</th>
                    </tr>
                </thead>
                <tbody>
        `;

        for (const [currency, rate] of Object.entries(data.rates)) {
            html += `
                <tr>
                    <td>${currency}</td>
                    <td>${rate}</td>
                </tr>
            `;
        }

        html += "</tbody></table>";

        result.innerHTML = html;
    }

    function filterCurrencyTable() {
        const query = currencySearch.value.toLowerCase();
        const rows = result.querySelectorAll("tbody tr");

        rows.forEach(row => {
            const currency = row.children[0].textContent.toLowerCase();
            row.style.display = currency.includes(query) ? "" : "none";
        });
    }

    
    // Events
    function bindEvents() {

        nameInput?.addEventListener("input", () => {
            const val = nameInput.value.trim();
            greeting.innerHTML = val ? `Привіт, <strong>${val}</strong>! 🎉` : "";
        });

        btn?.addEventListener("click", loadCurrencyRates);

        toggleSkillsBtn?.addEventListener("click", () => {
            skillsSection?.classList.toggle("hidden");
        });

        scrollBox?.addEventListener("scroll", () => {
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

        projectSearch?.addEventListener("input", (e) => {
            state.searchQuery = e.target.value;
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