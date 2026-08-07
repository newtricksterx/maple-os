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
import { BaseCCNForm } from "./components/BaseCCNForm";
import { OperationDialog } from "./components/OperationDialog";
import { BaseStagedCCNsList } from "./components/BaseStagedCCNsList/BaseStagedCCNsList";
import { ExitIcon } from "@radix-ui/react-icons";
import { stageCcnRecords } from "./services/stageService";
import { saveCcnRecords } from "./services/saveService";
import { requestCcnData, useFetchData } from "./hooks/useFetchData";
import { SearchForm } from "./components/SearchForm/SearchForm";
import { DatabaseTable } from "./components/DatabaseTable/DatabaseTable";
import ToastMessage from "../../components/ToastMessage/ToastMessage";


export function CCN_Database() {
    const [currentPage, setCurrentPage] = useState(1);
    const [currentIndex, setCurrentIndex] = useState(0);

    const [toast, setToast] = useState<ToastState>({
        open: false,
        type: "info",
        title: "",
        message: "",
    });

    const [refreshToggle, setRefreshToggle] = useState(false);

    const [searchDraft, setSearchDraft] = useState<CcnSearchFilters>(EMPTY_SEARCH_FILTERS);
    const [appliedSearch, setAppliedSearch] = useState<CcnSearchFilters>(EMPTY_SEARCH_FILTERS);

    const [stagedCcnRecords, setStagedCcnRecords] = useState<CcnRecord[]>([]);

    const [awbValue, setAwbValue] = useState("");
    const [ccnValue, setCcnValue] = useState("");
    const [operationType, setOperationType] = useState<OperationType>("INSERT");

    const [operationLoading, setOperationLoading] = useState(false)

    const uniqueId = useId();
    const channelId = useRef(`ccn_registry_changes_${uniqueId}`)

    const dateRangeError = hasInvalidDateRange(searchDraft)
        ? "To date cannot be before From date."
        : null;

    const { data, loading, error } = useFetchData({
        filters: appliedSearch,
        refreshToggle: refreshToggle
    });

    useEffect(() => {
        if (!isSupabaseConfigured || !supabase) return;

        const client = supabase; 

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
        setCurrentPage((current) => {
            const nextPage = Math.min(Math.max(page, 1), totalPages);
            setCurrentIndex(() => {
                const nextIndex = (nextPage - 1) * ITEMS_PER_PAGE;
                return nextIndex;
            });
            return loading || nextPage === current ? current : nextPage;
        });
    }, [loading, totalPages]);

    const applySearchFilters = useCallback(() => {
        const nextSearch = normalizeSearchFilters(searchDraft);
        if (hasInvalidDateRange(nextSearch)) return;

        setSearchDraft(nextSearch);
        setAppliedSearch(nextSearch);
        goToPage(1)
    }, [goToPage, searchDraft]);

    const updateSearchDraftFilters = useCallback((field: keyof CcnSearchFilters, value: string) => {
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
        if (stagedCcnRecords.length === 0) {
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

            setRefreshToggle((prev) => !prev);
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
    }, [stagedCcnRecords, showToast, goToPage]);

    const clearSearchFilters = useCallback(() => {
        const clearedSearch = normalizeSearchFilters(EMPTY_SEARCH_FILTERS);

        setSearchDraft(clearedSearch);
        setAppliedSearch(clearedSearch);
        goToPage(1);
    }, [goToPage]);

    const exportCCNDatabase = useCallback(async () => {
        try {
            const { data: allMatchingRows } = await requestCcnData(appliedSearch);
            const { exportData } = await import("./services/exportService");
            exportData(allMatchingRows, appliedSearch.status as Status);
        } catch (error) {
            const errorMessage = getCcnErrorMessage(error);

            showToast("error", "Error", errorMessage);
        }
    }, [appliedSearch, showToast]);

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
                    <button className="ccn-database__export" title="Export Data Shown" disabled={!data.length} onClick={exportCCNDatabase}>
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
                <p className="ccn-database__notice ccn-database__notice--error">{error}</p>
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
                currentPage={currentPage}
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