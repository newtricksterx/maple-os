// stagingService.ts

import { CcnListToString, CcnToCcnRecord, getCCNData, isCcnsExist, normalizeStatus } from "../CCN_Database.helpers";
import type { CcnRecord, OperationType } from "../CCN_Database.types";

interface StageCcnRequest {
    ccnValue: string;
    awbValue: string;
    operationType: OperationType
}

export async function stageCcnRecords({
    ccnValue,
    awbValue,
    operationType,
}: StageCcnRequest): Promise<CcnRecord[]> {

    const cleanCcnList = ccnValue.split(/\s+/).filter(Boolean);

    const cleanAwbValue = awbValue.trim();

    if (cleanCcnList.length === 0) {
        throw new Error("Please enter at least one CCN.");
    }

    if (operationType === "INSERT" && !cleanAwbValue) {
        throw new Error("Please enter an AWB.");
    }

    if (operationType === "UPDATE") {

        const ccns = await Promise.all(
            cleanCcnList.map(ccn =>
                getCCNData(ccn)
            )
        );

        return ccns.map(record => ({
            ...record,
            awb: record.awb,
            status: normalizeStatus("Released"),
            comment: record.comment ?? "",
        }));
    }

    const matched = await isCcnsExist(cleanCcnList);

    if (matched.length > 0) {
        throw new Error(
            `CCNs - ${CcnListToString(matched)} already exist.`
        );
    }

    return cleanCcnList.map(ccn =>
        CcnToCcnRecord(ccn, cleanAwbValue)
    );
}