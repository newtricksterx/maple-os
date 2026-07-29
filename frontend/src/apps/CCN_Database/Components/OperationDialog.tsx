import { useState } from "react";
import { Dialog } from "radix-ui"
import type { CcnRecord, OperationType } from "../CCN_Database.types";

interface OperationDialogProps {
    title: string;
    disabled: boolean;
    stagedCcnRecords: CcnRecord[]
    renderList: () => React.ReactNode;
    renderForm: () => React.ReactNode;
    setOperationType: (op: OperationType) => void;
    handleResetForm: () => void;

}

export const OperationDialog = ({ title, disabled, stagedCcnRecords, renderList, renderForm, setOperationType, handleResetForm } : OperationDialogProps) => {
    const [open, setOpen] = useState(false);

    const handleOpenChange = (nextOpen: boolean) => {
        setOpen(nextOpen);

        if (!nextOpen) {
            handleResetForm();
        }
    };

    return (
        <Dialog.Root open={open} onOpenChange={handleOpenChange}>
            <Dialog.Trigger asChild>
                <button
                    className="ccn-database__add"
                    type="button"
                    disabled={disabled}
                    onClick={() => {
                        setOperationType("update");
                        setOpen(true);
                    }}
                >
                    {title}
                </button>
            </Dialog.Trigger>
            <Dialog.Overlay className="ccn-dialog__overlay" />
            <Dialog.Content className="ccn-dialog">
                <div className="ccn-dialog__header">
                    <div className="ccn-dialog__heading">
                        <Dialog.Title className="ccn-dialog__title">
                            {title}
                        </Dialog.Title>
                    </div>
                    <Dialog.Close asChild>
                        <button
                            className="ccn-dialog__close"
                            type="button"
                            aria-label="Close dialog"
                            onClick={handleResetForm}
                        >
                            X
                        </button>
                    </Dialog.Close>
                </div>
                
                <div className="ccn-dialog__body">
                    { stagedCcnRecords.length > 0 ? renderList() : renderForm()}
                </div>

            </Dialog.Content>
        </Dialog.Root>
    )
}