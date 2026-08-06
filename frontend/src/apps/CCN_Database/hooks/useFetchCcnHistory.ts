import { useEffect, useState } from "react";
import type { CcnRecordHistory } from "../CCN_Database.types";
import { supabase } from "../../../lib/supabase";
import { MISSING_SUPABASE_CONFIG_MESSAGE } from "../CCN_Database.constants";
import { getCcnErrorMessage } from "../CCN_Database.helpers";

export async function requestCcnHistoryData( ccn: string ): Promise<CcnRecordHistory[]> {
    if (!supabase) {
        throw new Error(MISSING_SUPABASE_CONFIG_MESSAGE);
    }

    const query = supabase
        .from("CCN_Registry_History")
        .select("*", { count: "exact" })
        .eq("ccn", ccn)
        .order("changed_at", { ascending: false })
        .order("ccn", { ascending: false });

    const { data, error } = await query;

    if (error) {
        throw error;
    }

    return data;
}

interface FetchDataResult {
    data: CcnRecordHistory[];
    loading: boolean;
    error: string | null;
}


export function useFetchCcnHistory( ccn: string, enabled: boolean ): FetchDataResult {
    const [data, setData] = useState<CcnRecordHistory[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);


    useEffect(() => {
        if (!enabled) return;

        let ignore = false;

        const loadData = async () => {
            setLoading(true);
            setError(null);

            try {
                const response = await requestCcnHistoryData(ccn);

                if (!ignore) {
                    setData(response);
                }
            } catch (err) {
                console.error("Error fetching data:", err);
                if (!ignore) {
                    setError(getCcnErrorMessage(err));
                }
            } finally {
                if (!ignore) {
                    setLoading(false);
                }
            }
        };

        void loadData();

        return () => {
            ignore = true;
        };

    }, [ccn, enabled]);

    return {
        data,
        loading,
        error,
    };
}