import { useCallback, useEffect, useMemo, useState } from "react";
import { isSupabaseConfigured, supabase } from "../../lib/supabase";
import type { Enums, Tables } from "../../../database.types";
import "./CCN_Database.css";

const ITEMS_PER_PAGE = 10;
const MISSING_SUPABASE_CONFIG_MESSAGE =
    "Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to the frontend environment.";

type Status = Enums<"ccn_status">;
type CcnRecord = Tables<"CCN_Registry">;

type CcnPage = {
    data: CcnRecord[];
    page: number;
    totalRows: number;
    totalPages: number;
};

type CcnSearchFilters = {
    from: string;
    to: string;
    awb: string;
    ccn: string;
    status: string;
};

const EMPTY_SEARCH_FILTERS: CcnSearchFilters = {
    from: "",
    to: "",
    awb: "",
    ccn: "",
    status: "",
};

function formatDate(value?: string) {
    const date = value?.split("T")[0];
    return date || "-";
}

function normalizeStatus(status?: string): Status {
    if (status === "Released" || status === "Exam" || status === "Rejected" || status === "Other") {
        return status;
    }

    return "Other";
}

function getStatusClassName(status: Status) {
    if (status === "Exam") {
        return "ccn-status--review";
    }

    return `ccn-status--${status.toLowerCase()}`;
}

function normalizeSearchFilters(filters: CcnSearchFilters): CcnSearchFilters {
    return {
        from: filters.from,
        to: filters.to,
        awb: filters.awb.trim(),
        ccn: filters.ccn.trim(),
        status: filters.status,
    };
}

function hasInvalidDateRange(filters: CcnSearchFilters) {
    return Boolean(filters.from && filters.to && filters.to < filters.from);
}

function hasSearchFilters(filters: CcnSearchFilters) {
    return Object.values(filters).some(Boolean);
}

function toUtcDateStart(value: string) {
    return `${value}T00:00:00.000Z`;
}

function addUtcDays(value: string, days: number) {
    const [year, month, day] = value.split("-").map(Number);
    const date = new Date(Date.UTC(year, month - 1, day + days));

    return date.toISOString().split("T")[0];
}

function getCcnErrorMessage(error: unknown) {
    if (error instanceof Error && error.message === MISSING_SUPABASE_CONFIG_MESSAGE) {
        return MISSING_SUPABASE_CONFIG_MESSAGE;
    }

    return "Unable to load CCN records right now.";
}

async function requestCcnData(page: number, filters: CcnSearchFilters = EMPTY_SEARCH_FILTERS): Promise<CcnPage> {
    if (!supabase) {
        throw new Error(MISSING_SUPABASE_CONFIG_MESSAGE);
    }

    const requestedPage = Math.max(page, 1);
    const fromRow = (requestedPage - 1) * ITEMS_PER_PAGE;
    const toRow = fromRow + ITEMS_PER_PAGE - 1;
    let query = supabase
        .from("CCN_Registry")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false });

    if (filters.from) {
        query = query.gte("created_at", toUtcDateStart(filters.from));
    }

    if (filters.to) {
        query = query.lt("created_at", toUtcDateStart(addUtcDays(filters.to, 1)));
    }

    if (filters.awb) {
        query = query.ilike("awb", `%${filters.awb}%`);
    }

    if (filters.ccn) {
        query = query.ilike("ccn", `%${filters.ccn}%`);
    }

    if (filters.status) {
        query = query.eq("status", filters.status as Status);
    }

    const { data, error, count } = await query.range(fromRow, toRow);

    if (error) {
        throw error;
    }

    const totalRows = count ?? data.length;
    const totalPages = Math.max(1, Math.ceil(totalRows / ITEMS_PER_PAGE));

    if (totalRows > 0 && requestedPage > totalPages) {
        return requestCcnData(totalPages, filters);
    }

    return {
        data,
        page: Math.min(requestedPage, totalPages),
        totalRows,
        totalPages,
    };
}

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

                <button
                    className="ccn-database__refresh"
                    type="button"
                    onClick={() => void fetchData(currentPage)}
                    disabled={loading || !isSupabaseConfigured}
                >
                    {loading ? "Refreshing" : "Refresh"}
                </button>
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
                            <th>Date</th>
                            <th>AWB</th>
                            <th>CCN</th>
                            <th>Status</th>
                            <th>Comment</th>
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
                                    <td>{formatDate(ccn.created_at)}</td>
                                    <td>{ccn.awb}</td>
                                    <td>{ccn.ccn}</td>
                                    <td>
                                        <span className={`ccn-status ${getStatusClassName(status)}`}>
                                            {status}
                                        </span>
                                    </td>
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
