import { saveCcnRecords as saveCcnRecordsHelper } from "../CCN_Database.helpers";
import type { CcnRecord  } from "../CCN_Database.types";

interface SaveCcnResponse {
    successMessage : string;
}

export async function saveCcnRecords(stagedCcnRecords: CcnRecord[]): Promise<SaveCcnResponse> {
    await saveCcnRecordsHelper(stagedCcnRecords);

    return { successMessage: `Successfully saved ${stagedCcnRecords.length} CCN${stagedCcnRecords.length === 1 ? "" : "s"} in the database.` };
}