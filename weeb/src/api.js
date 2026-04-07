"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCurrencyRates = getCurrencyRates;
const types_js_1 = require("./types.js");
async function getCurrencyRates(base = "USD") {
    const url = `https://open.er-api.com/v6/latest/${base}`;
    const res = await fetch(url);
    if (!res.ok) {
        throw new Error(`Помилка при отриманні курсу валют: ${res.status}`);
    }
    const data = await res.json();
    if (data.result !== 'success') {
        throw new Error('API повернуло помилку');
    }
    return data;
}
//# sourceMappingURL=api.js.map