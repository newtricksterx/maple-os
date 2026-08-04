import { useMemo, useState } from 'react'
import './BoxIntersect.css'

interface ListInfo {
    uniqueValues: string[];
    duplicateValues: Map<string, number>
}

function parseList(text: string): ListInfo {
    const seen = new Set<string>()

    const uniqueValues: string[] = []
    const duplicateValues: Map<string, number> = new Map<string, number>()

    for (const token of text.split(/[\s,]+/)) {
        const value = token.trim()
        const key = value.toLowerCase()

        if (!value) continue

        if (key && seen.has(key)) {
            
            duplicateValues.set(key, (duplicateValues.get(key) ?? 1) + 1)

            continue

        }

        seen.add(key)
        uniqueValues.push(value)
    }

    return {
        uniqueValues,
        duplicateValues
    }
}

export function BoxIntersect() {
    const [listAText, setListAText] = useState('')
    const [listBText, setListBText] = useState('')

    const { listA, listB, both, onlyA, onlyB, duplicateA, duplicateB } = useMemo(() => {
        const parsedListA = parseList(listAText)
        const parsedListB = parseList(listBText)

        const listA = parsedListA.uniqueValues
        const listB = parsedListB.uniqueValues
        const keysB = new Set(listB.map((v) => v.toLowerCase()))
        const keysA = new Set(listA.map((v) => v.toLowerCase()))
        const duplicateA = parsedListA.duplicateValues
        const duplicateB = parsedListB.duplicateValues

        return {
            listA,
            listB,
            both: listA.filter((v) => keysB.has(v.toLowerCase())),
            onlyA: listA.filter((v) => !keysB.has(v.toLowerCase())),
            onlyB: listB.filter((v) => !keysA.has(v.toLowerCase())),
            duplicateA,
            duplicateB
        }
    }, [listAText, listBText])

    const hasInput = listA.length > 0 && listB.length > 0

    const ResultGroup = (title: string, values: string[], tone: 'match' | 'diff') => (
        <div className={`intersect-group intersect-group--${tone}`}>
            <div className='intersect-group__header'>
                <span className='intersect-group__title'>{title}</span>
                <span className='intersect-group__count'>{values.length}</span>
            </div>
            {values.length > 0 ? (
                <p className='intersect-group__values'>
                    {values.map((val, index) => (
                        <span key={index} className='intersect-group__value-item'>
                            {val}
                        </span>
                    ))}
                </p>
            ) : (
                <p className='intersect-group__empty'>None</p>
            )}
        </div>
    )


    const DuplicateSummary = (title: string, duplicates: Map<string, number>) => (
        <div className='intersect__duplicates-summary__panel'>
            <div className='intersect__duplicates-summary__panel-header'>
                <span>{title}</span>
                <span className='intersect__duplicates-summary__panel-count'>{duplicates.size}</span>
            </div>
            {duplicates.size > 0 ? (
                <ul className='intersect__duplicates-summary__list'>
                    {Array.from(duplicates.entries()).map(([value, count]) => (
                        <li key={value} className='intersect__duplicates-summary__item'>
                            <span>{value}</span>
                            <span className='intersect__duplicates-summary__item-count'>× {count}</span>
                        </li>
                    ))}
                </ul>
            ) : (
                <p className='intersect__duplicates-summary__empty'>No duplicates</p>
            )}
        </div>
    )

    return (
        <div className='intersect'>
            <header className='intersect__header'>
                <h2 className='intersect__title'>Box Intersect</h2>
                <p className='intersect__subtitle'>
                    Paste two lists of box numbers.
                </p>
            </header>

            <div className='intersect__inputs'>
                <label className='intersect-field'>
                    <span className='intersect-field__label'>
                        List A {listA.length > 0 && `· ${listA.length}`}
                    </span>
                    <textarea
                        className='intersect-textarea'
                        autoComplete='off'
                        spellCheck={false}
                        placeholder='Box numbers, e.g. 12, 15, 23'
                        value={listAText}
                        onChange={(event) => setListAText(event.target.value)}
                    />
                </label>

                <label className='intersect-field'>
                    <span className='intersect-field__label'>
                        List B {listB.length > 0 && `· ${listB.length}`}
                    </span>
                    <textarea
                        className='intersect-textarea'
                        autoComplete='off'
                        spellCheck={false}
                        placeholder='Box numbers, e.g. 15, 23, 40'
                        value={listBText}
                        onChange={(event) => setListBText(event.target.value)}
                    />
                </label>
            </div>

            <span className='intersect__hint'>
                Separate values with spaces, commas, or new lines.
            </span>


            <div className='intersect__results'>
                <div className='intersect__duplicates-summary'>
                    <div className='intersect__duplicates-summary__header'>
                        <span className='intersect__duplicates-summary__title'>Duplicates</span>
                        <span className='intersect__duplicates-summary__subtitle'>Counts per list</span>
                    </div>

                    <div className='intersect__duplicates-summary__grid'>
                        {DuplicateSummary('List A', duplicateA)}
                        {DuplicateSummary('List B', duplicateB)}
                    </div>
                </div>

                { hasInput && (
                    <div className='intersect__result-groups'>
                        {ResultGroup('In both lists', both, 'match')}
                        {ResultGroup('Only in A', onlyA, 'diff')}
                        {ResultGroup('Only in B', onlyB, 'diff')}
                    </div>
                )}
            </div>
            
            
        </div>
    )
}
