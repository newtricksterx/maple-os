import { Dialog } from "radix-ui"
import type { CcnRecord, OperationType } from "../CCN_Database.types";

interface OperationDialogProps {
    title: string;
    disabled: boolean;
    stagedCcnRecords: CcnRecord[]
    listElement: React.ReactNode;
    formElement: React.ReactNode;
    setOperationType: (op: OperationType) => void;

}

export const OperationDialog = ({ title, disabled, stagedCcnRecords, listElement, formElement, setOperationType } : OperationDialogProps) => {
    return (
        <Dialog.Root>
            <Dialog.Trigger asChild>
                <button
                    className="ccn-database__add"
                    type="button"
                    disabled={disabled}
                    onClick={() => {setOperationType("update")}}
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
                        >
                            X
                        </button>
                    </Dialog.Close>
                </div>
                
                <div className="ccn-dialog__body">
                    { stagedCcnRecords.length > 0 ? listElement : formElement}
                </div>

            </Dialog.Content>
        </Dialog.Root>
    )
}