import Link from 'next/link'
import { PlusCircle } from 'lucide-react'

import { ActionButton } from '@/components/common/action-button'
import { TEXT_LINK } from '@/lib/dashboard/tokens'
import { NAV_LABEL, RECORD_PATH } from '@/lib/nav-items'

/**
 * 본인 통계가 0경기일 때 헤더 카드의 정보 영역('X 경기' 자리)에 인라인으로 놓이는 빈 상태 안내.
 * 첫 행동은 **경기 기록**이다 — 상대가 회원이든 아니든 한 장으로 끝나고, 저장하면 곧 여기가 채워진다.
 */
export function ProfileEmptyGuide() {
    return (
        <div className="space-y-3">
            <div className="space-y-0.5">
                <p className="text-body font-semibold text-foreground">아직 기록한 경기가 없어요</p>
                <p className="text-body2 text-muted-foreground break-keep">경기를 기록하면 승률·전적·레이팅 추이가 채워져요.</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
                <ActionButton href={RECORD_PATH} variant="solid" size="md">
                    <PlusCircle className="size-4" aria-hidden />
                    {NAV_LABEL.record}
                </ActionButton>
                <Link href="/guide" className={`text-body2 font-medium ${TEXT_LINK}`}>
                    {NAV_LABEL.guide}
                </Link>
            </div>
        </div>
    )
}
