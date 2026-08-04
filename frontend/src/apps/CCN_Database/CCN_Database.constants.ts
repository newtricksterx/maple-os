import type { CcnSearchFilters } from "./CCN_Database.types";

export const ITEMS_PER_PAGE = 10;
export const MISSING_SUPABASE_CONFIG_MESSAGE =
    "Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to the frontend environment.";

export const EMPTY_SEARCH_FILTERS: CcnSearchFilters = {
    awb: "",
    ccn: "",
    status: "",
    created_at: { from: "", to: "" },
    updated_at: { from: "", to: "" },
};