import { useEffect, useState } from "react";
import type { CcnRecord, CcnSearchFilters, Status } from "../CCN_Database.types";
import { supabase } from "../../../lib/supabase";
import { EMPTY_SEARCH_FILTERS, ITEMS_PER_PAGE, MISSING_SUPABASE_CONFIG_MESSAGE } from "../CCN_Database.constants";
import { addUtcDays, getCcnErrorMessage, toUtcDateStart } from "../CCN_Database.helpers";

interface CcnData {
    data: CcnRecord[]
    page?: number;
    totalRows?: number;
    totalPages?: number;
}

export async function requestCcnData(page?: number, filters: CcnSearchFilters = EMPTY_SEARCH_FILTERS): Promise<CcnData> {
    if (!supabase) {
        throw new Error(MISSING_SUPABASE_CONFIG_MESSAGE);
    }
    let query = supabase
        .from("CCN_Registry")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false });

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

    if (filters.released_on) {
        query = query
            .gte('released_on', `${filters.released_on}T00:00:00`)
            .lte('released_on', `${filters.released_on}T23:59:59`);
    }

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
    page?: number;
}

export function useFetchData({ filters, page }: FetchDataOptions): FetchDataResult {
    const [data, setData] = useState<CcnRecord[]>([]);
    const [pageInfo, setPageInfo] = useState<Pick<CcnData, "page" | "totalRows" | "totalPages">>({});
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    const filtersKey = JSON.stringify(filters);

    useEffect(() => {
        let ignore = false;

        const loadData = async () => {
            setLoading(true);
            setError(null);

            try {
                const response = await requestCcnData(page, filters);

                if (!ignore) {
                    setData(response.data);
                    setPageInfo({
                        page: response.page,
                        totalRows: response.totalRows,
                        totalPages: response.totalPages,
                    });
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
    }, [filtersKey, page]);

    return {
        data,
        ...pageInfo,
        loading,
        error,
    };
}