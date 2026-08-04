import type { Enums, Tables } from "../../../database.types";

export type Status = Enums<"ccn_status">;
export type CcnRecord = Tables<"CCN_Registry">;

export type CcnPage = {
    data: CcnRecord[];
    page: number;
    totalRows: number;
    totalPages: number;
};

export type dateRange = {
    from: string;
    to: string;
}

export type CcnSearchFilters = {
    awb: string;
    ccn: string;
    status: string;
    created_at: dateRange;
    updated_at: dateRange;
};

export type OperationType = "add" | "update"
