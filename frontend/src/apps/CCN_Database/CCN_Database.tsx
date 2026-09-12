import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { isSupabaseConfigured, supabase } from "../../lib/supabase";
import "./CCN_Database.css";
import type { CcnRecord, CcnSearchFilters, OperationType, Status, ToastState, ToastType } from "./CCN_Database.types";
import {
    getCcnErrorMessage,
    hasInvalidDateRange,
    normalizeSearchFilters,
    normalizeStatus,
} from "./CCN_Database.helpers";
import { EMPTY_SEARCH_FILTERS, ITEMS_PER_PAGE } from "./CCN_Database.constants";
import { BaseCCNForm } from "./ccn-database-components/BaseCCNForm";
import { OperationDialog } from "./ccn-database-components/OperationDialog";
import { BaseStagedCCNsList } from "./ccn-database-components/BaseStagedCCNsList/BaseStagedCCNsList";
import { ExitIcon } from "@radix-ui/react-icons";
import { stageCcnRecords } from "./ccn-database-services/stageService";
import { saveCcnRecords } from "./ccn-database-services/saveService";
import { useFetchData } from "./ccn-database-hooks/useFetchData";
import { SearchForm } from "./ccn-database-components/SearchForm/SearchForm";
import { DatabaseTable } from "./ccn-database-components/DatabaseTable/DatabaseTable";
import ToastMessage from "../../components/ToastMessage/ToastMessage";


