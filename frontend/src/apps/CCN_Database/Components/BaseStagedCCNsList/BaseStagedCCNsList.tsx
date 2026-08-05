import "../../CCN_Database.css"
import "./BaseStagedCCNsList.css"
import { formatDate } from "../../CCN_Database.helpers";
import type { CcnRecord, OperationType, Status } from "../../CCN_Database.types";

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
    } : StagedCcnListProps) => {

    return (
        <div className="ccn-database__staged">
            <div className="ccn-database__staged-header">
                <h3>Staged CCNs<span className="ccn-database__staged-header-subtitle"> - changes are saved automatically</span></h3>
            </div>

                <div className="ccn-table-shell-staged ccn-database__staged-table">
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
                                        <select id={`status-${record.ccn}`} name={`status-${record.ccn}`} className={`dropdown`} value={record.status} onChange={(e) => handleStatusChange(record.ccn, e.target.value as Status)}>
                                            <option className="released" value="Released">Released</option>
                                            <option className="exam" value="Exam">Exam</option>
                                            <option className="ccn_not_on_file" value="CCN not on file">CCN not on file</option>
                                            <option className="rejected" value="Rejected">Rejected</option>
                                            <option className="pending" value="Pending">Pending</option>
                                            <option className="king" value="King">King</option>
                                            <option className="other" value="Other">Other</option>
                                        </select>
                                    </td>
                                    <td>
                                        <input 
                                            type="text" 
                                            className="comment"
                                            placeholder="Enter comment..." 
                                            value={record.comment || ""} 
                                            onChange={(e) => handleCommentChange(record.ccn, e.target.value)}
                                        />
                                    </td>
                                    <td>
                                        { operationType == "add" ? 
                                            <input
                                                className="date" 
                                                type="date" 
                                                value={formatDate(record.created_at)} 
                                                onChange={(e) => handleDateChange(record.ccn, e.target.value)} />
                                            : <span className="date">{formatDate(record.created_at)}</span>
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
                        Reset
                    </button>

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