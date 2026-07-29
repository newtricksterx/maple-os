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
    updateCcnRecords,
    dataToHashMap,
    getCCNData,
    isCcnsExist,
    CcnListToString,
} from "./CCN_Database.helpers";
import { EMPTY_SEARCH_FILTERS } from "./CCN_Database.constants";
import { BaseCCNForm } from "./Components/BaseCCNForm";
import { OperationDialog } from "./Components/OperationDialog";
import { BaseStagedCCNsList } from "./Components/BaseStagedCCNsList";
import { ExitIcon } from "@radix-ui/react-icons";


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
    const [operationType, setOperationType] = useState<OperationType | null>();

    const [errorMessage, setErrorMessage] = useState<string | null>(null);
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

        setErrorMessage(null);
        setAddSuccessMessage(null);
        setLoading(true);
        

        try {
            const cleanCcnList = ccnValue.split(/\s+/).filter((ccn) => ccn !== "");
            const cleanAwbValue = awbValue.trim();

            if (cleanCcnList.length === 0) {
                setErrorMessage("Please enter at least one CCN.");
                return;
            }

            if (!cleanAwbValue) {
                setErrorMessage("Please enter an AWB.");
                return;
            }

            if (operationType === "update") {
                const awbExist = await isAwbExist(cleanAwbValue);

                if (!awbExist) {
                    setErrorMessage(`AWB - ${cleanAwbValue} does not exist in the database. Please enter a valid AWB.`);
                    return;
                }

                const ccns = await Promise.all(
                    cleanCcnList.map((ccn) => getCCNData(ccn, cleanAwbValue))
                );

                setStagedCcnRecords(
                    ccns.map((record) => ({
                        ...record,
                        awb: cleanAwbValue,
                        status: normalizeStatus("Released"),
                        comment: record.comment ?? "",
                        released_on: new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })
                    }))
                );

                return;
            }

            
            const matchedCcns = await isCcnsExist(cleanCcnList);

            if (matchedCcns.length > 0) {
                setErrorMessage(`CCNs - ${CcnListToString(matchedCcns)} already exist in the database. Please enter a new CCN.`);
                return;
            }
            

            setStagedCcnRecords(cleanCcnList.map((ccn) => CcnToCcnRecord(ccn, cleanAwbValue)));
        } catch (error) {
            console.error("Error staging CCN records:", error);
            setErrorMessage(getCcnErrorMessage(error));
        } finally {
            setLoading(false);
        }
    }, [awbValue, ccnValue, operationType]);

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
                    if (status === "Released"){
                        record.released_on = new Date().toLocaleString('en-US', { timeZone: 'America/New_York' });
                    }
                    else {
                        record.released_on = null
                    }

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
        setErrorMessage(null);
        setAddSuccessMessage(null);
    }, [])

    const handleDatabaseOperation = useCallback(async () => {
        if (stagedCcnRecords.length === 0) {
            return;
        }

        setErrorMessage(null);
        setAddSuccessMessage(null);

        if (operationType === "update") {

            try {
                await updateCcnRecords(stagedCcnRecords);
            } catch (error) {
                console.error(`Error updating CCN record`, error);
                setAddSuccessMessage(null);
                setErrorMessage(`${getCcnErrorMessage(error)}`);
                return;
            }
            

            setAddSuccessMessage(`Successfully updated ${stagedCcnRecords.length} CCN${stagedCcnRecords.length === 1 ? "" : "s"} in the database.`);
            return;
        }

        for (const record of stagedCcnRecords) {
            try {
                await addCcnRecord(record);
            } catch (error) {
                console.error(`Error adding CCN record ${record.ccn}:`, error);
                setAddSuccessMessage(null);
                setErrorMessage(`CCN - ${record.ccn} ${getCcnErrorMessage(error)}`);
                return;
            }
        }

        setAddSuccessMessage(`Successfully added ${stagedCcnRecords.length} CCN${stagedCcnRecords.length === 1 ? "" : "s"} to the database.`);

    }, [operationType, stagedCcnRecords]);

    const escapeCsvField = (value: string): string => {
        // Detect values that Excel/WPS will misinterpret as numbers
        // (leading zeros, plain integers/decimals, scientific notation, etc.)
        const looksNumeric = /^[+-]?\d+(\.\d+)?$/.test(value) || /^0\d+/.test(value);

        const escaped = value.replace(/"/g, '""');

        if (looksNumeric) {
            // Force Excel/WPS to treat it as literal text, avoids the
            // "number stored as text" warning and leading apostrophe
            return `="${escaped}"`;
        }

        // Standard CSV quoting for anything with commas, quotes, or newlines
        return /[",\r\n]/.test(value) ? `"${escaped}"` : escaped;
    };

    const handleExportData = useCallback(() => {
        const mappedData = dataToHashMap(data);

        const rows: string[] = [];

        mappedData.forEach((values, key) => {
            rows.push(escapeCsvField(key));
            values.forEach((value) => rows.push(escapeCsvField(value)));
            rows.push("");
        });

        const csvContent = "\uFEFF" + rows.join("\r\n"); // BOM helps WPS/Excel detect UTF-8 correctly
        const file = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(file);
        const link = document.createElement("a");

        link.href = url;
        link.download = "ccn-export.csv";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }, [data]);


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

    const clearSearch = useCallback(() => {
        const clearedSearch = normalizeSearchFilters(EMPTY_SEARCH_FILTERS);

        setSearchDraft(clearedSearch);
        setAppliedSearch(clearedSearch);
    }, []);

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
                    <button className="ccn-database__export" title="Export Data Shown" disabled={!data} onClick={handleExportData}>
                        <ExitIcon />
                        Export
                    </button>

                    <OperationDialog 
                        title="Update CCN Records"
                        disabled={loading || !isSupabaseConfigured}
                        stagedCcnRecords={stagedCcnRecords}
                        renderList={ () => (<BaseStagedCCNsList
                                            stagedCcnRecords={stagedCcnRecords}
                                            handleStatusChange={handleStatusChange}
                                            handleCommentChange={handleCommentChange}
                                            handleDateChange={handleDateChange}
                                            handleResetForm={handleResetForm}
                                            handleSubmit={handleDatabaseOperation}
                                            submitButtonText="Update to Database"
                                            operationType="update"
                                            errorMessage={errorMessage}
                                            successMessage={addSuccessMessage}
                                        />)}
                        renderForm={ () => (<BaseCCNForm 
                                        awbValue={awbValue} 
                                        ccnValue={ccnValue} 
                                        disabled={loading || awbValue.length === 0 || ccnValue.length === 0}   
                                        handleStagedCcnChange={handleStagedCcnChange}
                                        handleAwbChange={setAwbValue}
                                        handleCcnChange={setCcnValue}
                                        handleResetForm={handleResetForm}
                                        errorMessage={errorMessage}
                                    />)}
                        setOperationType={() => {setOperationType("update")}}
                        handleResetForm={handleResetForm}
                    />


                    <OperationDialog 
                        title="Add CCN Records"
                        disabled={loading || !isSupabaseConfigured}
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
                                            errorMessage={errorMessage}
                                            successMessage={addSuccessMessage}
                                        />)}
                        renderForm={() => (<BaseCCNForm 
                                        awbValue={awbValue} 
                                        ccnValue={ccnValue} 
                                        disabled={loading || awbValue.length === 0 || ccnValue.length === 0}   
                                        handleStagedCcnChange={handleStagedCcnChange}
                                        handleAwbChange={setAwbValue}
                                        handleCcnChange={setCcnValue}
                                        handleResetForm={handleResetForm}
                                        errorMessage={errorMessage}/>)}
                        setOperationType={() => {setOperationType("add")}}
                        handleResetForm={handleResetForm}
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
                            <option value="Rejected">Rejected</option>
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
