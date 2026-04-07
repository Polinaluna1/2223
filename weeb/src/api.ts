import { CurrencyApiResponse } from './types.js';

export async function getCurrencyRates(base: string = "USD"): Promise<CurrencyApiResponse> {
    const url = `https://open.er-api.com/v6/latest/${base}`;
    const res = await fetch(url);
    
    if (!res.ok) {
        throw new Error(`Помилка при отриманні курсу валют: ${res.status}`);
    }
    
    const data: CurrencyApiResponse = await res.json();
    
    if (data.result !== 'success') {
        throw new Error('API повернуло помилку');
    }
    
    return data;
}