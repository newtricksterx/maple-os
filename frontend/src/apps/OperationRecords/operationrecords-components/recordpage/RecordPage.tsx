import type { record } from "../../OperationRecords.types";

interface RecordPageProps {
    record: record;
}

export function RecordPage({ record } : RecordPageProps) {
    return (
        <div className="record-details">
            <h2>Record Details</h2>
            <p><strong>Type:</strong>{record.record_type}</p>
            <p><strong>AWB:</strong> {record.awb}</p>
            <p><strong>Status:</strong> {record.status}</p>
            <p><strong>ETA Airport:</strong>{record.eta_airport}</p>
            <p><strong>PCS:</strong> {record.pcs.total}</p>
            <p><strong>Weight (kg):</strong> {record.weight}</p>
            <p><strong>CBM</strong> {record.cbm}</p>
            <p><strong>Skids:</strong> {record.skid}</p>
            <p><strong>PU Date:</strong> {record.pu_date}</p>
            <p><strong>Inbound Date:</strong> {record.inbound_date}</p>
            <p><strong>AN Received Date:</strong> {record.an_received_date}</p>
            <p><strong>DEST:</strong> {record.cargo_dest}</p>
            <p><strong>LFD:</strong> {record.lastFreeDay}</p>
            <p><strong>Trucking Company:</strong> {record.trucking_company}</p>
            <p><strong>Payment Provided:</strong> {record.payment ? "YES" : "NO"}</p>
            <p><strong>Notes:</strong> {record.notes}</p>
            <p><strong>Complete:</strong> {record.completed ? "YES" : "NO"}</p>     
        </div>
    )
}