import 'server-only'

import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/types/supabase'
import type { User } from '@/types'

/**
 * 다른 회원에게 보이는 컬럼 — DB의 컬럼 권한(0110)과 같은 목록이다.
 * email·phone·login_id는 여기 없다(본인 것만 `get_my_account()`로 읽는다). `select('*')`는 권한 오류가 난다.
 */
export const PUBLIC_USER_COLUMNS =
    'id, name, nickname, role, profile_image, gender, dominant_hand, ntrp, personal_ntrp, tennis_start_date, racket_brand, racket_model, stats_hidden, deleted_at, created_at'

type UserRow = Omit<Database['public']['Tables']['users']['Row'], 'email' | 'phone' | 'login_id'>

// DB row → User 도메인 타입 변환. 기본값은 NULL 컬럼 대응(탈퇴 익명화로 비워진 행 포함):
//   - gender/dominantHand: DB에서 NULL이 가능한 컬럼이지만 타입은 string 유니온이므로 기본값 필요
//   - ntrp: 값이 없으면 0 (표시 시 별도 처리 — effectiveNtrp)
export function mapUserRow(row: UserRow): User {
    return {
        id: row.id,
        name: row.name,
        nickname: row.nickname,
        role: row.role as User['role'],
        profileImage: row.profile_image ?? undefined,
        gender: (row.gender ?? 'male') as User['gender'],
        dominantHand: (row.dominant_hand ?? 'right') as User['dominantHand'],
        ntrp: row.ntrp ?? 0,
        personalNtrp: row.personal_ntrp != null ? Number(row.personal_ntrp) : undefined,
        tennisStartDate: row.tennis_start_date ?? '',
        racketBrand: row.racket_brand ?? undefined,
        racketModel: row.racket_model ?? undefined,
        createdAt: row.created_at,
        statsHidden: row.stats_hidden ?? false,
        deletedAt: row.deleted_at ?? null,
    }
}

export async function fetchUserById(id: string): Promise<User | null> {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('users')
        .select(PUBLIC_USER_COLUMNS)
        .eq('id', id)
        .single()
    if (error || !data) return null
    return mapUserRow(data)
}

export async function fetchUsersByIds(ids: string[]): Promise<User[]> {
    if (ids.length === 0) return []
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('users')
        .select(PUBLIC_USER_COLUMNS)
        .in('id', ids)
    if (error || !data) return []
    return data.map(mapUserRow)
}

export type OpponentCandidate = {
    id: string
    name: string
    nickname?: string      // 전체 회원 검색 결과에서만 채움 (닉네임 매칭 표시·필터용)
    profileImage?: string  // 전체 회원 검색 결과에서만 채움 (결과 행 아바타)
    ntrp?: number          // 정적 자가선언 NTRP (fallback)
    personalNtrp?: number  // 동적 개인 NTRP(개인경기 기반 캐시). 있으면 프리필 우선
    statsHidden?: boolean  // 통계 비공개 — 개인 NTRP를 감추고 자가선언 값만 쓴다 (derivePublicNtrp)
    dominantHand?: 'right' | 'left'  // 프로필 손잡이 — 선택 시 손잡이 자동 채움
    gender?: 'male' | 'female'  // 자동 대진표의 성별 밸런스용 (매칭 참가자 조회에서만 채움)
}

/** users.dominant_hand 원시값 → 유니온 (NULL·미지원 값은 undefined) */
export function toDominantHand(value: string | null | undefined): 'right' | 'left' | undefined {
    return value === 'right' || value === 'left' ? value : undefined
}
