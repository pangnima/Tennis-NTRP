import { setWinner, type ScorePair } from '@/lib/games/board'
import { cn } from '@/lib/utils'

/**
 * 보기 모드의 숫자 하나 — 입력 칸과 같은 폭(w-11)이라 모드를 바꿔도 숫자가 제자리다.
 * **이긴 숫자 = 승 색 + 굵게**(화면 낭독기에는 「승」), 진 숫자·무승부는 보통 굵기의 기본색.
 * 진 쪽에 패 색을 쓰지 않는다 — 보드는 두 팀을 나란히 놓은 절대 좌표라 「보는 사람의 패」가 아니다.
 * 비어 있으면(예정 게임) 「-」.
 */
export function BoardScoreValue({ pair, side }: { pair: ScorePair; side: 't1' | 't2' }) {
    const won = setWinner(pair) === (side === 't1' ? 1 : 2)
    return (
        <span className={cn('w-11 text-center text-body2 tabular-nums', won ? 'font-bold text-win' : 'font-normal text-foreground')}>
            {pair[side] === '' ? '-' : pair[side]}
            {won && <span className="sr-only">승</span>}
        </span>
    )
}
