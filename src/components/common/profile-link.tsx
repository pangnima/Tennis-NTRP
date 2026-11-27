import Link from 'next/link'
import type { ReactNode } from 'react'

type Props = {
    /** 대상 회원 ID */
    userId: string
    children: ReactNode
    className?: string
}

/** 회원 프로필(통계) 링크 — 비회원은 id가 없어 이 컴포넌트를 쓰지 않고 이름만 그린다. */
export function ProfileLink({ userId, children, className }: Props) {
    return (
        <Link href={`/profile/${userId}`} className={className}>
            {children}
        </Link>
    )
}
