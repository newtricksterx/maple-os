import { useState } from "react";
import { Dialog } from "radix-ui";
import { ScrollTextIcon } from "lucide-react";
import { useFetchCcnHistory } from "../../ccn-database-hooks/useFetchCcnHistory";
import { formatDate, normalizeStatus, getStatusClassName } from "../../CCN_Database.helpers"
import "./HistoryDialog.css"

interface HistoryDialogProps {
    ccn: string;
}

export const HistoryDialog = ({ ccn }: HistoryDialogProps) => {
    const [open, setOpen] = useState(false);

    const { data, loading, error } = useFetchCcnHistory(ccn, open);

    const handleOpenChange = (nextOpen: boolean) => {
        setOpen(nextOpen);
    };

    return (
        <Dialog.Root open={open} onOpenChange={handleOpenChange}>
            <Dialog.Trigger asChild>
                <button
                    className="ccn-database__history"
                    type="button"
                    aria-label={`View history for ${ccn}`}
                >
                    <ScrollTextIcon size={18} />
                </button>
            </Dialog.Trigger>
            <Dialog.Overlay className="ccn-dialog__overlay" />
            <Dialog.Content className="ccn-dialog">
                <div className="ccn-dialog__header">
                    <div className="ccn-dialog__heading">
                        <Dialog.Title className="ccn-dialog__title">
                            History - <span className="ccn-dialog__ccn-header">{ccn}</span>
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

                <table className="ccn-table">
                    <thead>
                        <tr>
                            <th>Changed At</th>
                            <th>AWB</th>
                            <th>Status</th>
                            <th>Comment</th>
                            <th>Operation</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading && (
                            <tr>
                                <td className="ccn-table__empty" colSpan={5}>
                                    Loading history…
                                </td>
                            </tr>
                        )}

                        {!loading && error && (
                            <tr>
                                <td className="ccn-table__empty" colSpan={5}>
                                    Couldn't load history: {error}
                                </td>
                            </tr>
                        )}

                        {!loading && !error && data.length === 0 && (
                            <tr>
                                <td className="ccn-table__empty" colSpan={5}>
                                    No history found.
                                </td>
                            </tr>
                        )}

                        {!loading && !error && data.map((entry) => {
                            const status = normalizeStatus(entry.status);

                            return (
                                <tr key={entry.id}>
                                    <td title={`${entry.changed_at.split(/[+T]/).slice(0, 2).join(' ')}`}>{formatDate(entry.changed_at)}</td>
                                    <td>{entry.awb}</td>
                                    <td>
                                        <span className={`ccn-status ${getStatusClassName(status)}`}>
                                            {status}
                                        </span>
                                    </td>
                                    <td>{entry.comment}</td>
                                    <td>{entry.operation}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </Dialog.Content>
        </Dialog.Root>
    );
};