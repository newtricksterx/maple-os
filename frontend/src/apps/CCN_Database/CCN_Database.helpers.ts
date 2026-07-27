import type { CcnPage, CcnRecord, CcnSearchFilters, Status } from "./CCN_Database.types";
import {EMPTY_SEARCH_FILTERS, ITEMS_PER_PAGE, MISSING_SUPABASE_CONFIG_MESSAGE } from "./CCN_Database.constants";
import { supabase } from "../../lib/supabase";
export function formatDate(value?: string) {
    const date = value?.split("T")[0];
    return date || "-";
}

export function normalizeStatus(status?: string): Status {
    if (status === "Released" || status === "Exam" || status === "Rejected" || status === "Other") {
        return status;
    }

    return "Other";
}

export function getStatusClassName(status: Status) {
    if (status === "Exam") {
        return "ccn-status--review";
    }

    return `ccn-status--${status.toLowerCase()}`;
}

export function normalizeSearchFilters(filters: CcnSearchFilters): CcnSearchFilters {
    return {
        from: filters.from,
        to: filters.to,
        awb: filters.awb.trim(),
        ccn: filters.ccn.trim(),
        status: filters.status,
        released_on: filters.released_on,
    };
}

export function hasInvalidDateRange(filters: CcnSearchFilters) {
    return Boolean(filters.from && filters.to && filters.to < filters.from);
}

export function hasSearchFilters(filters: CcnSearchFilters) {
    return Object.values(filters).some(Boolean);
}

export function toUtcDateStart(value: string) {
    return `${value}T00:00:00.000Z`;
}

export function addUtcDays(value: string, days: number) {
    const [year, month, day] = value.split("-").map(Number);
    const date = new Date(Date.UTC(year, month - 1, day + days));

    return date.toISOString().split("T")[0];
}

export function getCcnErrorMessage(error: unknown) {
    if (error instanceof Error && error.message === MISSING_SUPABASE_CONFIG_MESSAGE) {
        return MISSING_SUPABASE_CONFIG_MESSAGE;
    }

    if (typeof error === "string" && error.trim()) {
        return error;
    }

    if (typeof error === "object" && error !== null) {
        const code = (error as { code?: string }).code;
        if (code && typeof code === "string" && code.trim()) {
            
            if (code === "23505") {
                return " already exists.";
            }
            else {
                return " has an unknown error. Please contact support.";
            }

        }
    }

    return "Unable to load CCN records right now.";
}

export async function addCcnRecord(record: CcnRecord): Promise<void> {
    if (!supabase) {
        throw new Error(MISSING_SUPABASE_CONFIG_MESSAGE);
    }

    if (record.status == "Released"){
        record.released_on = formatDate(new Date().toISOString())
    }

    const { error } = await supabase.from("CCN_Registry").insert(record);
    
    if (error) {
        throw error;
    }
}

export async function updateCcnRecord(record: CcnRecord) : Promise<void> {
    if (!supabase) {
        throw new Error(MISSING_SUPABASE_CONFIG_MESSAGE);
    }

    const releasedOn = record.status === "Released"
        ? formatDate(new Date().toISOString())
        : null;

    const { error } = await supabase
        .from("CCN_Registry")
        .update({
            status: record.status,
            updated_at: formatDate(new Date().toISOString()),
            comment: record.comment,
            released_on: releasedOn,
        })
        .eq("ccn", record.ccn)
        .eq("awb", record.awb);

    if (error) {
        throw error;
    }
}

export async function isAwbExist(awb: string): Promise<boolean> {
    if (!supabase) {
        throw new Error(MISSING_SUPABASE_CONFIG_MESSAGE);
    }

    const { count, error } = await supabase
        .from("CCN_Registry")
        .select('*', { count: 'exact', head: true })
        .eq('awb', awb);

    if (error) {
        throw error;
    }

    return (count ?? 0) > 0;
}

export async function getCCNs(ccns: string[], awb: string): Promise<CcnRecord[] | null> {
    if (!supabase) {
        throw new Error(MISSING_SUPABASE_CONFIG_MESSAGE);
    }

    const { data, error } = await supabase
        .from("CCN_Registry")
        .select('*', { count: 'exact' })
        .in('ccn', ccns)
        .eq('awb', awb);

    if (error) {
        throw error;
    }

    return data;
}

export async function requestCcnData(page: number, filters: CcnSearchFilters = EMPTY_SEARCH_FILTERS): Promise<CcnPage> {
    if (!supabase) {
        throw new Error(MISSING_SUPABASE_CONFIG_MESSAGE);
    }

    const requestedPage = Math.max(page, 1);
    const fromRow = (requestedPage - 1) * ITEMS_PER_PAGE;
    const toRow = fromRow + ITEMS_PER_PAGE - 1;
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
        query = query.eq("ccn", filters.ccn);
    }

    if (filters.status) {
        query = query.eq("status", filters.status as Status);
    }

    if (filters.released_on) {
        query = query.eq("released_on", filters.released_on);
    }

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

export const CcnToCcnRecord = (ccn: string, awb: string): CcnRecord => {
    return {
        ccn,
        awb,
        comment: "",
        released_on: null,
        status: "Exam",
        created_at: formatDate(new Date().toISOString()),
        updated_at: formatDate(new Date().toISOString()),
    };
}

export const dataToHashMap = (data : CcnRecord[]): Map<string, string[]> => {
    const map = new Map<string, string[]>()

    for (const record of data) {
        map.set(record.awb, [...(map.get(record.awb) ?? []), record.ccn])
    }

    return map
}