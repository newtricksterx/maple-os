import { useCallback, useEffect, useMemo, useState } from "react";
import "./CCN_Database.css";

const SHEETS_URL = "https://script.google.com/macros/s/AKfycby7QKhpd84oAguie_Uf6U1at2IcGPl9vf8c1VyRXakbPouNHeKFPx-nuuUAHkUblbTN/exec";

const ITEMS_PER_PAGE = 10;

type Status = "Released" | "Exam" | "Rejected" | "Other";

type CCN_Instance = {
    AWB?: string;
    CCN?: string;
    DATE?: string;
    STATUS?: string;
    COMMENT?: string;
};

type CcnPage = {
    data: CCN_Instance[];
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

function toNumber(value: unknown, fallback: number) {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? number : fallback;
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

function addSearchParams(url: URL, filters: CcnSearchFilters) {
    if (filters.from) {
        url.searchParams.set("from", filters.from);
    }

    if (filters.to) {
        url.searchParams.set("to", filters.to);
    }

    if (filters.awb) {
        url.searchParams.set("awb", filters.awb);
    }

    if (filters.ccn) {
        url.searchParams.set("ccn", filters.ccn);
    }

    if (filters.status) {
        url.searchParams.set("status", filters.status);
    }
}

function parseCcnPageResponse(jsonData: unknown, requestedPage: number): CcnPage {
    if (Array.isArray(jsonData)) {
        return {
            data: jsonData,
            page: requestedPage,
            totalRows: jsonData.length,
            totalPages: 1,
        };
    }

    if (jsonData && typeof jsonData === "object") {
        const response = jsonData as Record<string, unknown>;
        const data = Array.isArray(response.data) ? response.data : [];
        const page = toNumber(response.page, requestedPage);
        const limit = toNumber(response.limit, ITEMS_PER_PAGE);
        const totalRows = toNumber(response.totalRows ?? response.total ?? data.length, data.length);
        const totalPages = toNumber(response.totalPages, Math.max(1, Math.ceil(totalRows / limit)));

        return { data, page, totalRows, totalPages };
    }

    return {
        data: [],
        page: requestedPage,
        totalRows: 0,
        totalPages: 1,
    };
}

async function requestCcnData(page: number, filters: CcnSearchFilters = EMPTY_SEARCH_FILTERS) {
    const url = new URL(SHEETS_URL);
    url.searchParams.set("page", String(page));
    url.searchParams.set("limit", String(ITEMS_PER_PAGE));
    addSearchParams(url, filters);

    const response = await fetch(url.toString(), {
        method: "GET",
        redirect: "follow",
    });

    if (!response.ok) {
        throw new Error(`Request failed with ${response.status}`);
    }

    const jsonData = await response.json();
    return parseCcnPageResponse(jsonData, page);
}

export function CCN_Database() {
    const [data, setData] = useState<CCN_Instance[]>([]);
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
            const status = normalizeStatus(ccn.STATUS);

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
            setError("Unable to load CCN records right now.");
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
                    setError("Unable to load CCN records right now.");
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
                    disabled={loading}
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
                    disabled={loading || Boolean(dateRangeError)}
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
                            const status = normalizeStatus(ccn.STATUS);

                            return (
                                <tr key={`${ccn.AWB}-${ccn.CCN}-${index}`}>
                                    <td>{formatDate(ccn.DATE)}</td>
                                    <td>{ccn.AWB}</td>
                                    <td>{ccn.CCN}</td>
                                    <td>
                                        <span className={`ccn-status ${getStatusClassName(status)}`}>
                                            {status}
                                        </span>
                                    </td>
                                    <td>{ccn.COMMENT}</td>
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
