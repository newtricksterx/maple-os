import { dataToHashMap, formatDateTime, type CcnInfo } from "../CCN_Database.helpers";
import type { CcnRecord, Status } from "../CCN_Database.types";
import ExcelJS from "exceljs";

export async function exportData(ccns: CcnRecord[], status: Status[]): Promise<void> {
    const mappedCcns = dataToHashMap(ccns);

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Export");

    const today = formatDateTime(new Date().toISOString());
    sheet.addRow([today]).font = { bold: true };
    sheet.addRow([]);

    // Same seven buckets, same order, as the original CSV export.
    const sections: Array<[string, Map<string, CcnInfo[]>]> = [
        ["Released", mappedCcns.releasedMap],
        ["Exam", mappedCcns.examMap],
        ["CCN not on file", mappedCcns.ccnNotOnFileMap],
        ["Rejected", mappedCcns.rejectedMap],
        ["Pending", mappedCcns.pendingMap],
        ["King", mappedCcns.kingMap],
        ["Other", mappedCcns.otherMap],
    ];

    for (const [status, map] of sections) {
        if (map.size === 0) continue;

        const sectionHeader = sheet.addRow([`${status}:`]);
        sectionHeader.font = { bold: true, underline: 'single', size: 12 };
        sheet.addRow([]);

        map.forEach((values, key) => {
            const groupHeader = sheet.addRow([key]);
            groupHeader.font = { bold: true };

            values.forEach((value) => {
                sheet.addRow([value.ccn, value.comment ?? ""]);
            });

            const countRow = sheet.addRow([
                `${values.length} CCN${values.length === 1 ? "" : "s"} above`,
            ]);
            countRow.font = { italic: true };
            sheet.addRow([]);
        });
    }

    const totalRow = sheet.addRow([`Total CCN(s): ${ccns.length}`]);
    totalRow.font = { bold: true };

    sheet.columns.forEach((column) => {
        let maxLength = 10;
        column.eachCell?.({ includeEmpty: true }, (cell) => {
            const len = cell.value ? String(cell.value).length : 0;
            if (len > maxLength) maxLength = len;
        });
        column.width = maxLength + 2;
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const file = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(file);
    const link = document.createElement("a");

    link.href = url;
    const statusLabel = (status.length > 0 ? status.join("-") : "all-statuses")
        .replace(/[^a-z0-9]+/gi, "-")
        .replace(/(^-|-$)/g, "")
        .toLowerCase();

    link.download = `${new Date().toISOString().slice(0, 10)}-${statusLabel}-export.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}