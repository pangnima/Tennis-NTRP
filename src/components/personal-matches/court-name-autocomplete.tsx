'use client'

import { useRef } from 'react'
import { Autocomplete } from '@base-ui/react/autocomplete'

import { ActionButton } from '@/components/common/action-button'
import { fieldClass, fieldMessageClass } from '@/components/common/field-class'
import { ITEM_CLASS, POPUP_CLASS } from '@/components/personal-matches/autocomplete-classes'
import { useCourtSearch, type CourtGroup, type CourtItem } from '@/components/personal-matches/use-court-search'
import { COURT_NAME_MAX, similarCourt } from '@/lib/matches/court'
import { cn } from '@/lib/utils'

type Props = {
    value: string
    recentCourtNames: string[]  // 본인이 이전에 입력한 코트명(최근순, 중복 제거)
    onChange: (v: string) => void
    placeholder?: string
    id?: string
}

/**
 * 코트명 — **함께 쌓는 코트 목록**에서 고르거나 새로 쓴다(0102). 후보는 「공식 코트」(관리자가 정리한 정식 명칭, 0103) ·
 * 「최근 코트」 · 「함께 쓰는 코트」(매칭 수) · 「새 코트」. 「양시숲」·「ㅇㅈㅅㅁ」처럼 줄여 써도 「양재 시민의숲 …」이 먼저 뜨고,
 * 공식 코트가 별칭으로 걸렸으면 그 아래 「다른 이름: 양시숲」으로 이유를 보여 준다. 고르지 않고 새로 쓰면 비슷한 기존 이름을
 * 칸 아래 한 줄로 알려 주고 [이걸로]로 바꿀 수 있다(막지는 않는다). 띄어쓰기만 다른 이름·별칭은 저장할 때 DB가 맞춘다.
 */
export function CourtNameAutocomplete({ value, recentCourtNames, onChange, placeholder, id }: Props) {
    const { groups, candidates } = useCourtSearch(value, recentCourtNames)
    const similar = similarCourt(value, candidates)
    const highlighted = useRef<CourtItem | undefined>(undefined)

    function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
        if (e.key !== 'Enter') return
        e.preventDefault()
        if (e.nativeEvent.isComposing) return  // 한글 조합 중 Enter 무시
        if (highlighted.current) onChange(highlighted.current.value)
    }

    return (
        <>
            <Autocomplete.Root
                items={groups}
                mode="none"
                value={value}
                onValueChange={(next, details) => { if (details.reason !== 'item-press') onChange(next) }}
                onItemHighlighted={(item) => { highlighted.current = item }}
                openOnInputClick
            >
                <Autocomplete.Input id={id} placeholder={placeholder} className={fieldClass()} autoComplete="off" maxLength={COURT_NAME_MAX} onKeyDown={handleKeyDown} />
                {groups.length > 0 && (
                    <Autocomplete.Portal>
                        <Autocomplete.Positioner className="isolate z-50" sideOffset={4}>
                            <Autocomplete.Popup className={POPUP_CLASS}>
                                <Autocomplete.List className="outline-none">
                                    {(group: CourtGroup) => (
                                        <Autocomplete.Group key={group.value} items={group.items} className="pb-1 last:pb-0">
                                            <Autocomplete.GroupLabel className="px-2 py-1.5 text-caption font-medium text-muted-foreground">{group.value}</Autocomplete.GroupLabel>
                                            <Autocomplete.Collection>
                                                {(item: CourtItem) => (
                                                    <Autocomplete.Item key={item.value} value={item} className={cn(ITEM_CLASS, 'flex items-center justify-between gap-3')} onClick={() => onChange(item.value)}>
                                                        <span className="min-w-0">
                                                            <span className="block truncate">{item.isNew ? `+ ‘${item.value}’ 새 코트로 쓰기` : item.value}</span>
                                                            {item.via && <span className="block truncate text-caption text-muted-foreground">다른 이름: {item.via}</span>}
                                                        </span>
                                                        {item.uses != null && <span className="shrink-0 text-caption text-muted-foreground tabular-nums">매칭 {item.uses}</span>}
                                                    </Autocomplete.Item>
                                                )}
                                            </Autocomplete.Collection>
                                        </Autocomplete.Group>
                                    )}
                                </Autocomplete.List>
                            </Autocomplete.Popup>
                        </Autocomplete.Positioner>
                    </Autocomplete.Portal>
                )}
            </Autocomplete.Root>
            {similar && (
                <p className={cn(fieldMessageClass(), 'flex flex-wrap items-center gap-x-2 gap-y-1')}>
                    <span>비슷한 코트가 있어요: <span className="font-medium text-foreground">{similar}</span></span>
                    <ActionButton size="xs" onClick={() => onChange(similar)}>이걸로</ActionButton>
                </p>
            )}
        </>
    )
}
