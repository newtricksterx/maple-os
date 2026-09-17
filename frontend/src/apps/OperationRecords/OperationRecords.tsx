import './OperationRecords.css'
import { records } from './OperationRecords.const'
import { useState } from 'react'
import type { record } from './OperationRecords.types'

export function OperationRecords() {
    const [selectedRecord, setSelectedRecord] = useState<record | null>(null)

    return (
        <section>
            <header>Operation Records</header>
            {
                selectedRecord ? (
                    <div className="record-details">
                        <h2>Record Details</h2>
                        <p><strong>Type:</strong>{selectedRecord.record_type}</p>
                        <p><strong>AWB:</strong> {selectedRecord.awb}</p>
                        <p><strong>Status:</strong> {selectedRecord.status}</p>
                        <p><strong>ETA Airport:</strong>{selectedRecord.eta_airport}</p>
                        <p><strong>PCS:</strong> {selectedRecord.pcs}</p>
                        <p><strong>Skids:</strong> {selectedRecord.skid}</p>
                        <p><strong>PU Date:</strong> {selectedRecord.pu_date}</p>
                    </div>
                )
                : (
                    <div className="database-shell">
                        <table className="table">
                            <thead>
                            <tr>
                                <th>AWB</th>
                                <th>Status</th>
                                <th>PCS</th>
                                <th>Skids</th>
                                <th>PU Date</th>
                            </tr>
                            </thead>
                            <tbody>
                                {records.map((record) => (
                                    <tr onClick={() => setSelectedRecord(record)} key={record.id}>
                                        <td>{record.awb}</td>
                                        <td>{record.status}</td>
                                        <td>{record.pcs}</td>
                                        <td>{record.skid}</td>
                                        <td>{record.pu_date}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )
            }

        </section>
    )
}