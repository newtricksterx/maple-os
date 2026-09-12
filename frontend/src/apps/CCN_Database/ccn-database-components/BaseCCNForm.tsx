import { useId } from "react";
import "../CCN_Database.css"
import type { OperationType } from "../CCN_Database.types";

interface BaseCCNFormProp {
    awbValue: string;
    ccnValue: string;
    loading: boolean;
    operationType: OperationType;
    handleStagedCcnChange: (event: React.SubmitEvent) => void;
    handleAwbChange: (awbValue: string) => void;
    handleCcnChange: (CcnValue: string) => void;
    handleResetForm: () => void;
}


export const BaseCCNForm = ({ 
    awbValue, ccnValue, loading, operationType,
    handleStagedCcnChange, handleAwbChange, handleCcnChange, handleResetForm } : BaseCCNFormProp) => {
    const awbInputId = useId();
    const ccnInputId = useId();

    const isFilled = operationType === "INSERT" ? (awbValue.length > 0 && ccnValue.length > 0) : (ccnValue.length > 0);

    return (
        <form className="ccn-database__add-form" onSubmit={handleStagedCcnChange} autoComplete="off">
            {
                operationType === "INSERT" ? (
                    <>
                        <label className="ccn-database__visually-hidden" htmlFor={awbInputId}>AWB</label>
                        <input
                            type="text"
                            id={awbInputId}
                            name="awb"
                            className="ccn-database-input"
                            placeholder="Enter AWB..."
                            value={awbValue}
                            onChange={(e) => handleAwbChange(e.target.value)}
                        />
                    </>
                ) : null
            }
            <label className="ccn-database-add" htmlFor={ccnInputId}>
                <span className="ccn-database__visually-hidden">CCNs</span>
                <textarea
                    placeholder="Enter CCNs..."
                    className="ccn-database-textarea"
                    id={ccnInputId}
                    name="ccn"
                    value={ccnValue}
                    onChange={(e) => handleCcnChange(e.target.value)}
                />
            </label>
            <footer className="ccn-database__add-form-footer">
                <div className="ccn-database__button-container">
                    <button
                        className="ccn-database__reset-button"
                        type="button"
                        onClick={handleResetForm}
                    >
                        Reset
                    </button>
                    <button
                        className="ccn-database__search-button"
                        type="submit"
                        disabled={loading || !isFilled}
                    >
                        Stage CCNs
                    </button>
                </div>

            </footer>

        </form>
    );
};
