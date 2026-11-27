'use client'

import { ActionButton } from '@/components/common/action-button'

type Props = {
    error: Error & { digest?: string }
    reset: () => void
}

export function ProfileError({ error, reset }: Props) {
    return (
        <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
            <p className="text-display font-extrabold text-destructive">오류</p>
            <h1 className="text-h2 font-bold">프로필을 불러오지 못했습니다</h1>
            <p className="text-body2 text-muted-foreground">{error.message}</p>
            <div className="flex gap-3 mt-2">
                <ActionButton variant="solid" size="md" onClick={reset}>
                    다시 시도
                </ActionButton>
                <ActionButton href="/matches" size="md">매칭 리스트</ActionButton>
            </div>
        </div>
    )
}

export default ProfileError
