import { dataToHashMap, formatDateTime } from "../CCN_Database.helpers";
import type { CcnRecord, Status } from "../CCN_Database.types";

const escapeCsvField = (value: string): string => {
    const looksNumeric = /^[+-]?\d+(\.\d+)?$/.test(value) || /^0\d+/.test(value);

    const hasFormulaPrefix = /^[\t\r ]*[=+\-@]/.test(value);
    const safeValue = hasFormulaPrefix ? `'${value}` : value;
    const escaped = safeValue.replace(/"/g, '""');

    if (looksNumeric && !hasFormulaPrefix) {
        return `="${escaped}"`;
    }

    // Standard CSV quoting for anything with commas, quotes, or newlines
    return /[",\r\n]/.test(value) ? `"${escaped}"` : escaped;
};

export function exportData(ccns: CcnRecord[], status: Status[]) {
    const mappedCcns = dataToHashMap(ccns)

    const rows: string[] = [];

    const today = formatDateTime(new Date().toISOString())

    rows.push(escapeCsvField(today));

    rows.push("")

    if (mappedCcns.releasedMap.size > 0) {
        rows.push("Released:")
    
        rows.push("")

        mappedCcns.releasedMap.forEach((values, key) => {
            rows.push(`${escapeCsvField(key)}`);
            values.forEach((value) => rows.push(`${escapeCsvField(value.ccn)},${value.comment ? escapeCsvField(value.comment) : ""}`));
            rows.push(`${values.length} CCN${values.length === 1 ? "" : "s"} above`);
            rows.push("");
        });
    }

    if (mappedCcns.examMap.size > 0) {
        rows.push("Exam:")

        rows.push("")

        mappedCcns.examMap.forEach((values, key) => {
            rows.push(`${escapeCsvField(key)}`);
            values.forEach((value) => rows.push(`${escapeCsvField(value.ccn)},${value.comment ? escapeCsvField(value.comment) : ""}`));
            rows.push(`${values.length} CCN${values.length === 1 ? "" : "s"} above`);
            rows.push("");
        });
    }

    if (mappedCcns.ccnNotOnFileMap.size > 0) {
        rows.push("CCN not on file:")

        rows.push("")

        mappedCcns.ccnNotOnFileMap.forEach((values, key) => {
            rows.push(`${escapeCsvField(key)}`);
            values.forEach((value) => rows.push(`${escapeCsvField(value.ccn)},${value.comment ? escapeCsvField(value.comment) : ""}`));
            rows.push(`${values.length} CCN${values.length === 1 ? "" : "s"} above`);
            rows.push("");
        });
    }

    if (mappedCcns.rejectedMap.size > 0) {
        rows.push("Rejected:")

        rows.push("")

        mappedCcns.rejectedMap.forEach((values, key) => {
            rows.push(`${escapeCsvField(key)}`);
            values.forEach((value) => rows.push(`${escapeCsvField(value.ccn)},${value.comment ? escapeCsvField(value.comment) : ""}`));
            rows.push(`${values.length} CCN${values.length === 1 ? "" : "s"} above`);
            rows.push("");
        });
    }


    if (mappedCcns.pendingMap.size > 0) {
        rows.push("Pending:")

        rows.push("")

        mappedCcns.pendingMap.forEach((values, key) => {
            rows.push(`${escapeCsvField(key)}`);
            values.forEach((value) => rows.push(`${escapeCsvField(value.ccn)},${value.comment ? escapeCsvField(value.comment) : ""}`));
            rows.push(`${values.length} CCN${values.length === 1 ? "" : "s"} above`);
            rows.push("");
        });
    }

    if (mappedCcns.kingMap.size > 0) {
        rows.push("King:")

        rows.push("")

        mappedCcns.kingMap.forEach((values, key) => {
            rows.push(`${escapeCsvField(key)}`);
            values.forEach((value) => rows.push(`${escapeCsvField(value.ccn)},${value.comment ? escapeCsvField(value.comment) : ""}`));
            rows.push(`${values.length} CCN${values.length === 1 ? "" : "s"} above`);
            rows.push("");
        });
    }

    if (mappedCcns.otherMap.size > 0) {
        rows.push("Other:")

        rows.push("")

        mappedCcns.otherMap.forEach((values, key) => {
            rows.push(`${escapeCsvField(key)}`);
            values.forEach((value) => rows.push(`${escapeCsvField(value.ccn)},${value.comment ? escapeCsvField(value.comment) : ""}`));
            rows.push(`${values.length} CCN${values.length === 1 ? "" : "s"} above`);
            rows.push("");
        });
    }



    

    rows.push(`"Total CCN(s): ${ccns.length}"`);

    const csvContent = "\uFEFF" + rows.join("\r\n"); // BOM helps WPS/Excel detect UTF-8 correctly
    const file = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(file);
    const link = document.createElement("a");

    link.href = url;
    const statusLabel = (status.length > 0 ? status.join("-") : "all-statuses")
        .replace(/[^a-z0-9]+/gi, "-")
        .replace(/(^-|-$)/g, "")
        .toLowerCase();

    link.download = `${new Date().toISOString().slice(0, 10)}-${statusLabel}-export.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}
