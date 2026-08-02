import { dataToHashMap, getNowDate } from "../CCN_Database.helpers";
import type { CcnRecord, Status } from "../CCN_Database.types";

const escapeCsvField = (value: string): string => {
    // Detect values that Excel/WPS will misinterpret as numbers
    // (leading zeros, plain integers/decimals, scientific notation, etc.)
    const looksNumeric = /^[+-]?\d+(\.\d+)?$/.test(value) || /^0\d+/.test(value);

    const escaped = value.replace(/"/g, '""');

    if (looksNumeric) {
        // Force Excel/WPS to treat it as literal text, avoids the
        // "number stored as text" warning and leading apostrophe
        return `="${escaped}"`;
    }

    // Standard CSV quoting for anything with commas, quotes, or newlines
    return /[",\r\n]/.test(value) ? `"${escaped}"` : escaped;
};

export function exportData(ccns: CcnRecord[], status: Status) {
    const mappedCcns = dataToHashMap(ccns)

    const rows: string[] = [];

    mappedCcns.forEach((values, key) => {
        rows.push(`"${escapeCsvField(key)}, ${values.length}"`);
        values.forEach((value) => rows.push(escapeCsvField(value)));
        rows.push("");
    });

    const csvContent = "\uFEFF" + rows.join("\r\n"); // BOM helps WPS/Excel detect UTF-8 correctly
    const file = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(file);
    const link = document.createElement("a");

    link.href = url;
    link.download = `${getNowDate()}-${status}-export.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}