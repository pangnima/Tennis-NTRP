'use client'

import { useState, type MouseEvent, type ReactNode } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

import { MatchPasswordForm } from '@/components/matches/match-password-form'
import { AppDialog } from '@/components/common/app-dialog'

type Props = { matchId: string; hostName: string; title: string; className: string; children: ReactNode }

/**
 * 목록의 비공개 매칭 줄 — 누르면 **페이지를 옮기지 않고 비밀번호 팝업**을 연다. 비참가자가 상세에서 보는 것은
 * 목록에 이미 있는 값과 비밀번호 칸뿐이라(명단·게임은 참가 전 비공개) 여기서 받는 편이 한 걸음 짧다.
 * 줄은 그대로 링크라 ⌘/Ctrl/Shift·가운데 클릭은 새 탭으로 상세(비밀번호 카드)를 연다. 맞으면 그 매칭으로 들어간다.
 */
export function PrivateMatchLink({ matchId, hostName, title, className, children }: Props) {
    const router = useRouter()
    const [open, setOpen] = useState(false)
    const href = `/matches/${matchId}`

    function intercept(e: MouseEvent<HTMLAnchorElement>) {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return
        e.preventDefault()
        setOpen(true)
    }

    return (
        <>
            <Link href={href} className={className} onClick={intercept} aria-haspopup="dialog">{children}</Link>
            <AppDialog
                open={open} onOpenChange={setOpen} title={title}
                description={<>비공개 매칭입니다. 비밀번호를 넣으면 바로 참가합니다. 비밀번호는 호스트({hostName}님)에게 받으세요.</>}
            >
                {open && <MatchPasswordForm matchId={matchId} onJoined={() => router.push(href)} onCancel={() => setOpen(false)} />}
            </AppDialog>
        </>
    )
}
