import "../CCN_Database.css"
import type { OperationType } from "../CCN_Database.types";

interface BaseCCNFormProp {
    awbValue: string;
    ccnValue: string;
    loading: boolean;
    operationType: OperationType;
    handleStagedCcnChange: (event: React.FormEvent<HTMLFormElement>) => void;
    handleAwbChange: (awbValue: string) => void;
    handleCcnChange: (CcnValue: string) => void;
    handleResetForm: () => void;
}


export const BaseCCNForm = ({ 
    awbValue, ccnValue, loading, operationType,
    handleStagedCcnChange, handleAwbChange, handleCcnChange, handleResetForm } : BaseCCNFormProp) => {

    const isFilled = operationType === "INSERT" ? (awbValue.length > 0 && ccnValue.length > 0) : (ccnValue.length)



    return (
        <form className="ccn-database__add-form" onSubmit={handleStagedCcnChange} autoComplete="off">
            {
                operationType === "INSERT" ?             
                    <input
                    type="text"
                    id="awb"
                    name="awb"
                    className="ccn-database-input"
                    placeholder="Enter AWB..."
                    value={awbValue}
                    onChange={(e) => handleAwbChange(e.target.value)}
                /> : null
            }
            <label className="ccn-database-add">
                <textarea
                    placeholder="Enter CCNs..."
                    className="ccn-database-textarea"
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