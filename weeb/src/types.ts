export interface CurrencyRate {
    [currency: string]: number;
}

export interface CurrencyApiResponse {
    result: string;
    base_code: string;
    time_last_update_utc: string;
    rates: CurrencyRate;
}