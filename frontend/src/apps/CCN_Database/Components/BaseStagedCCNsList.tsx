import "../CCN_Database.css"
import { formatDate } from "../CCN_Database.helpers";
import type { CcnRecord, OperationType, Status } from "../CCN_Database.types";

interface StagedCcnListProps {
    stagedCcnRecords: CcnRecord[];
    handleStatusChange: (ccn: string, status: Status) => void;
    handleCommentChange: (ccn: string, comment: string) => void;
    handleDateChange: (ccn: string, date: string) => void;
    handleResetForm: () => void;
    handleSubmit: () => void;
    submitButtonText: string;
    operationType: OperationType;
    errorMessage?: string | null;
    successMessage?: string | null;
}

export const BaseStagedCCNsList = (
    {   stagedCcnRecords, 
        handleStatusChange, 
        handleCommentChange, 
        handleDateChange, 
        handleResetForm, 
        handleSubmit,
        submitButtonText,
        operationType,
        errorMessage, 
        successMessage } : StagedCcnListProps) => {

    return (
        <div className="ccn-database__staged">
            <div className="ccn-database__staged-header">
                <h3>Staged CCNs<span className="ccn-database__staged-header-subtitle"> - changes are saved automatically</span></h3>
                <p>AWB: {stagedCcnRecords[0]?.awb || "—"}</p>
                </div>

                <div className="ccn-table-shell ccn-database__staged-table">
                    <table className="ccn-table" aria-label="Staged CCN records">
                        <thead>
                            <tr>
                                <th>CCN</th>
                                <th>AWB</th>
                                <th>Status</th>
                                <th>Comment</th>
                                <th>Created At</th>
                            </tr>
                        </thead>
                        <tbody>
                            {stagedCcnRecords.map((record, index) => (
                                <tr key={`${record.ccn}-${index}`}>
                                    <td>{record.ccn}</td>
                                    <td>{record.awb}</td>
                                    <td>
                                        <select value={record.status} onChange={(e) => handleStatusChange(record.ccn, e.target.value as Status)}>
                                            <option value="Released">Released</option>
                                            <option value="Exam">Exam</option>
                                            <option value="Rejected">Rejected</option>
                                            <option value="Other">Other</option>
                                        </select>
                                    </td>
                                    <td>
                                        <input 
                                            type="text" 
                                            placeholder="Enter comment..." 
                                            value={record.comment || ""} 
                                            onChange={(e) => handleCommentChange(record.ccn, e.target.value)}
                                        />
                                    </td>
                                    <td>
                                        { operationType == "add" ? 
                                            <input 
                                                type="date" 
                                                value={formatDate(record.created_at)} 
                                                onChange={(e) => handleDateChange(record.ccn, e.target.value)} />
                                            : <span>{formatDate(record.created_at)}</span>
                                        }
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <footer className="ccn-database-staged-footer">

                    <button
                        className="ccn-database__reset-button"
                        type="button"
                        onClick={handleResetForm}
                    >
                        Reset Form
                    </button>

                    {errorMessage ? (
                        <p className="ccn-database__notice ccn-database__notice--error">{errorMessage}</p>
                    ) : successMessage ? (
                        <p className="ccn-database__notice ccn-database__notice--success">{successMessage}</p>
                    ) : null}

                    <button
                        className="ccn-database__add-button"
                        type="button"
                        onClick={handleSubmit}
                    >
                        {submitButtonText}
                    </button>

                </footer>
            </div>
        );
    }