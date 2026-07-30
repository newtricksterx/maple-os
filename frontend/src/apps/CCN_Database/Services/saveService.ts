import { addCcnRecord, updateCcnRecords } from "../CCN_Database.helpers";
import type { CcnRecord, OperationType } from "../CCN_Database.types";

interface SaveCcnRequest {
    stagedCcnRecords: CcnRecord[];
    operationType: OperationType;
}

interface SaveCcnResponse {
    successMessage : string;
}

export async function saveCcnRecords({ stagedCcnRecords, operationType }: SaveCcnRequest) : Promise<SaveCcnResponse> {

    if (operationType === "update") {
        await updateCcnRecords(stagedCcnRecords);

        return { successMessage: `Successfully updated ${stagedCcnRecords.length} CCN${stagedCcnRecords.length === 1 ? "" : "s"} in the database.`};
    }

    for (const record of stagedCcnRecords) {
        await addCcnRecord(record);
    }

    return { successMessage: `Successfully added ${stagedCcnRecords.length} CCN${stagedCcnRecords.length === 1 ? "" : "s"} to the database.`};
}