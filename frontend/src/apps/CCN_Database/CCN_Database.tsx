import { useCallback, useEffect, useMemo, useState } from "react";
import { isSupabaseConfigured } from "../../lib/supabase";
import "./CCN_Database.css";
import type { CcnPage, CcnRecord, CcnSearchFilters, OperationType, Status } from "./CCN_Database.types";
import {
    addCcnRecord,
    CcnToCcnRecord,
    formatDate,
    getCcnErrorMessage,
    getStatusClassName,
    hasInvalidDateRange,
    hasSearchFilters,
    isAwbExist,
    normalizeSearchFilters,
    normalizeStatus,
    requestCcnData,
} from "./CCN_Database.helpers";
import { EMPTY_SEARCH_FILTERS } from "./CCN_Database.constants";
import { BaseCCNForm } from "./Components/BaseCCNForm";
import { OperationDialog } from "./Components/OperationDialog";

export function CCN_Database() {
    const [data, setData] = useState<CcnRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalRows, setTotalRows] = useState(0);
    const [searchDraft, setSearchDraft] = useState<CcnSearchFilters>(EMPTY_SEARCH_FILTERS);
    const [appliedSearch, setAppliedSearch] = useState<CcnSearchFilters>(EMPTY_SEARCH_FILTERS);

    const [stagedCcnRecords, setStagedCcnRecords] = useState<CcnRecord[]>([]);

    const [awbValue, setAwbValue] = useState("");
    const [ccnValue, setCcnValue] = useState("");
    const [operationType, setOperationType] = useState<OperationType | null>()

    const [addErrorMessage, setAddErrorMessage] = useState<string | null>(null);
    const [addSuccessMessage, setAddSuccessMessage] = useState<string | null>(null);


    const dateRangeError = hasInvalidDateRange(searchDraft)
        ? "To date cannot be before From date."
        : null;
    const hasAppliedSearch = hasSearchFilters(appliedSearch);
    const emptyTableMessage = hasAppliedSearch
        ? "No CCN found."
        : "No CCN records found.";

    const statusCounts = useMemo(() => {
        const counts = { released: 0, inReview: 0, rejected: 0, other: 0 };

        data.forEach((ccn) => {
            const status = normalizeStatus(ccn.status);

            if (status === "Released") {
                counts.released += 1;
            } else if (status === "Exam") {
                counts.inReview += 1;
            } else if (status === "Rejected") {
                counts.rejected += 1;
            } else {
                counts.other += 1;
            }
        });

        return counts;
    }, [data]);

    const applyCcnPage = useCallback((ccnPage: CcnPage) => {
        setData(ccnPage.data);
        setCurrentPage(ccnPage.page);
        setTotalPages(ccnPage.totalPages);
        setTotalRows(ccnPage.totalRows);
    }, []);

    const fetchData = useCallback(async (page = currentPage, filters = appliedSearch) => {
        setLoading(true);
        setError(null);

        try {
            const ccnPage = await requestCcnData(page, filters);
            applyCcnPage(ccnPage);
        } catch (error) {
            console.error("Error fetching data:", error);
            setError(getCcnErrorMessage(error));
        } finally {
            setLoading(false);
        }
    }, [appliedSearch, applyCcnPage, currentPage]);

    const goToPage = useCallback((page: number) => {
        const nextPage = Math.min(Math.max(page, 1), totalPages);

        if (loading || nextPage === currentPage) {
            return;
        }

        void fetchData(nextPage);
    }, [currentPage, fetchData, loading, totalPages]);

    const updateSearchDraft = useCallback((field: keyof CcnSearchFilters, value: string) => {
        setSearchDraft((currentSearch) => ({
            ...currentSearch,
            [field]: value,
        }));
    }, []);

    const handleStagedCcnChange = useCallback(async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        // 1. Extract data using FormData
        const formData = new FormData(event.currentTarget);
        const rawCcn = formData.get("ccn") as string || "";
        const rawAwb = formData.get("awb") as string || "";

        // 2. Process the strings
        const cleanCcnList = rawCcn.split(/\s+/).filter((ccn) => ccn !== "");
        const cleanAwbValue = rawAwb.trim();

        // check if awb exists in supabase
        if (operationType == "update") {
            // do stuff
            const exist = await isAwbExist(cleanAwbValue)

            if (!exist){
                console.log("awb does not exist")
                return 
            }
        }

        // 3. Update state
        setStagedCcnRecords(cleanCcnList.map((ccn) => CcnToCcnRecord(ccn, cleanAwbValue)));

    }, [operationType]);

    const handleCommentChange = useCallback((ccn: string, comment: string) => {
        setStagedCcnRecords((currentRecords) =>
            currentRecords.map((record) => {
                if (record.ccn === ccn) {
                    return { ...record, comment };
                }
                return record;
            })
        );
    }, []);

    const handleStatusChange = useCallback((ccn: string, status: Status) => {
        setStagedCcnRecords((currentRecords) =>
            currentRecords.map((record) => {
                if (record.ccn === ccn) {
                    return { ...record, status };
                }
                return record;
            })
        );
    }, []);
    
    const handleDateChange = useCallback((ccn: string, date: string) => {
        setStagedCcnRecords((currentRecords) =>
            currentRecords.map((record) => {
                if (record.ccn === ccn) {
                    return { ...record, created_at: date, updated_at: date };
                }
                return record;
            })
        );
    }, []);

    const handleResetForm = useCallback( () => {
        setStagedCcnRecords([]); 
        setAwbValue(""); 
        setCcnValue(""); 
        setAddErrorMessage(null);
        setAddSuccessMessage(null);
    }, [])

    const handleAddToDatabase = useCallback(async () => {
        if (stagedCcnRecords.length === 0) {
            return;
        }

        setAddErrorMessage(null);
        setAddSuccessMessage(null);

        for (const record of stagedCcnRecords) {
            try {
                await addCcnRecord(record);
            } catch (error) {
                console.error(`Error adding CCN record ${record.ccn}:`, error);
                setAddSuccessMessage(null);
                setAddErrorMessage(`CCN - ${record.ccn} ${getCcnErrorMessage(error)}`);
                return;
            }
        }

        setAddSuccessMessage(`Successfully added ${stagedCcnRecords.length} CCN${stagedCcnRecords.length === 1 ? "" : "s"} to the database.`);

    }, [stagedCcnRecords]);

    const applySearch = useCallback(() => {
        const nextSearch = normalizeSearchFilters(searchDraft);

        if (hasInvalidDateRange(nextSearch)) {
            return;
        }

        setSearchDraft(nextSearch);
        setAppliedSearch(nextSearch);
        setData([]);
        void fetchData(1, nextSearch);
    }, [fetchData, searchDraft]);

    useEffect(() => {
        let ignore = false;

        const fetchInitialData = async () => {
            try {
                const ccnPage = await requestCcnData(1);

                if (!ignore) {
                    applyCcnPage(ccnPage);
                }
            } catch (error) {
                console.error("Error fetching data:", error);

                if (!ignore) {
                    setError(getCcnErrorMessage(error));
                }
            } finally {
                if (!ignore) {
                    setLoading(false);
                }
            }
        };

        void fetchInitialData();

        return () => {
            ignore = true;
        };
    }, [applyCcnPage]);

    const stagedCcnList = () => {
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
                                <th>Created</th>
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
                                        <input 
                                            type="date" 
                                            value={formatDate(record.created_at)} 
                                            onChange={(e) => handleDateChange(record.ccn, formatDate(e.target.value))} />
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

                    {addErrorMessage ? (
                        <p className="ccn-database__notice ccn-database__notice--error">{addErrorMessage}</p>
                    ) : addSuccessMessage ? (
                        <p className="ccn-database__notice ccn-database__notice--success">{addSuccessMessage}</p>
                    ) : null}

                    <button
                        className="ccn-database__add-button"
                        type="button"
                        onClick={handleAddToDatabase}
                    >
                        Add to Database
                    </button>

                </footer>
            </div>
        );
    }

    return (
        <section className="ccn-database">
            <header className="ccn-database__header">
                <div className="ccn-database__heading">
                    <h1 className="ccn-database__title">CCN Database</h1>
                    <p className="ccn-database__subtitle">
                        {loading && data.length === 0
                            ? "Loading records..."
                            : `${totalRows} ${totalRows === 1 ? "record" : "records"} across ${totalPages} ${totalPages === 1 ? "page" : "pages"}`}
                    </p>
                </div>

                <div className="ccn-database__actions">
                    <OperationDialog 
                        title="Update CCN Records"
                        disabled={loading || !isSupabaseConfigured}
                        stagedCcnRecords={stagedCcnRecords}
                        listElement={stagedCcnList()}
                        formElement={<BaseCCNForm 
                                        awbValue={awbValue} 
                                        ccnValue={ccnValue} 
                                        disabled={loading || awbValue.length === 0 || ccnValue.length === 0}   
                                        handleStagedCcnChange={handleStagedCcnChange}
                                        handleAwbChange={setAwbValue}
                                        handleCcnChange={setCcnValue}
                                        handleResetForm={handleResetForm}/>}
                        setOperationType={() => {setOperationType("update")}}
                    />


                    <OperationDialog 
                        title="Add CCN Records"
                        disabled={loading || !isSupabaseConfigured}
                        stagedCcnRecords={stagedCcnRecords}
                        listElement={stagedCcnList()}
                        formElement={<BaseCCNForm 
                                        awbValue={awbValue} 
                                        ccnValue={ccnValue} 
                                        disabled={loading || awbValue.length === 0 || ccnValue.length === 0}   
                                        handleStagedCcnChange={handleStagedCcnChange}
                                        handleAwbChange={setAwbValue}
                                        handleCcnChange={setCcnValue}
                                        handleResetForm={handleResetForm}/>}
                        setOperationType={() => {setOperationType("add")}}
                    />
                </div>
            </header>

            <div className="ccn-database__stats" aria-label="CCN status summary">
                <div className="ccn-stat">
                    <span className="ccn-stat__label">Exam</span>
                    <span className="ccn-stat__value">{statusCounts.inReview}</span>
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
                <div className="ccn-database__search-field">
                    <label htmlFor="ccn-search-date-from" className="ccn-database__search-label">From:</label>
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
                    <label htmlFor="ccn-search-date-to" className="ccn-database__search-label">To:</label>
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
                    <label htmlFor="ccn-search-awb" className="ccn-database__search-label">AWB:</label>
                    <input
                        type="text"
                        id="ccn-search-awb"
                        className="ccn-database__search-input"
                        value={searchDraft.awb}
                        onChange={(event) => updateSearchDraft("awb", event.target.value)}
                    />
                </div>

                <div className="ccn-database__search-field">
                    <label htmlFor="ccn-search-ccn" className="ccn-database__search-label">CCN:</label>
                    <input
                        type="text"
                        id="ccn-search-ccn"
                        className="ccn-database__search-input"
                        value={searchDraft.ccn}
                        onChange={(event) => updateSearchDraft("ccn", event.target.value)}
                    />
                </div>

                <div className="ccn-database__search-field">
                    <label htmlFor="ccn-search-status" className="ccn-database__search-label">Status:</label>
                    <select
                        id="ccn-search-status"
                        className="ccn-database__search-input"
                        value={searchDraft.status}
                        onChange={(event) => updateSearchDraft("status", event.target.value)}
                    >
                        <option value="">All</option>
                        <option value="Released">Released</option>
                        <option value="Exam">Exam</option>
                        <option value="Rejected">Rejected</option>
                        <option value="Other">Other</option>
                    </select>
                </div>

                <button
                    className="ccn-database__search-button"
                    type="submit"
                    disabled={loading || Boolean(dateRangeError) || !isSupabaseConfigured}
                >
                    {loading ? "Applying" : "Apply"}
                </button>

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
                            <th>Comment</th>
                            <th>Created At</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading && data.length === 0 ? (
                            <tr>
                                <td className="ccn-table__empty" colSpan={5}>Loading CCN records...</td>
                            </tr>
                        ) : null}

                        {!loading && data.length === 0 ? (
                            <tr>
                                <td className="ccn-table__empty" colSpan={5}>{emptyTableMessage}</td>
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
                                    <td>{ccn.comment}</td>
                                    <td>{formatDate(ccn.created_at)}</td>
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