export function CCN_Database() {
    const [currentPage, setCurrentPage] = useState(1);

    const [toast, setToast] = useState<ToastState>({
        open: false,
        type: "info",
        title: "",
        message: "",
    });

    const [refreshVersion, setRefreshVersion] = useState(0);
    const [exportLoading, setExportLoading] = useState(false);

    const [searchDraft, setSearchDraft] = useState<CcnSearchFilters>(EMPTY_SEARCH_FILTERS);
    const [appliedSearch, setAppliedSearch] = useState<CcnSearchFilters>(EMPTY_SEARCH_FILTERS);

    const [stagedCcnRecords, setStagedCcnRecords] = useState<CcnRecord[]>([]);

    const [awbValue, setAwbValue] = useState("");
    const [ccnValue, setCcnValue] = useState("");
    const [operationType, setOperationType] = useState<OperationType>("INSERT");

    const [operationLoading, setOperationLoading] = useState(false)

    const uniqueId = useId();
    const channelId = useRef(`ccn_registry_changes_${uniqueId}`)
    const refreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastRefreshAtRef = useRef(0);

    const refreshData = useCallback(() => {
        if (refreshTimeoutRef.current !== null) {
            clearTimeout(refreshTimeoutRef.current);
            refreshTimeoutRef.current = null;
        }

        lastRefreshAtRef.current = Date.now();
        setRefreshVersion((version) => version + 1);
    }, []);

    const queueRealtimeRefresh = useCallback(() => {
        // A bulk save emits one Postgres event per affected row. Refresh once after
        // the burst instead of issuing a full query for every individual event.
        if (Date.now() - lastRefreshAtRef.current < 500) return;

        if (refreshTimeoutRef.current !== null) {
            clearTimeout(refreshTimeoutRef.current);
        }

        refreshTimeoutRef.current = setTimeout(() => {
            refreshTimeoutRef.current = null;
            refreshData();
        }, 250);
    }, [refreshData]);

    const dateRangeError = hasInvalidDateRange(searchDraft)
        ? "To date cannot be before From date."
        : null;

    const { data, loading, error } = useFetchData({
        filters: appliedSearch,
        refreshVersion,
    });

    useEffect(() => {
        if (!isSupabaseConfigured || !supabase) return;

        const client = supabase; 

        const channel = client
        .channel(channelId.current)
        .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "CCN_Registry" },
            queueRealtimeRefresh
        )
        .subscribe();

        return () => {
            if (refreshTimeoutRef.current !== null) {
                clearTimeout(refreshTimeoutRef.current);
            }
            client.removeChannel(channel);
        };
    }, [queueRealtimeRefresh]);

    const totalRows = useMemo(() => data.length, [data]);
    const totalPages = useMemo(() => Math.max(Math.ceil(totalRows / ITEMS_PER_PAGE), 1), [totalRows]);
    const displayedPage = Math.min(currentPage, totalPages);
    const currentIndex = (displayedPage - 1) * ITEMS_PER_PAGE;

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

    const showToast = useCallback((
        type: ToastType,
        title: string,
        message: string
    ) => {
        setToast({
            open: true,
            type,
            title,
            message,
        });
    }, []);

    const goToPage = useCallback((page: number) => {
        if (loading) return;

        setCurrentPage((current) => {
            const nextPage = Math.min(Math.max(page, 1), totalPages);
            return nextPage === current ? current : nextPage;
        });
    }, [loading, totalPages]);

    const applySearchFilters = useCallback(() => {
        const nextSearch = normalizeSearchFilters(searchDraft);
        if (hasInvalidDateRange(nextSearch)) return;

        setSearchDraft(nextSearch);
        setAppliedSearch(nextSearch);
        goToPage(1)
    }, [goToPage, searchDraft]);

    const updateSearchDraftFilters = useCallback(<K extends keyof CcnSearchFilters>(
        field: K, 
        value: CcnSearchFilters[K]
    ) => {

        setSearchDraft((currentSearch) => ({
            ...currentSearch,
            [field]: value,
        }));
    }, []);


    const updateSearchDateRangeDraft = useCallback(
        (field: "created_at" | "updated_at", subfield: "from" | "to", value: string) => {
            setSearchDraft((currentSearch) => ({
                ...currentSearch,
                [field]: {
                    ...currentSearch[field],
                    [subfield]: value,
                },
            }));
        },
        []
    );

    const formStagedCcnChange = useCallback(async (event: React.SubmitEvent) => {
        event.preventDefault();

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

            const errorMessage = getCcnErrorMessage(error);

            showToast(
                "error",
                "Error",
                errorMessage
            );
        } finally {
            setOperationLoading(false);
        }
    }, [awbValue, ccnValue, operationType, showToast]);

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

    const ccnCommentChange = useCallback(
        (ccn: string, comment: string) => {
            updateStagedRecord(ccn, (record) => ({ ...record, comment }));
        },
        [updateStagedRecord]
    );

    const ccnStatusChange = useCallback(
        (ccn: string, status: Status) => {
            updateStagedRecord(ccn, (record) => ({
                ...record,
                status,
            }));
        },
        [updateStagedRecord]
    );

    const ccnDateChange = useCallback(
        (ccn: string, date: string) => {
            updateStagedRecord(ccn, (record) => ({
                ...record,
                created_at: date,
                updated_at: date,
            }));
        },
        [updateStagedRecord]
    );

    const resetCcnStagingForm = useCallback(() => {
        setStagedCcnRecords([]); 
        setAwbValue(""); 
        setCcnValue(""); 
    }, [])

    const executeDatabaseOperation = useCallback(async () => {
        if (operationLoading || stagedCcnRecords.length === 0) {
            return;
        }

        setOperationLoading(true);

        try {
            const response = await saveCcnRecords(stagedCcnRecords);

            showToast(
                "success",
                "Success",
                response.successMessage ?? "Operation completed successfully."
            );

            resetCcnStagingForm();
            refreshData();
            goToPage(1);
        } catch (error) {
            console.error("Error attempting operation:", error);

            const errorMessage = getCcnErrorMessage(error);

            showToast(
                "error",
                "Error",
                errorMessage
            );
        } finally {
            setOperationLoading(false);
        }
    }, [stagedCcnRecords, operationLoading, showToast, resetCcnStagingForm, refreshData, goToPage]);

    const clearSearchFilters = useCallback(() => {
        const clearedSearch = normalizeSearchFilters(EMPTY_SEARCH_FILTERS);

        setSearchDraft(clearedSearch);
        setAppliedSearch(clearedSearch);
        goToPage(1);
    }, [goToPage]);

    const exportCCNDatabase = useCallback(async () => {
        if (exportLoading || !isSupabaseConfigured) return;

        setExportLoading(true);

        try {
            const { exportData } = await import("./ccn-database-services/exportService");
            exportData(data, appliedSearch.status as Status[]);
        } catch (error) {
            const errorMessage = getCcnErrorMessage(error);

            showToast("error", "Error", errorMessage);
        } finally {
            setExportLoading(false);
        }
    }, [appliedSearch, data, exportLoading, showToast]);

    const switchOperationType = useCallback((type: OperationType) => {
        setOperationType((current) => {
            if (current !== type) {
                setStagedCcnRecords([]);
                setAwbValue("");
                setCcnValue("");
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
                    <button
                        className="ccn-database__export"
                        title="Export matching data"
                        disabled={loading || exportLoading || !data.length || !isSupabaseConfigured}
                        aria-busy={exportLoading}
                        onClick={exportCCNDatabase}
                    >
                        <ExitIcon />
                        Export
                    </button>

                    <OperationDialog 
                        title="Update CCN Records"
                        disabled={loading || operationLoading || !isSupabaseConfigured}
                        stagedCcnRecords={stagedCcnRecords}
                        renderList={ () => (<BaseStagedCCNsList
                                            stagedCcnRecords={stagedCcnRecords}
                                            handleStatusChange={(ccnStatusChange)}
                                            handleCommentChange={ccnCommentChange}
                                            handleDateChange={ccnDateChange}
                                            handleResetForm={resetCcnStagingForm}
                                            handleSubmit={executeDatabaseOperation}
                                            loading={operationLoading}
                                            submitButtonText="Update to Database"
                                            operationType="UPDATE"
                                        />)}
                        renderForm={ () => (<BaseCCNForm 
                                        awbValue={awbValue} 
                                        ccnValue={ccnValue} 
                                        loading={operationLoading}  
                                        operationType="UPDATE" 
                                        handleStagedCcnChange={formStagedCcnChange}
                                        handleAwbChange={setAwbValue}
                                        handleCcnChange={setCcnValue}
                                        handleResetForm={resetCcnStagingForm}
                                    />)}
                        setOperationType={() => {switchOperationType("UPDATE")}}
                        handleResetForm={resetCcnStagingForm}
                    />


                    <OperationDialog 
                        title="Add CCN Records"
                        disabled={loading || operationLoading || !isSupabaseConfigured}
                        stagedCcnRecords={stagedCcnRecords}
                        renderList={() => (<BaseStagedCCNsList
                                            stagedCcnRecords={stagedCcnRecords}
                                            handleStatusChange={ccnStatusChange}
                                            handleCommentChange={ccnCommentChange}
                                            handleDateChange={ccnDateChange}
                                            handleResetForm={resetCcnStagingForm}
                                            handleSubmit={executeDatabaseOperation}
                                            loading={operationLoading}
                                            submitButtonText="Add to Database"
                                            operationType="INSERT"
                                        />)}
                        renderForm={() => (<BaseCCNForm 
                                        awbValue={awbValue} 
                                        ccnValue={ccnValue} 
                                        loading={operationLoading}  
                                        operationType="INSERT" 
                                        handleStagedCcnChange={formStagedCcnChange}
                                        handleAwbChange={setAwbValue}
                                        handleCcnChange={setCcnValue}
                                        handleResetForm={resetCcnStagingForm}
                                        />)}
                        setOperationType={() => {switchOperationType("INSERT")}}
                        handleResetForm={resetCcnStagingForm}
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
                <p className="ccn-database__notice ccn-database__notice--error" role="alert">{error}</p>
            ) : null}

            <SearchForm
                searchDraft={searchDraft}
                updateSearchDraft={updateSearchDraftFilters}
                updateDateRangeDraft={updateSearchDateRangeDraft}
                applySearch={applySearchFilters}
                clearSearch={clearSearchFilters}
                appliedSearch={appliedSearch}
                loading={loading}
                dateRangeError={dateRangeError}
                isSupabaseConfigured={isSupabaseConfigured}
            />

            <DatabaseTable
                data={data}
                loading={loading}
                currentIndex={currentIndex}
                currentPage={displayedPage}
                totalPages={totalPages}
                goToPage={goToPage}
            />

            <ToastMessage
                open={toast.open}
                onOpenChange={(open) =>
                    setToast((current) => ({
                        ...current,
                        open,
                    }))
                }
                type={toast.type}
                title={toast.title}
                message={toast.message}
            />
        </section>
    );
}
