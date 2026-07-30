// stagingService.ts

import { CcnListToString, CcnToCcnRecord, getCCNData, isAwbExist, isCcnsExist, normalizeStatus } from "../CCN_Database.helpers";
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

    if (!cleanAwbValue) {
        throw new Error("Please enter an AWB.");
    }

    if (operationType === "update") {

        const awbExist = await isAwbExist(cleanAwbValue);

        if (!awbExist) {
            throw new Error(
                `AWB - ${cleanAwbValue} does not exist.`
            );
        }

        const ccns = await Promise.all(
            cleanCcnList.map(ccn =>
                getCCNData(ccn, cleanAwbValue)
            )
        );

        return ccns.map(record => ({
            ...record,
            awb: cleanAwbValue,
            status: normalizeStatus("Released"),
            comment: record.comment ?? "",
            released_on: new Date().toLocaleString(
                "en-US",
                { timeZone: "America/New_York" }
            )
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