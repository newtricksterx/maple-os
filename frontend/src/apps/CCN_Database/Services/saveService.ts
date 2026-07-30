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

/*
    const handleDatabaseOperation = useCallback(async () => {
        if (stagedCcnRecords.length === 0) {
            return;
        }

        setErrorMessage(null);
        setAddSuccessMessage(null);

        if (operationType === "update") {

            try {
                await updateCcnRecords(stagedCcnRecords);
            } catch (error) {
                console.error(`Error updating CCN record`, error);
                setAddSuccessMessage(null);
                setErrorMessage(`${getCcnErrorMessage(error)}`);
                return;
            }
            

            setAddSuccessMessage(`Successfully updated ${stagedCcnRecords.length} CCN${stagedCcnRecords.length === 1 ? "" : "s"} in the database.`);
            return;
        }

        for (const record of stagedCcnRecords) {
            try {
                await addCcnRecord(record);
            } catch (error) {
                console.error(`Error adding CCN record ${record.ccn}:`, error);
                setAddSuccessMessage(null);
                setErrorMessage(`CCN - ${record.ccn} ${getCcnErrorMessage(error)}`);
                return;
            }
        }

        setAddSuccessMessage(`Successfully added ${stagedCcnRecords.length} CCN${stagedCcnRecords.length === 1 ? "" : "s"} to the database.`);

    }, [operationType, stagedCcnRecords]);

*/