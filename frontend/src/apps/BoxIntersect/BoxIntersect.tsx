import { useMemo, useState } from 'react'
import './BoxIntersect.css'

function parseList(text: string): string[] {
    const seen = new Set<string>()
    const values: string[] = []
    for (const token of text.split(/[\s,]+/)) {
        const value = token.trim()
        const key = value.toLowerCase()
        if (!value || seen.has(key)) continue
        seen.add(key)
        values.push(value)
    }
    return values
}

export function BoxIntersect() {
    const [listAText, setListAText] = useState('')
    const [listBText, setListBText] = useState('')

    const { listA, listB, both, onlyA, onlyB } = useMemo(() => {
        const listA = parseList(listAText)
        const listB = parseList(listBText)
        const keysB = new Set(listB.map((v) => v.toLowerCase()))
        const keysA = new Set(listA.map((v) => v.toLowerCase()))

        return {
            listA,
            listB,
            both: listA.filter((v) => keysB.has(v.toLowerCase())),
            onlyA: listA.filter((v) => !keysB.has(v.toLowerCase())),
            onlyB: listB.filter((v) => !keysA.has(v.toLowerCase())),
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
                <p className='intersect-group__values'>{values.join(' ')}</p>
            ) : (
                <p className='intersect-group__empty'>None</p>
            )}
        </div>
    )

    return (
        <div className='intersect'>
            <header className='intersect__header'>
                <h2 className='intersect__title'>Box Intersect</h2>
                <p className='intersect__subtitle'>
                    Paste two lists of box numbers to see which values appear in both.
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
                Separate values with spaces, commas, or new lines. Duplicates are ignored.
            </span>

            {hasInput && (
                <div className='intersect__results'>
                    {ResultGroup('In both lists', both, 'match')}
                    {ResultGroup('Only in A', onlyA, 'diff')}
                    {ResultGroup('Only in B', onlyB, 'diff')}   
                </div>
            )}
        </div>
    )
}
