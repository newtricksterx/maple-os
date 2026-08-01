import type { CcnRecord, CcnSearchFilters, Status } from "./CCN_Database.types";
import { MISSING_SUPABASE_CONFIG_MESSAGE } from "./CCN_Database.constants";
import { supabase } from "../../lib/supabase";

export function formatDate(value?: string) {
    if (!value) return "";
    
    // Fix: If it's already a plain date (no 'T' or time info), return it directly
    if (value.length === 10 && !value.includes("T")) {
        return value;
    }
    
    // Otherwise, safely convert full Supabase timestamps using New York time
    return new Date(value).toLocaleDateString('en-CA', { 
        timeZone: 'America/New_York' 
    });
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
        from: filters.from,
        to: filters.to,
        awb: filters.awb.trim(),
        ccn: filters.ccn.trim(),
        status: filters.status,
        updated_at: filters.updated_at,
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
                return "A CCN already exists.";
            }
            else if (code === "PGRST116") {
                return "A CCN does not exist. Please enter a valid CCN."
            }
            else {
                return "Unknown error. Please contact support.";
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
        record.released_on = getNowDate()
    }

    const { error } = await supabase.from("CCN_Registry").insert(record);
    
    if (error) {
        throw error;
    }
}

export async function updateCcnRecords(records: CcnRecord[]) : Promise<void> {
    if (!supabase) {
        throw new Error(MISSING_SUPABASE_CONFIG_MESSAGE);
    }

    for (const record of records) {
        record.updated_at = getNowDate();
    }

    const { error } = await supabase
        .from("CCN_Registry")
        .upsert(
            records
        )

    if (error) {
        console.log(error)
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

    console.log(ccn)

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
        released_on: null,
        status: "Exam",
        created_at: getNowDate(),
        updated_at: getNowDate(),
    };
}

export const dataToHashMap = (data : CcnRecord[]): Map<string, string[]> => {
    const map = new Map<string, string[]>()

    for (const record of data) {
        map.set(record.awb, [...(map.get(record.awb) ?? []), record.ccn])
    }

    return map
}

export const CcnListToString = (ccns: string[]) : string => {
    return ccns.join(', ')
}

export const getNowDate = () : string => {
    return new Date().toLocaleString("en-US", { timeZone: "America/New_York" });
}