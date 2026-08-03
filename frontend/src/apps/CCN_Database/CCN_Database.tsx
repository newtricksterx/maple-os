import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { isSupabaseConfigured, supabase } from "../../lib/supabase";
import "./CCN_Database.css";
import type { CcnRecord, CcnSearchFilters, OperationType, Status } from "./CCN_Database.types";
import {
    formatDate,
    getCcnErrorMessage,
    getStatusClassName,
    hasInvalidDateRange,
    hasSearchFilters,
    normalizeSearchFilters,
    normalizeStatus,
} from "./CCN_Database.helpers";
import { EMPTY_SEARCH_FILTERS, ITEMS_PER_PAGE } from "./CCN_Database.constants";
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
    const [currentIndex, setCurrentIndex] = useState(0);

    const [refreshToggle, setRefreshToggle] = useState(false);


    const [searchDraft, setSearchDraft] = useState<CcnSearchFilters>(EMPTY_SEARCH_FILTERS);
    const [appliedSearch, setAppliedSearch] = useState<CcnSearchFilters>(EMPTY_SEARCH_FILTERS);

    const [stagedCcnRecords, setStagedCcnRecords] = useState<CcnRecord[]>([]);

    const [awbValue, setAwbValue] = useState("");
    const [ccnValue, setCcnValue] = useState("");
    const [operationType, setOperationType] = useState<OperationType>("add");

    const [addSuccessMessage, setAddSuccessMessage] = useState<string | null>(null);

    const [operationError, setOperationError] = useState<string | null>(null)
    const [operationLoading, setOperationLoading] = useState(false)

    const uniqueId = useId();
    const channelId = useRef(`ccn_registry_changes_${uniqueId}`)

    const dateRangeError = hasInvalidDateRange(searchDraft)
        ? "To date cannot be before From date."
        : null;
    const hasAppliedSearch = hasSearchFilters(appliedSearch);
    const emptyTableMessage = hasAppliedSearch
        ? "No CCN found."
        : "No CCN records found.";

    const { data, loading, error } = useFetchData({
        filters: appliedSearch,
        refreshToggle: refreshToggle
    });

    useEffect(() => {
        if (!isSupabaseConfigured || !supabase) return;

        const client = supabase; // narrowed to non-null, stays that way

        const channel = client
        .channel(channelId.current)
        .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "CCN_Registry" },
            () => {
                setRefreshToggle((prev) => !prev);
            }
        )
        .subscribe();

        return () => {
            client.removeChannel(channel);
        };
    }, []);

    const totalRows = useMemo(() => data.length, [data]);
    const totalPages = useMemo(() => Math.max(Math.ceil(totalRows / ITEMS_PER_PAGE), 1), [totalRows]);

    const statusCounts = useMemo(() => {
        const counts = { released: 0, exam: 0, ccn_not_on_file: 0, rejected: 0, other: 0 };

        data.forEach((ccn) => {
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
    }, [data]);

    const goToPage = useCallback((page: number) => {
        setCurrentPage((current) => {
            const nextPage = Math.min(Math.max(page, 1), totalPages);
            setCurrentIndex(() => {
                const nextIndex = (nextPage - 1) * ITEMS_PER_PAGE;
                return nextIndex;
            });
            return loading || nextPage === current ? current : nextPage;
        });
    }, [loading, totalPages]);

    const applySearch = useCallback(() => {
        const nextSearch = normalizeSearchFilters(searchDraft);
        if (hasInvalidDateRange(nextSearch)) return;

        setSearchDraft(nextSearch);
        setAppliedSearch(nextSearch);
        goToPage(1)
    }, [goToPage, searchDraft]);

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
        setOperationLoading(true);

        try {
            const response = await saveCcnRecords(stagedCcnRecords);
            setAddSuccessMessage(response.successMessage);
        } catch (error) {
            console.log("Error Attempting Operation: ", error);
            setOperationError(getCcnErrorMessage(error));
        } finally {
            setOperationLoading(false);
            setRefreshToggle((prev) => !prev);
            goToPage(1)
        }

        
    }, [goToPage, stagedCcnRecords]);

    const clearSearch = useCallback(() => {
        const clearedSearch = normalizeSearchFilters(EMPTY_SEARCH_FILTERS);

        setSearchDraft(clearedSearch);
        setAppliedSearch(clearedSearch);
        goToPage(1);
    }, [goToPage]);

    const handleExport = useCallback(async () => {
        try {
            const { data: allMatchingRows } = await requestCcnData(appliedSearch);
            exportData(allMatchingRows, appliedSearch.status as Status);
        } catch (err) {
            setOperationError(getCcnErrorMessage(err));
        }
    }, [appliedSearch]);

    const switchOperationType = useCallback((type: OperationType) => {
        setOperationType((current) => {
            if (current !== type) {
                setStagedCcnRecords([]);
                setAwbValue("");
                setCcnValue("");
                setOperationError(null);
                setAddSuccessMessage(null);
            }
            return type;
        });
    }, []);

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
                        disabled={loading || operationLoading || !isSupabaseConfigured}
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
                        setOperationType={() => {switchOperationType("update")}}
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
                        setOperationType={() => {switchOperationType("add")}}
                        handleResetForm={handleResetForm}
                    />
                </div>
            </header>

            <div className="ccn-database__stats" aria-label="CCN status summary">
                <div className="ccn-stat bg-[rgba(245,185,85,0.12)]">
                    <span className="ccn-stat__label text-[#f5c76b]">Exam</span>
                    <span className="ccn-stat__value">{statusCounts.exam}</span>
                </div>
                <div className="ccn-stat bg-[rgba(172,169,42,0.12)]">
                    <span className="ccn-stat__label text-[#fff45d]">CCN not on file</span>
                    <span className="ccn-stat__value">{statusCounts.ccn_not_on_file}</span>
                </div>
                <div className="ccn-stat bg-[rgba(255,107,107,0.12)]">
                    <span className="ccn-stat__label text-[#ff9a9a]">Rejected</span>
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
                            autoComplete="off"
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
                            autoComplete="off"
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
                        <label htmlFor="ccn-search-updated_at" className="ccn-database__search-label">Updated at</label>
                        <input
                            type="date"
                            id="ccn-search-updated_at"
                            className="ccn-database__search-input"
                            value={searchDraft.updated_at}
                            onChange={(event) => updateSearchDraft("updated_at", event.target.value)}
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
                            <th>Updated At</th>
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

                        {data.slice(currentIndex, currentIndex + ITEMS_PER_PAGE).map((ccn, index) => {
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
                                    <td>{formatDate(ccn.updated_at)}</td>
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
