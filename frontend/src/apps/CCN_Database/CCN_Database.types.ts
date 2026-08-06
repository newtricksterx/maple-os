import type { Enums, Tables } from "../../../database.types";

export type Status = Enums<"ccn_status">;
export type OperationType = Enums<"operation_type">
export type CcnRecord = Tables<"CCN_Registry">;
export type CcnRecordHistory = Tables<"CCN_Registry_History">

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

export type ToastType = "success" | "error" | "warning" | "info"

export type ToastState = {
    open: boolean;
    type: ToastType;
    title: string;
    message: string;
}
