import './OperationRecords.css'
import { sampleRecords } from './OperationRecords.const'
import { useState } from 'react'
import type { record } from './OperationRecords.types'
import  { RecordPage } from './operationrecords-components/recordpage/RecordPage'

export function OperationRecords() {
    const [activeRecord, setSelectedRecord] = useState<record | null>(null)

    const handleBackToDatabase = () => {
        setSelectedRecord(null)
    }


    return (
        <section>
            {
                activeRecord ? (
                    <section>
                    <button onClick={handleBackToDatabase}>BACK</button>
                    <RecordPage record={activeRecord!}/>
                    
                    </section>
                )
                : (
                    <section>
                        <header>Operation Records</header>
                        <div className="database-shell">
                            <table className="table">
                                <thead>
                                <tr>
                                    <th>AWB</th>
                                    <th>Status</th>
                                    <th>PCS</th>
                                    <th>Skids</th>
                                    <th>PU Date</th>
                                    <th>Quick Actions</th>
                                </tr>
                                </thead>
                                <tbody>
                                    {sampleRecords.map((record) => (
                                        <tr onClick={() => setSelectedRecord(record)} key={record.id}>
                                            <td>{record.awb}</td>
                                            <td>{record.status}</td>
                                            <td>{record.pcs.total}</td>
                                            <td>{record.skid}</td>
                                            <td>{record.pu_date}</td>
                                            <td>
                                                <button>AL</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>
                )
            }

        </section>
    )
}