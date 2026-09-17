import './OperationRecords.css'
import { records } from './OperationRecords.const'

export function OperationRecords() {
    return (
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
                    </tr>
                    </thead>
                    <tbody>
                        {records.map((record) => (
                            <tr onClick={() => console.log(record)} key={record.id}>
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
        </section>
    )
}