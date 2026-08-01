import {useDropzone} from 'react-dropzone'
import './GenerateArrival.css'
import { useCallback, useState } from 'react';
import Papa from 'papaparse'
import * as XLSX from 'xlsx'

const TIMEZONE = "ED"
const DEST_CODE = "'0497"
const WH_CODE = "6031"



export type BOX_INFORMATION_METADATA = {
    awb: string;
    box_amount: number;
    tracking_amount: number;
}

type AWBValidationResult = 'valid' | 'bad-format' | 'bad-check-digit' | 'bypass'



function GenerateNewFile(trackingNumbers: string[], AWBNumber: string) : File {
    const CCNs = []

    for (const trackingNumber of trackingNumbers){
        CCNs.push("80N9" + trackingNumber)
    }

    const now = new Date()
    const pad = (value: number) => String(value).padStart(2, '0')
    const roundedMinutes = now.getMinutes() < 30 ? 0 : 30
    const arrivalDate =
        "'" +
        `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}` +
        `${pad(now.getHours())}${pad(roundedMinutes)}`

    // Header mirrored from Arrival_Template.csv
    const fields = [
        'SLNO',
        'ArrivalCert Control Number',
        'Arrival Date  (YYYYMMDDHHMM)',
        'Timezone',
        'Inbond Destination Office Code',
        'Warehouse Sub-loc Code',
        'AWB/Bill of Lading',
    ]

    const rows = CCNs.map((ccn, index) => [
        (index + 1), // SLNO
        ccn,         // ArrivalCert Control Number
        arrivalDate, // Arrival Date (YYYYMMDDHHMM)
        TIMEZONE,    // Timezone
        DEST_CODE,   // Inbond Destination Office Code — kept as string so the leading 0 survives
        WH_CODE,     // Warehouse Sub-loc Code
        AWBNumber,   // AWB/Bill of Lading (optional)
    ])

    // unparse writes DEST_CODE ('0497') unquoted -> a bare, numeric-looking 0497
    const csv = Papa.unparse({ fields, data: rows })

    return new File([csv], `${AWBNumber}.csv`, { type: 'text/csv' })
}

