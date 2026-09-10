import type { CcnRecord, CcnSearchFilters, Status } from "./CCN_Database.types";
import { MISSING_SUPABASE_CONFIG_MESSAGE } from "./CCN_Database.constants";
import { supabase } from "../../lib/supabase";

export function formatDate(date?: string) {
    if (!date) return "";
    
    if (date.length === 10 && !date.includes("T")) {
        return date;
    }
    
    return new Date(date).toLocaleDateString('en-CA', { 
        timeZone: 'America/New_York' 
    });
}

export function formatDateTime(date?: string) {
    if (!date) return "";
    
    if (date.length === 10 && !date.includes("T")) {
        return date;
    }
    
    const formatted = new Date(date).toLocaleString('en-CA', { 
        timeZone: 'America/New_York',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    });

    // Removes the ", " and replaces it with a regular space
    // Turns "2026-09-10, 14:17" into "2026-09-10 14:17"
    return formatted.replace(', ', ' '); 
}



export function normalizeStatus(status?: string): Status {
    if (status === "Released" || 
        status === "Exam" || 
        status === "CCN not on file" || 
        status === "Pending" || 
        status === "King" ||
        status === "Rejected" || 
        status === "Other") {
        return status;
    }

    return "Other";
}

export function getStatusClassName(status: Status) {
    if (status === "CCN not on file"){
        return "ccn-status--ccn_not_on_file"
    }

    return `ccn-status--${status.toLowerCase()}`;
}

export function normalizeSearchFilters(filters: CcnSearchFilters): CcnSearchFilters {
    return {
        awb: filters.awb.trim(),
        ccn: filters.ccn.trim(),
        status: filters.status,
        created_at: filters.created_at,
        updated_at: filters.updated_at,
    };
}

export function hasInvalidDateRange(filters: CcnSearchFilters) {
    return Boolean(filters.created_at.from && filters.created_at.to && filters.created_at.to < filters.created_at.from) ||
           Boolean(filters.updated_at.from && filters.updated_at.to && filters.updated_at.to < filters.updated_at.from);
;
}

export function hasSearchFilters(filters: CcnSearchFilters) {
    return Object.values(filters).some((value) => {
        if (value && typeof value === "object") {
            return Object.values(value).some(Boolean);
        }
        return Boolean(value);
    });
}

export async function saveCcnRecords(records: CcnRecord[]) : Promise<void> {
    if (!supabase) {
        throw new Error(MISSING_SUPABASE_CONFIG_MESSAGE);
    }

    const recordsToSave = records.map((record) => ({
        ...record,
        updated_at: getNowDate(),
    }));

    const { error } = await supabase
        .from("CCN_Registry")
        .upsert(recordsToSave);

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

export async function isCcnsExist(ccns: string[]) : Promise<string[]> {
    if (!supabase) {
        throw new Error(MISSING_SUPABASE_CONFIG_MESSAGE);
    }

    const { data, error } = await supabase
        .from("CCN_Registry")
        .select('*')
        .in('ccn', ccns)

    if (error) {
        throw error;
    }

    const matchedCcns = data.map(row => row.ccn)

    return matchedCcns;

}

export async function isCcnExist(ccn: string): Promise<boolean> {
    if (!supabase) {
        throw new Error(MISSING_SUPABASE_CONFIG_MESSAGE);
    }

    const { count, error } = await supabase
        .from("CCN_Registry")
        .select('*', { count: 'exact', head: true})
        .eq('ccn', ccn);

    if (error) {
        throw error;
    }

    return (count ?? 0) > 0
}

export async function getCCNData(ccn: string): Promise<CcnRecord> {
    if (!supabase) {
        throw new Error(MISSING_SUPABASE_CONFIG_MESSAGE);
    }

    const { data, error } = await supabase
        .from("CCN_Registry")
        .select('*')
        .eq('ccn', ccn)
        .single();

    if (error) {
        throw error;
    }

    return data;
}

export const CcnToCcnRecord = (ccn: string, awb: string): CcnRecord => {
    return {
        ccn,
        awb,
        comment: "",
        status: "Exam",
        created_at: getNowDate(),
        updated_at: getNowDate(),
    };
}

export type CcnInfo = {
    ccn: string;
    comment: string | null;
}

export const dataToHashMap = (data : CcnRecord[]): Map<string, CcnInfo[]> => {
    const map = new Map<string, CcnInfo[]>()

    for (const record of data) {
        map.set(record.awb, [...(map.get(record.awb) ?? []), { ccn: record.ccn, comment: record.comment }])
    }

    return map
}

export const CcnListToString = (ccns: string[]) : string => {
    return ccns.join(', ')
}

export const getNowDate = () : string => {
    return new Date().toLocaleString("en-US", { timeZone: "America/New_York" });
}

interface SupabaseError {
    code?: string;
    message?: string;
    details?: string;
    hint?: string;
}

function isSupabaseError(error: unknown): error is SupabaseError {
    return (
        typeof error === "object" &&
        error !== null &&
        ("code" in error || "message" in error)
    );
}

export function getCcnErrorMessage(error: unknown): string {
    if (error instanceof Error) {
        if (error.message === MISSING_SUPABASE_CONFIG_MESSAGE) {
            return MISSING_SUPABASE_CONFIG_MESSAGE;
        }

        return error.message || "An unexpected error occurred.";
    }

    if (typeof error === "string" && error.trim()) {
        return error;
    }

    if (isSupabaseError(error)) {
        switch (error.code) {
            case "23505":
                return "One or more CCNs already exist. Please enter a valid CCN not in the database.";

            case "PGRST116":
                return "One or more CCNs do not exist. Please review CCNs entered and try again.";
        }
    }

    return "An unexpected error occurred. Please try again or contact support.";
}