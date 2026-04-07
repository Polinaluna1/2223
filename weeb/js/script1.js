document.addEventListener("DOMContentLoaded", () => {
    const baseSelect = document.getElementById("baseCurrency");
    const loadBtn = document.getElementById("loadRatesBtn");
    const ratesContainer = document.getElementById("ratesContainer");

    async function loadRates(base = "USD") {
        ratesContainer.innerHTML = "<p>Завантаження курсів...</p>";
        try {
            const response = await fetch(`https://open.er-api.com/v6/latest/${base}`);
            if (!response.ok) throw new Error(`Помилка запиту: ${response.status}`);
            const data = await response.json();

            if (data.result !== "success") {
                ratesContainer.innerHTML = "<p>Не вдалося отримати курси 😢</p>";
                return;
            }

            // Очистимо контейнер
            ratesContainer.innerHTML = `<h2>Базова валюта: ${data.base_code}</h2>`;

            // Відображаємо кілька валют
            const currencies = ["USD", "EUR", "UAH", "GBP", "PLN"];
            currencies.forEach(curr => {
                if (data.rates[curr]) {
                    const div = document.createElement("div");
                    div.classList.add("rate-item");
                    div.textContent = `${curr}: ${data.rates[curr]}`;
                    ratesContainer.appendChild(div);
                }
            });

        } catch (err) {
            console.error(err);
            ratesContainer.innerHTML = `<p>Помилка завантаження: ${err.message}</p>`;
        }
    }

    // Подія кнопки
    loadBtn.addEventListener("click", () => {
        loadRates(baseSelect.value);
    });

    // Завантажуємо за замовчуванням
    loadRates(baseSelect.value);
});