export function GenerateArrival() {
    const [awbNumber, setAwbNumber] = useState('')
    const [uploadedFile, setUploadedFile] = useState<File | null>(null)
    const [metadata, setMetadata] = useState<BOX_INFORMATION_METADATA | null>(null)
    const [trackingNumbers, setTrackingNumbers] = useState<string[]>([])
    const [isParsing, setIsParsing] = useState(false)
    const [filterMode, setFilterMode] = useState<'include' | 'exclude'>('exclude')
    const [boxFilterText, setBoxFilterText] = useState('')
    const [bypassValidation, setBypassValidation] = useState(false)

    const parseBoxFilter = (text: string) =>
        new Set(text.split(/[\s,]+/).map((s) => s.trim().toLowerCase()).filter(Boolean))

    const aggregateRows = (rows: string[][], headers: string[]) => {
        const boxSet = parseBoxFilter(boxFilterText)

        
        let boxNumberIndex = 0
        let trackingNumberIndex = 0

        for (let i = 0; i < headers.length; i++){
            if (!headers[i]){
                continue;
            }

            if (headers[i].toLowerCase() === "trackingnumber" || headers[i].toLowerCase() === "tracking number") {
                trackingNumberIndex = i
            }

            // Using the dynamic boxNumberIndex instead of hardcoded 2
            if (headers[i].toLowerCase() === "internal account number" || headers[i].toLowerCase() === "box information") {
                boxNumberIndex = i
            }
        }

        
        const dataRows = rows.slice(1).filter((row) => {
            if (boxSet.size === 0) return true
            
            const inList = boxSet.has(String(row[boxNumberIndex]).trim().toLowerCase())
            return filterMode === 'include' ? inList : !inList
        })

        const uniqueBoxNumbers = new Set<string>()
        const currentTrackingNumbers = []

        // 3. COLLECT DATA FROM FILTERED ROWS
        for (const row of dataRows) {
            uniqueBoxNumbers.add(row[boxNumberIndex])
            currentTrackingNumbers.push(row[trackingNumberIndex])
        }

        setMetadata({
            awb: awbNumber,
            box_amount: uniqueBoxNumbers.size,
            tracking_amount: currentTrackingNumbers.length,
        })

        setTrackingNumbers(currentTrackingNumbers)
        setIsParsing(false)
    }

    const AWBValidation = (awbNumber: string): AWBValidationResult => {
        if (bypassValidation) return 'bypass';

        // 3-digit airline prefix, a dash, then an 8-digit serial (e.g. 123-45678901)
        if (!/^\d{3}-\d{8}$/.test(awbNumber)) return 'bad-format'

        // IATA check digit: the serial's 8th digit equals the first 7 digits mod 7
        const serial = awbNumber.slice(4)
        if (Number(serial.slice(0, 7)) % 7 !== Number(serial[7])) return 'bad-check-digit'

        return 'valid'
    }

    const handleGenerate = async () => {
        if (!uploadedFile) return

        setIsParsing(true)

        const isXlsx = uploadedFile.name.toLowerCase().endsWith('.xlsx')
        if (isXlsx) {
            try {
                const buf = await uploadedFile.arrayBuffer()
                const wb = XLSX.read(buf)
                const sheet = wb.Sheets[wb.SheetNames[0]]
                const rows = XLSX.utils.sheet_to_json<string[]>(sheet, {
                    header: 1,
                    raw: false,
                    blankrows: true,
                })
                
                const headers = rows.length > 0 ? rows[0] : []
                // console.log("Excel Headers:", headers) // Check your console to see the array

                aggregateRows(rows, headers)
            } catch (err) {
                console.error(err)
                setIsParsing(false)
            }
            return
        }

        Papa.parse(uploadedFile, {
            header: false,
            skipEmptyLines: false,
            complete: (results) => {
                aggregateRows(results.data as string[][], results.data as string[])
            },
            error: (err) => {
                console.error(err)
                setIsParsing(false)
            }
        })
    }

    const onDrop = useCallback(async (acceptedFiles: File[]) => {
        // Do something with the files
        const file = acceptedFiles[0]
        if (!file) return

        setUploadedFile(acceptedFiles[0])

        return
    }, [])

    const {getRootProps, getInputProps, isDragActive} = useDropzone(
    {
        onDrop,
        accept: {
            'text/csv': ['.csv'],
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
        },
        maxFiles: 1,
    })

    const awbValidation = AWBValidation(awbNumber)
    const isAwbValid = awbValidation === 'valid' || awbValidation === 'bypass'
    const showAwbError = awbNumber.length > 0 && !isAwbValid

    const fileNamePrefix = uploadedFile ? uploadedFile.name.slice(0, 12) : ''
    const showFileNameWarning =
        !!uploadedFile && awbNumber.length > 0 && fileNamePrefix !== awbNumber

    const dropzoneClassName = [
        'dropzone',
        isDragActive ? 'dropzone--active' : '',
        uploadedFile ? 'dropzone--filled' : '',
    ].filter(Boolean).join(' ')

    const UploadIcon = (
        <svg width='28' height='28' viewBox='0 0 24 24' fill='none'
            stroke='currentColor' strokeWidth='1.8' strokeLinecap='round' strokeLinejoin='round'>
            <path d='M12 16V4' />
            <path d='M7 9l5-5 5 5' />
            <path d='M5 16v2a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-2' />
        </svg>
    )

    const FileIcon = (
        <svg width='20' height='20' viewBox='0 0 24 24' fill='none'
            stroke='currentColor' strokeWidth='1.8' strokeLinecap='round' strokeLinejoin='round'>
            <path d='M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z' />
            <path d='M14 2v6h6' />
        </svg>
    )

    const Form = (
            <form
                className='arrival-form'
                onSubmit={(event) => {
                    event.preventDefault()
                    handleGenerate()
                }}
            >
                <header className='arrival-form__header'>
                    <h2 className='arrival-form__title'>Generate Arrival</h2>
                    <p className='arrival-form__subtitle'>
                        Enter the AWB number and upload the box information CSV or XLSX.
                    </p>
                </header>

                <div className='bypass-validation'>
                    <input type="checkbox" checked={bypassValidation} onChange={(event) => setBypassValidation(event.target.checked)}></input>
                    <label>Bypass AWB Validation</label>
                </div>

                <label className='arrival-field'>
                    <span className='arrival-field__label'>AWB Number</span>
                    <div className='arrival-field__control'>
                        <input
                            className={
                                'arrival-field__input' +
                                (showAwbError ? ' arrival-field__input--error' : '') +
                                (isAwbValid ? ' arrival-field__input--valid' : '')
                            }
                            type='text'
                            inputMode='numeric'
                            autoComplete='off'
                            spellCheck={false}
                            placeholder='e.g. 123-45678901'
                            value={awbNumber}
                            onChange={(event) => setAwbNumber(event.target.value)}
                        />
                        {isAwbValid && (
                            <span className='arrival-field__check' aria-hidden='true'>✓</span>
                        )}
                    </div>
                    {showAwbError ? (
                        <span className='arrival-field__error'>
                            {awbValidation === 'bad-check-digit'
                                ? "Check digit doesn't match — verify the AWB number."
                                : 'Invalid AWB format — expected 123-45678901'}
                        </span>
                    ) : (
                        <span className='arrival-field__hint'>
                            3-digit prefix, dash, then a 7-digit serial plus its check digit.
                        </span>
                    )}
                </label>

                <div className={dropzoneClassName} {...getRootProps()}>
                    <input {...getInputProps()} />
                    {uploadedFile ? (
                        <div className='dropzone__file'>
                            <span className='dropzone__file-badge' aria-hidden='true'>{FileIcon}</span>
                            <span className='dropzone__file-name'>{uploadedFile.name}</span>
                            <span className='dropzone__file-meta'>
                                {Math.round(uploadedFile.size / 1000)} KB · {uploadedFile.name.toLowerCase().endsWith('.xlsx') ? 'XLSX' : 'CSV'}
                            </span>
                            <button
                                type='button'
                                className='dropzone__remove'
                                onClick={(event) => {
                                    event.stopPropagation()
                                    setUploadedFile(null)
                                }}
                            >
                                Remove
                            </button>
                        </div>
                    ) : (
                        <div className='dropzone__prompt'>
                            <span className='dropzone__icon' aria-hidden='true'>{UploadIcon}</span>
                            <p className='dropzone__text'>
                                {isDragActive
                                    ? 'Drop the file here…'
                                    : 'Drag & drop a CSV or XLSX here, or click to browse'}
                            </p>
                            <span className='dropzone__hint'>CSV or XLSX · max 1 file</span>
                        </div>
                    )}
                </div>

                {showFileNameWarning && (
                    <p className='arrival-warning'>
                        ⚠ File name ({fileNamePrefix}) doesn't match the AWB number.
                    </p>
                )}

                <div className='arrival-field'>
                    <span className='arrival-field__label'>Box Filter (optional)</span>
                    <div className='arrival-toggle' role='group'>
                        <button
                            type='button'
                            className={
                                'arrival-toggle__btn' +
                                (filterMode === 'include' ? ' arrival-toggle__btn--active' : '')
                            }
                            onClick={() => setFilterMode('include')}
                        >
                            Include
                        </button>
                        <button
                            type='button'
                            className={
                                'arrival-toggle__btn' +
                                (filterMode === 'exclude' ? ' arrival-toggle__btn--active' : '')
                            }
                            onClick={() => setFilterMode('exclude')}
                        >
                            Exclude
                        </button>
                    </div>
                    <textarea
                        className='arrival-textarea'
                        autoComplete='off'
                        spellCheck={false}
                        placeholder='Box numbers, e.g. 12, 15, 23'
                        value={boxFilterText}
                        onChange={(event) => setBoxFilterText(event.target.value)}
                    />
                    <span className='arrival-field__hint'>
                        {filterMode === 'include'
                            ? 'Keep only the listed box numbers. Leave blank for all boxes.'
                            : 'Drop the listed box numbers. Leave blank for all boxes.'}
                    </span>
                </div>

                <button
                    type='submit'
                    className='arrival-submit'
                    disabled={!isAwbValid || !uploadedFile || isParsing}
                >
                    {isParsing ? 'Generating…' : 'Generate'}
                </button>
            </form>
        )

    const handleDownload = () => {
        const file = GenerateNewFile(trackingNumbers, awbNumber)
        const url = URL.createObjectURL(file)
        const link = document.createElement('a')
        link.href = url
        link.download = file.name
        link.click()
        URL.revokeObjectURL(url)
    }

    const handleReset = () => {
        setAwbNumber('')
        setMetadata(null)
        setUploadedFile(null)
        setTrackingNumbers([])
        setFilterMode('exclude')
        setBoxFilterText('')
    }

    const Generated = (
        <div className='arrival-form'>
            <header className='arrival-form__header'>
                <h2 className='arrival-form__title'>Generate Arrival</h2>
                <p className='arrival-form__subtitle'>
                    Review the details, then download the arrival file.
                </p>
            </header>

            <div className='arrival-success'>
                <span className='arrival-success__icon' aria-hidden='true'>✓</span>
                <div className='arrival-success__text'>
                    <p className='arrival-success__title'>Arrival file ready</p>
                    <p className='arrival-success__subtitle'>
                        Parsed {metadata?.tracking_amount} packages across {metadata?.box_amount} boxes.
                    </p>
                </div>
            </div>

            <dl className='arrival-summary'>
                <div className='arrival-summary__row'>
                    <dt className='arrival-summary__label'>AWB #</dt>
                    <dd className='arrival-summary__value arrival-summary__value--mono'>{metadata?.awb}</dd>
                </div>
                <div className='arrival-summary__row'>
                    <dt className='arrival-summary__label'>Box Amount</dt>
                    <dd className='arrival-summary__value'>{metadata?.box_amount}</dd>
                </div>
                <div className='arrival-summary__row'>
                    <dt className='arrival-summary__label'>PKG Amount</dt>
                    <dd className='arrival-summary__value'>{metadata?.tracking_amount}</dd>
                </div>
            </dl>

            <div className='arrival-actions'>
                <button
                    type='button'
                    className='arrival-submit'
                    onClick={handleDownload}
                >
                    Download {awbNumber}.csv
                </button>

                <button
                    type='button'
                    className='arrival-ghost'
                    onClick={handleReset}
                >
                    Start over
                </button>
            </div>
        </div>
    )



    return (
        metadata ? Generated : Form
    )
}