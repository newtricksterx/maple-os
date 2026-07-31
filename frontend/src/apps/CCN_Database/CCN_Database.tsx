import { useCallback, useMemo, useState } from "react";
import { isSupabaseConfigured } from "../../lib/supabase";
import "./CCN_Database.css";
import type { CcnRecord, CcnSearchFilters, OperationType, Status } from "./CCN_Database.types";
import {
    formatDate,
    getCcnErrorMessage,
    getNowDate,
    getStatusClassName,
    hasInvalidDateRange,
    hasSearchFilters,
    normalizeSearchFilters,
    normalizeStatus,
} from "./CCN_Database.helpers";
import { EMPTY_SEARCH_FILTERS } from "./CCN_Database.constants";
import { BaseCCNForm } from "./Components/BaseCCNForm";
import { OperationDialog } from "./Components/OperationDialog";
import { BaseStagedCCNsList } from "./Components/BaseStagedCCNsList/BaseStagedCCNsList";
import { ExitIcon } from "@radix-ui/react-icons";
import { stageCcnRecords } from "./Services/stageService";
import { saveCcnRecords } from "./Services/saveService";
import { exportData } from "./Services/exportService";
import { requestCcnData, useFetchData } from "./hooks/useFetchData";


export function CCN_Database() {
    const [currentPage, setCurrentPage] = useState(1);
    const [searchDraft, setSearchDraft] = useState<CcnSearchFilters>(EMPTY_SEARCH_FILTERS);
    const [appliedSearch, setAppliedSearch] = useState<CcnSearchFilters>(EMPTY_SEARCH_FILTERS);

    const [stagedCcnRecords, setStagedCcnRecords] = useState<CcnRecord[]>([]);

    const [awbValue, setAwbValue] = useState("");
    const [ccnValue, setCcnValue] = useState("");
    const [operationType, setOperationType] = useState<OperationType>("add");

    const [addSuccessMessage, setAddSuccessMessage] = useState<string | null>(null);

    const [operationError, setOperationError] = useState<string | null>(null)
    const [operationLoading, setOperationLoading] = useState(false)


    const dateRangeError = hasInvalidDateRange(searchDraft)
        ? "To date cannot be before From date."
        : null;
    const hasAppliedSearch = hasSearchFilters(appliedSearch);
    const emptyTableMessage = hasAppliedSearch
        ? "No CCN found."
        : "No CCN records found.";

    const { data, totalRows = 0, totalPages = 1, loading, error } = useFetchData({
        filters: appliedSearch,
        page: currentPage,
    });

    const { data: dataNoPage } = useFetchData({
        filters: appliedSearch
    })

    const statusCounts = useMemo(() => {
        const counts = { released: 0, exam: 0, ccn_not_on_file: 0, rejected: 0, other: 0 };

        dataNoPage.forEach((ccn) => {
            const status = normalizeStatus(ccn.status);

            if (status === "Released") {
                counts.released += 1;
            } else if (status === "Exam") {
                counts.exam += 1;
            } else if (status === "Rejected") {
                counts.rejected += 1;
            } else if (status === "CCN not on file") {
                counts.ccn_not_on_file += 1
            }             
            else {
                counts.other += 1;
            }
        });

        return counts;
    }, [dataNoPage]);

    const goToPage = useCallback((page: number) => {
        setCurrentPage((current) => {
            const nextPage = Math.min(Math.max(page, 1), totalPages);
            return loading || nextPage === current ? current : nextPage;
        });
    }, [loading, totalPages]);

    const applySearch = useCallback(() => {
        const nextSearch = normalizeSearchFilters(searchDraft);
        if (hasInvalidDateRange(nextSearch)) return;

        setSearchDraft(nextSearch);
        setAppliedSearch(nextSearch);
        setCurrentPage(1);
    }, [searchDraft]);

    const updateSearchDraft = useCallback((field: keyof CcnSearchFilters, value: string) => {
        setSearchDraft((currentSearch) => ({
            ...currentSearch,
            [field]: value,
        }));
    }, []);

    const handleStagedCcnChange = useCallback(async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        setOperationError(null);
        setAddSuccessMessage(null);
        setOperationLoading(true);
        
        try {
            const records = await stageCcnRecords({
                ccnValue,
                awbValue,
                operationType,
            });

            setStagedCcnRecords(records)
        } catch (error) {
            console.log("Error Staging Records: ", error)
            setOperationError(getCcnErrorMessage(error));
        } finally {
            setOperationLoading(false);
        }
    }, [awbValue, ccnValue, operationType]);

    const updateStagedRecord = useCallback(
        (ccn: string, updater: (record: CcnRecord) => CcnRecord) => {
            setStagedCcnRecords((currentRecords) =>
                currentRecords.map((record) =>
                    record.ccn === ccn ? updater(record) : record
                )
            );
        },
        []
    );

    const handleCommentChange = useCallback(
        (ccn: string, comment: string) => {
            updateStagedRecord(ccn, (record) => ({ ...record, comment }));
        },
        [updateStagedRecord]
    );

    const handleStatusChange = useCallback(
        (ccn: string, status: Status) => {
            updateStagedRecord(ccn, (record) => ({
                ...record,
                status,
                released_on:
                    status === "Released"
                        ? getNowDate()
                        : null,
            }));
        },
        [updateStagedRecord]
    );

    const handleDateChange = useCallback(
        (ccn: string, date: string) => {
            updateStagedRecord(ccn, (record) => ({
                ...record,
                created_at: date,
                updated_at: date,
            }));
        },
        [updateStagedRecord]
    );

    const handleResetForm = useCallback(() => {
        setStagedCcnRecords([]); 
        setAwbValue(""); 
        setCcnValue(""); 
        setOperationError(null);
        setAddSuccessMessage(null);
    }, [])

    const handleDatabaseOperation = useCallback(async () => {
        if (stagedCcnRecords.length === 0) {
            return;
        }

        setOperationError(null);
        setAddSuccessMessage(null);

        try {
            const response = await saveCcnRecords({stagedCcnRecords, operationType});
            setAddSuccessMessage(response.successMessage)

        } catch (error) {
            setAddSuccessMessage(null)
            console.log("Error Attempting Operation: ", error)
            setOperationError(`${getCcnErrorMessage(error)}`)
            return
        }

    }, [operationType, stagedCcnRecords]);

    const clearSearch = useCallback(() => {
        const clearedSearch = normalizeSearchFilters(EMPTY_SEARCH_FILTERS);

        setSearchDraft(clearedSearch);
        setAppliedSearch(clearedSearch);
    }, []);

    const handleExport = useCallback(async () => {
        try {
            const { data: allMatchingRows } = await requestCcnData(undefined, appliedSearch);
            exportData(allMatchingRows, searchDraft.status as Status);
        } catch (err) {
            setOperationError(getCcnErrorMessage(err));
        }
    }, [appliedSearch, searchDraft.status]);

    return (
        <section className="ccn-database">
            <header className="ccn-database__header">
                <div className="ccn-database__heading">
                    <h1 className="ccn-database__title">CCN Database</h1>
                    <p className="ccn-database__subtitle">
                        {loading && data.length === 0
                            ? "Loading records..."
                            : `${totalRows} ${totalRows === 1 ? "record" : "records"}`}
                    </p>
                </div>


                <div className="ccn-database__actions">
                    <button className="ccn-database__export" title="Export Data Shown" disabled={!data.length} onClick={handleExport}>
                        <ExitIcon />
                        Export
                    </button>

                    <OperationDialog 
                        title="Update CCN Records"
                        disabled={operationLoading || !isSupabaseConfigured}
                        stagedCcnRecords={stagedCcnRecords}
                        renderList={ () => (<BaseStagedCCNsList
                                            stagedCcnRecords={stagedCcnRecords}
                                            handleStatusChange={(handleStatusChange)}
                                            handleCommentChange={handleCommentChange}
                                            handleDateChange={handleDateChange}
                                            handleResetForm={handleResetForm}
                                            handleSubmit={handleDatabaseOperation}
                                            submitButtonText="Update to Database"
                                            operationType="update"
                                            errorMessage={operationError}
                                            successMessage={addSuccessMessage}
                                        />)}
                        renderForm={ () => (<BaseCCNForm 
                                        awbValue={awbValue} 
                                        ccnValue={ccnValue} 
                                        loading={operationLoading}  
                                        operationType="update" 
                                        handleStagedCcnChange={handleStagedCcnChange}
                                        handleAwbChange={setAwbValue}
                                        handleCcnChange={setCcnValue}
                                        handleResetForm={handleResetForm}
                                        errorMessage={operationError}
                                    />)}
                        setOperationType={() => {setOperationType("update")}}
                        handleResetForm={handleResetForm}
                    />


                    <OperationDialog 
                        title="Add CCN Records"
                        disabled={loading || operationLoading || !isSupabaseConfigured}
                        stagedCcnRecords={stagedCcnRecords}
                        renderList={() => (<BaseStagedCCNsList
                                            stagedCcnRecords={stagedCcnRecords}
                                            handleStatusChange={handleStatusChange}
                                            handleCommentChange={handleCommentChange}
                                            handleDateChange={handleDateChange}
                                            handleResetForm={handleResetForm}
                                            handleSubmit={handleDatabaseOperation}
                                            submitButtonText="Add to Database"
                                            operationType="add"
                                            errorMessage={operationError}
                                            successMessage={addSuccessMessage}
                                        />)}
                        renderForm={() => (<BaseCCNForm 
                                        awbValue={awbValue} 
                                        ccnValue={ccnValue} 
                                        loading={operationLoading}  
                                        operationType="add" 
                                        handleStagedCcnChange={handleStagedCcnChange}
                                        handleAwbChange={setAwbValue}
                                        handleCcnChange={setCcnValue}
                                        handleResetForm={handleResetForm}
                                        errorMessage={operationError}/>)}
                        setOperationType={() => {setOperationType("add")}}
                        handleResetForm={handleResetForm}
                    />
                </div>
            </header>

            <div className="ccn-database__stats" aria-label="CCN status summary">
                <div className="ccn-stat">
                    <span className="ccn-stat__label">Exam</span>
                    <span className="ccn-stat__value">{statusCounts.exam}</span>
                </div>
                <div className="ccn-stat">
                    <span className="ccn-stat__label">CCN not on file</span>
                    <span className="ccn-stat__value">{statusCounts.ccn_not_on_file}</span>
                </div>
                <div className="ccn-stat">
                    <span className="ccn-stat__label">Rejected</span>
                    <span className="ccn-stat__value">{statusCounts.rejected}</span>
                </div>
                <div className="ccn-stat">
                    <span className="ccn-stat__label">Other</span>
                    <span className="ccn-stat__value">{statusCounts.other}</span>
                </div>
            </div>

            {error ? (
                <p className="ccn-database__notice ccn-database__notice--error">{error}</p>
            ) : null}

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
                        <label htmlFor="ccn-search-date-from" className="ccn-database__search-label">From</label>
                        <input
                            type="date"
                            id="ccn-search-date-from"
                            className="ccn-database__search-input"
                            value={searchDraft.from}
                            max={searchDraft.to || undefined}
                            aria-invalid={Boolean(dateRangeError)}
                            aria-describedby={dateRangeError ? "ccn-search-date-error" : undefined}
                            onChange={(event) => updateSearchDraft("from", event.target.value)}
                        />
                    </div>

                    <div className="ccn-database__search-field">
                        <label htmlFor="ccn-search-date-to" className="ccn-database__search-label">To</label>
                        <input
                            type="date"
                            id="ccn-search-date-to"
                            className="ccn-database__search-input"
                            value={searchDraft.to}
                            min={searchDraft.from || undefined}
                            aria-invalid={Boolean(dateRangeError)}
                            aria-describedby={dateRangeError ? "ccn-search-date-error" : undefined}
                            onChange={(event) => updateSearchDraft("to", event.target.value)}
                        />
                    </div>

                    <div className="ccn-database__search-field">
                        <label htmlFor="ccn-search-awb" className="ccn-database__search-label">AWB</label>
                        <input
                            type="text"
                            id="ccn-search-awb"
                            className="ccn-database__search-input"
                            value={searchDraft.awb}
                            placeholder="Search AWB"
                            onChange={(event) => updateSearchDraft("awb", event.target.value)}
                        />
                    </div>

                    <div className="ccn-database__search-field">
                        <label htmlFor="ccn-search-ccn" className="ccn-database__search-label">CCN</label>
                        <input
                            type="text"
                            id="ccn-search-ccn"
                            className="ccn-database__search-input"
                            value={searchDraft.ccn}
                            placeholder="Search CCN"
                            onChange={(event) => updateSearchDraft("ccn", event.target.value)}
                        />
                    </div>

                    <div className="ccn-database__search-field">
                        <label htmlFor="ccn-search-status" className="ccn-database__search-label">Status</label>
                        <select
                            id="ccn-search-status"
                            className="ccn-database__search-input"
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
                        <label htmlFor="ccn-search-released_on" className="ccn-database__search-label">Released On</label>
                        <input
                            type="date"
                            id="ccn-search-released_on"
                            className="ccn-database__search-input"
                            value={searchDraft.released_on}
                            onChange={(event) => updateSearchDraft("released_on", event.target.value)}
                        />
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

            <div className="ccn-table-shell">
                <table className="ccn-table">
                    <thead>
                        <tr>
                            <th>CCN</th>
                            <th>AWB</th>
                            <th>Status</th>
                            <th>Created At</th>
                            <th>Released On</th>
                            <th>Comment</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading && data.length === 0 ? (
                            <tr>
                                <td className="ccn-table__empty" colSpan={6}>Loading CCN records...</td>
                            </tr>
                        ) : null}

                        {!loading && data.length === 0 ? (
                            <tr>
                                <td className="ccn-table__empty" colSpan={6}>{emptyTableMessage}</td>
                            </tr>
                        ) : null}

                        {data.map((ccn, index) => {
                            const status = normalizeStatus(ccn.status);

                            return (
                                <tr key={`${ccn.awb}-${ccn.ccn}-${ccn.created_at}-${index}`}>
                                    <td>{ccn.ccn}</td>
                                    <td>{ccn.awb}</td>
                                    <td>
                                        <span className={`ccn-status ${getStatusClassName(status)}`}>
                                            {status}
                                        </span>
                                    </td>
                                    <td>{formatDate(ccn.created_at)}</td>
                                    <td>{formatDate(ccn.released_on ?? undefined)}</td>
                                    <td>{ccn.comment}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            <footer className="ccn-database__footer">
                <span className="ccn-database__page-status">
                    Page {currentPage} of {totalPages}
                </span>
                <div className="ccn-database__pagination" aria-label="CCN table pagination">
                    <button
                        className="ccn-database__page-button"
                        type="button"
                        onClick={() => goToPage(currentPage - 1)}
                        disabled={loading || currentPage <= 1}
                    >
                        Previous
                    </button>
                    <button
                        className="ccn-database__page-button"
                        type="button"
                        onClick={() => goToPage(currentPage + 1)}
                        disabled={loading || currentPage >= totalPages}
                    >
                        Next
                    </button>
                </div>
            </footer>
        </section>
    );
}
