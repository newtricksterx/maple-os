import type { Enums, Tables } from "../../../database.types";

export type Status = Enums<"ccn_status">;
export type CcnRecord = Tables<"CCN_Registry">;

export type CcnPage = {
    data: CcnRecord[];
    page: number;
    totalRows: number;
    totalPages: number;
};

export type CcnSearchFilters = {
    from: string;
    to: string;
    awb: string;
    ccn: string;
    status: string;
    released_on: string;
};

export type OperationType = "add" | "update"