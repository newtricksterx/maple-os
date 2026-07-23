import { useCallback, useEffect, useMemo, useState } from "react";
import { isSupabaseConfigured } from "../../lib/supabase";
import "./CCN_Database.css";
import type { CcnPage, CcnRecord, CcnSearchFilters } from "./CCN_Database.types";
import {
    formatDate,
    getCcnErrorMessage,
    getStatusClassName,
    hasInvalidDateRange,
    hasSearchFilters,
    normalizeSearchFilters,
    normalizeStatus,
    requestCcnData,
} from "./CCN_Database.helpers";
import { EMPTY_SEARCH_FILTERS } from "./CCN_Database.constants";
import { Dialog } from "radix-ui";

export function CCN_Database() {
    const [data, setData] = useState<CcnRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalRows, setTotalRows] = useState(0);
    const [searchDraft, setSearchDraft] = useState<CcnSearchFilters>(EMPTY_SEARCH_FILTERS);
    const [appliedSearch, setAppliedSearch] = useState<CcnSearchFilters>(EMPTY_SEARCH_FILTERS);
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
                    <Dialog.Root>
                        <Dialog.Trigger asChild>
                            <button
                                className="ccn-database__add"
                                type="button"
                                disabled={loading || !isSupabaseConfigured}
                            >
                                Add CCN Record
                            </button>
                        </Dialog.Trigger>
                        <Dialog.Overlay className="ccn-dialog__overlay" />
                        <Dialog.Content className="ccn-dialog">
                            <div className="ccn-dialog__header">
                                <div className="ccn-dialog__heading">
                                    <Dialog.Title className="ccn-dialog__title">
                                        Add CCN Record
                                    </Dialog.Title>
                                </div>
                                <Dialog.Close asChild>
                                    <button
                                        className="ccn-dialog__close"
                                        type="button"
                                        aria-label="Close dialog"
                                    >
                                        X
                                    </button>
                                </Dialog.Close>
                            </div>
                            
                            <div className="ccn-dialog__body">
                                <label className="ccn-database-add">
                                    <textarea
                                        placeholder="Enter CCNs..."
                                        className="ccn-database-textarea"
                                    />
                                </label>

                                <button
                                    className="ccn-database__search-button"
                                    type="submit"
                                    disabled={loading}
                                >
                                    Add CCNs
                                </button>
                            </div>


                        </Dialog.Content>
                    </Dialog.Root>
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
