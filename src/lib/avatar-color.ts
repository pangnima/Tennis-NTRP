// userId(또는 임의 seed) 해시로 고정 컬러를 부여하는 이니셜 아바타 팔레트.
// 같은 사람은 항상 같은 색 → 리스트에서 시각적 식별을 돕는다.
// 결과(승=win/패=loss)와 혼동되지 않도록 L3 아바타 토큰(--avatar-1..8 — 옛 순서 그대로)을 쓴다.
// 해시가 `% 길이`라 배열 길이 8을 바꾸면 기존 사용자의 아바타 색이 전부 재배정된다 — 길이 고정.
const AVATAR_PALETTE = [
    'bg-avatar-1/20 text-avatar-1',
    'bg-avatar-2/20 text-avatar-2',
    'bg-avatar-3/20 text-avatar-3',
    'bg-avatar-4/20 text-avatar-4',
    'bg-avatar-5/20 text-avatar-5',
    'bg-avatar-6/20 text-avatar-6',
    'bg-avatar-7/20 text-avatar-7',
    'bg-avatar-8/20 text-avatar-8',
]

export function avatarColorClass(seed: string): string {
    let hash = 0
    for (let i = 0; i < seed.length; i++) {
        hash = (hash * 31 + seed.charCodeAt(i)) >>> 0
    }
    return AVATAR_PALETTE[hash % AVATAR_PALETTE.length]
}
