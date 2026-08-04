import type { CcnSearchFilters } from "../../CCN_Database.types";
import '../../CCN_Database.css';
import { hasSearchFilters } from "../../CCN_Database.helpers";
import { useMemo } from "react";

interface SearchFormProps {
    searchDraft: CcnSearchFilters;
    updateSearchDraft: (field: keyof CcnSearchFilters, value: string) => void;
    updateDateRangeDraft: (field: "created_at" | "updated_at", subfield: "from" | "to", value: string) => void;
    applySearch: () => void;
    clearSearch: () => void;
    loading: boolean;
    appliedSearch: CcnSearchFilters;
    dateRangeError: string | null;
    isSupabaseConfigured: boolean;
}


export const SearchForm = (
    {   
        searchDraft, 
        updateSearchDraft, 
        updateDateRangeDraft, 
        applySearch, 
        clearSearch,  
        loading, 
        appliedSearch,
        dateRangeError, 
        isSupabaseConfigured 
    }: SearchFormProps) => {

        const hasAppliedSearch =  useMemo(() => hasSearchFilters(appliedSearch), [appliedSearch]);

        return (
            <form
                className="ccn-database__search"
                onSubmit={(event) => {
                    event.preventDefault();
                    applySearch();
                }}
            >
                <div className="ccn-database__search-header">
                    <div>
                        <h2 className="ccn-database__search-title">Search filters</h2>
                    </div>

                    <div className="ccn-database__search-toolbar">
                        {hasAppliedSearch ? (
                            <span className="ccn-database__search-active">Filters Applied</span>
                        ) : null}
                        <button
                            className="ccn-database__search-clear"
                            type="button"
                            onClick={clearSearch}
                        >
                            Clear
                        </button>
                        <button
                            className="ccn-database__search-button"
                            type="submit"
                            disabled={loading || Boolean(dateRangeError) || !isSupabaseConfigured}
                        >
                            Search
                        </button>
                    </div>
                </div>

                <div className="ccn-database__search-controls">
                    <div className="ccn-database__search-field">
                        <label htmlFor="ccn-search-ccn" className="ccn-database__search-label">CCN</label>
                        <input
                            type="text"
                            id="ccn-search-ccn"
                            autoComplete="off"
                            className="ccn-database__search-input"
                            value={searchDraft.ccn}
                            placeholder="Search CCN"
                            onChange={(event) => updateSearchDraft("ccn", event.target.value)}
                        />
                    </div>

                    <div className="ccn-database__search-field">
                        <label htmlFor="ccn-search-awb" className="ccn-database__search-label">AWB</label>
                        <input
                            type="text"
                            id="ccn-search-awb"
                            autoComplete="off"
                            className="ccn-database__search-input"
                            value={searchDraft.awb}
                            placeholder="Search AWB"
                            onChange={(event) => updateSearchDraft("awb", event.target.value)}
                        />
                    </div>

                    
                    <div className="ccn-database__search-field">
                        <label htmlFor="ccn-search-status" className="ccn-database__search-label">Status</label>
                        <select
                            id="ccn-search-status"
                            className="ccn-database__search-select"
                            value={searchDraft.status}
                            onChange={(event) => updateSearchDraft("status", event.target.value)}
                        >
                            <option value="">All</option>
                            <option value="Released">Released</option>
                            <option value="Exam">Exam</option>
                            <option value="CCN not on file">CCN not on file</option>
                            <option value="Rejected">Rejected</option>
                            <option value="Pending">Pending</option>
                            <option value="King">King</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>

                    <div className="ccn-database__search-field">
                        <label htmlFor="ccn-search-created-from" className="ccn-database__search-label">Created At</label>
                        <div className="ccn-database__search-field-dates">
                            <input
                                type="date"
                                id="ccn-search-created-from"
                                className="ccn-database__search-date"
                                value={searchDraft.created_at.from}
                                max={searchDraft.created_at.to || undefined}
                                aria-invalid={Boolean(dateRangeError)}
                                aria-describedby={dateRangeError ? "ccn-search-date-error" : undefined}
                                onChange={(event) => updateDateRangeDraft("created_at", "from", event.target.value)}
                            />
                            <span className="ccn-database__search-date-separator">-</span>
                            <input
                                type="date"
                                id="ccn-search-created-to"
                                className="ccn-database__search-date"
                                value={searchDraft.created_at.to}
                                min={searchDraft.created_at.from || undefined}
                                aria-invalid={Boolean(dateRangeError)}
                                aria-describedby={dateRangeError ? "ccn-search-date-error" : undefined}
                                onChange={(event) => updateDateRangeDraft("created_at", "to", event.target.value)}
                            />
                        </div>
                    </div>

                    <div className="ccn-database__search-field">
                        <label htmlFor="ccn-search-updated-from" className="ccn-database__search-label">Updated At</label>
                        <div className="ccn-database__search-field-dates">
                            <input
                                type="date"
                                id="ccn-search-updated-from"
                                className="ccn-database__search-date"
                                value={searchDraft.updated_at.from}
                                max={searchDraft.updated_at.to || undefined}
                                aria-invalid={Boolean(dateRangeError)}
                                aria-describedby={dateRangeError ? "ccn-search-date-error" : undefined}
                                onChange={(event) => updateDateRangeDraft("updated_at", "from", event.target.value)}
                            />
                            <span className="ccn-database__search-date-separator">-</span>
                            <input
                                type="date"
                                id="ccn-search-updated-to"
                                className="ccn-database__search-date"
                                value={searchDraft.updated_at.to}
                                min={searchDraft.updated_at.from || undefined}
                                aria-invalid={Boolean(dateRangeError)}
                                aria-describedby={dateRangeError ? "ccn-search-date-error" : undefined}
                                onChange={(event) => updateDateRangeDraft("updated_at", "to", event.target.value)}
                            />
                        </div>
                    </div>
                </div>

                {dateRangeError ? (
                    <p
                        className="ccn-database__search-error"
                        id="ccn-search-date-error"
                        role="alert"
                    >
                        {dateRangeError}
                    </p>
                ) : null}
            </form>
        )
}