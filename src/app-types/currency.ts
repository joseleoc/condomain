export interface Currency {
    /** ISO 4217 currency code */
    iso_code: string;
    /** Currency name */
    name: string;
    /** Currency symbol */
    symbol: string;
    /** Minor unit of the currency which represents the number of decimal places */
    minor_unit: number;
    /** Date and time when the currency was created */
    created_at: string;
    /** Date and time when the currency was last updated */
    updated_at  : string;
}