    interface BaseCCNFormProp {
        awbValue: string;
        ccnValue: string;
        disabled: boolean;
        handleStagedCcnChange: (event: React.FormEvent<HTMLFormElement>) => void;
        handleAwbChange: (awbValue: string) => void;
        handleCcnChange: (CcnValue: string) => void;
        handleResetForm: () => void;
    }
    
    
    export const BaseCCNForm = ({ 
        awbValue, ccnValue, disabled, 
        handleStagedCcnChange, handleAwbChange, handleCcnChange, handleResetForm } : BaseCCNFormProp) => {

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
                </footer>

            </form>
        );
    };