import "../CCN_Database.css"

interface BaseCCNFormProp {
    awbValue: string;
    ccnValue: string;
    disabled: boolean;
    handleStagedCcnChange: (event: React.FormEvent<HTMLFormElement>) => void;
    handleAwbChange: (awbValue: string) => void;
    handleCcnChange: (CcnValue: string) => void;
    handleResetForm: () => void;
    errorMessage?: string | null;
}


export const BaseCCNForm = ({ 
    awbValue, ccnValue, disabled, 
    handleStagedCcnChange, handleAwbChange, handleCcnChange, handleResetForm, errorMessage } : BaseCCNFormProp) => {

    return (
        <form className="ccn-database__add-form" onSubmit={handleStagedCcnChange}>
            <input
                type="text"
                id="awb"
                name="awb"
                className="ccn-database-input"
                placeholder="Enter AWB..."
                value={awbValue}
                onChange={(e) => handleAwbChange(e.target.value)}
            />
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
                <div className="ccn-database__notice-container">
                    {errorMessage && <p className="ccn-database__notice ccn-database__notice--error">{errorMessage}</p>}
                </div>

                <div className="ccn-database__button-container">
                    <button
                        className="ccn-database__reset-button"
                        type="button"
                        onClick={handleResetForm}
                    >
                        Reset Form
                    </button>
                    <button
                        className="ccn-database__search-button"
                        type="submit"
                        disabled={disabled}
                    >
                        Stage CCNs
                    </button>
                </div>

            </footer>

        </form>
    );
};