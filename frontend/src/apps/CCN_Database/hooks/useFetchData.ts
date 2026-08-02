import { useEffect, useState } from "react";
import type { CcnRecord, CcnSearchFilters, Status } from "../CCN_Database.types";
import { supabase } from "../../../lib/supabase";
import { EMPTY_SEARCH_FILTERS, MISSING_SUPABASE_CONFIG_MESSAGE } from "../CCN_Database.constants";
import { addUtcDays, getCcnErrorMessage, toUtcDateStart } from "../CCN_Database.helpers";

interface CcnData {
    data: CcnRecord[];
}

export async function requestCcnData(filters: CcnSearchFilters = EMPTY_SEARCH_FILTERS): Promise<CcnData> {
    if (!supabase) {
        throw new Error(MISSING_SUPABASE_CONFIG_MESSAGE);
    }
    let query = supabase
        .from("CCN_Registry")
        .select("*", { count: "exact" })
        .order("updated_at", { ascending: false })
        .order("awb", { ascending: false });

    if (filters.from) {
        query = query.gte("created_at", toUtcDateStart(filters.from));
    }

    if (filters.to) {
        query = query.lt("created_at", toUtcDateStart(addUtcDays(filters.to, 1)));
    }

    if (filters.awb) {
        query = query.eq("awb", filters.awb);
    }

    if (filters.ccn) {
        query = query.eq("ccn", filters.ccn.toUpperCase());
    }

    if (filters.status) {
        query = query.eq("status", filters.status as Status);
    }

    if (filters.updated_at) {
        query = query
            .gte('updated_at', `${filters.updated_at}T00:00:00`)
            .lte('updated_at', `${filters.updated_at}T23:59:59`);
    }

    /*

    if (page){
        const requestedPage = Math.max(page, 1);
        const fromRow = (requestedPage - 1) * ITEMS_PER_PAGE;
        const toRow = fromRow + ITEMS_PER_PAGE - 1;

        const { data, error, count } = await query.range(fromRow, toRow);

        if (error) {
            throw error;
        }

        const totalRows = count ?? data.length;
        const totalPages = Math.max(1, Math.ceil(totalRows / ITEMS_PER_PAGE));

        if (totalRows > 0 && requestedPage > totalPages) {
            return requestCcnData(totalPages, filters);
        }

        return {
            data,
            page: Math.min(requestedPage, totalPages),
            totalRows,
            totalPages,
        };
    }

    */

    const { data, error } = await query;

    if (error) {
        throw error;
    }

    return { data };
}

interface FetchDataResult {
    data: CcnRecord[];
    page?: number;
    totalRows?: number;
    totalPages?: number;
    loading: boolean;
    error: string | null;
}

interface FetchDataOptions {
    filters: CcnSearchFilters;
    refreshToggle: boolean
}

export function useFetchData({ filters, refreshToggle }: FetchDataOptions): FetchDataResult {
    const [data, setData] = useState<CcnRecord[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    const filtersKey = JSON.stringify(filters);

    useEffect(() => {
        let ignore = false;

        const loadData = async () => {
            setLoading(true);
            setError(null);

            try {
                const response = await requestCcnData(filters);

                if (!ignore) {
                    setData(response.data);
                }
            } catch (err) {
                console.error("Error fetching data:", err);
                if (!ignore) {
                    setError(getCcnErrorMessage(err));
                }
            } finally {
                if (!ignore) {
                    setLoading(false);
                }
            }
        };

        void loadData();

        return () => {
            ignore = true;
        };
        // filtersKey stands in for filters to avoid refiring on new-but-equal object references
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filtersKey, refreshToggle]);

    return {
        data,
        loading,
        error,
    };
}