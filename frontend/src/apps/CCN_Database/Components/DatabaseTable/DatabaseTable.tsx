import '../../CCN_Database.css'
import './DatabaseTable.css'
import { ITEMS_PER_PAGE } from '../../CCN_Database.constants'
import type { CcnRecord } from '../../CCN_Database.types';
import { formatDate, getStatusClassName, normalizeStatus } from '../../CCN_Database.helpers';

interface DatabaseTableProps {
    data: CcnRecord[];
    loading: boolean;
    currentIndex: number;
    currentPage: number;
    totalPages: number;
    goToPage: (page: number) => void;
    
}

export const DatabaseTable = ( {data, loading, currentIndex, currentPage, totalPages, goToPage} : DatabaseTableProps ) => {
    return (
        <div className='ccn-table-main'>
            <div
                className="ccn-table-shell"
                style={{ ["--ccn-table-rows" as string]: `${ITEMS_PER_PAGE}` }}
            >
                <table className="ccn-table">
                    <thead>
                        <tr>
                            <th>CCN</th>
                            <th>AWB</th>
                            <th>Status</th>
                            <th>Created At</th>
                            <th>Updated At</th>
                            <th>Comment</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading && data.length === 0 ? (
                            <tr>
                                <td className="ccn-table__empty" colSpan={6}>Loading CCN records...</td>
                            </tr>
                        ) : null}

                        {!loading && data.length === 0 ? (
                            <tr>
                                <td className="ccn-table__empty" colSpan={6}>No CCN Records Found.</td>
                            </tr>
                        ) : null}

                        {data.slice(currentIndex, currentIndex + ITEMS_PER_PAGE).map((ccn, index) => {
                            const status = normalizeStatus(ccn.status);

                            return (
                                <tr key={`${ccn.awb}-${ccn.ccn}-${ccn.created_at}-${index}`}>
                                    <td>{ccn.ccn}</td>
                                    <td>{ccn.awb}</td>
                                    <td>
                                        <span className={`ccn-status ${getStatusClassName(status)}`}>
                                            {status}
                                        </span>
                                    </td>
                                    <td title={`${ccn.created_at}`}>{formatDate(ccn.created_at)}</td>
                                    <td title={`${ccn.updated_at}`}>{formatDate(ccn.updated_at)}</td>
                                    <td>{ccn.comment}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            <footer className="ccn-database__footer">
                <span className="ccn-database__page-status">
                    Page {currentPage} of {totalPages}
                </span>
                <div className="ccn-database__pagination" aria-label="CCN table pagination">
                    <button
                        className="ccn-database__page-button"
                        type="button"
                        onClick={() => goToPage(currentPage - 1)}
                        disabled={loading || currentPage <= 1}
                    >
                        Previous
                    </button>
                    <button
                        className="ccn-database__page-button"
                        type="button"
                        onClick={() => goToPage(currentPage + 1)}
                        disabled={loading || currentPage >= totalPages}
                    >
                        Next
                    </button>
                </div>
            </footer>
        </div>
    )
}