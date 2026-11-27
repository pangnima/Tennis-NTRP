import { Toaster } from '@/components/common/toaster'
import { redirect } from 'next/navigation'

import { Header } from '@/components/common/header'
import { MobileTabBar } from '@/components/common/mobile-tab-bar'
import { Sidebar } from '@/components/common/sidebar'
import { SidebarProvider } from '@/components/common/sidebar-context'
import { needsProfileOnboarding, PROFILE_ONBOARDING_PATH } from '@/lib/profile/onboarding-gate'
import { fetchNotificationInbox } from '@/lib/queries/notifications'
import { createClient } from '@/lib/supabase/server'

/**
 * 로그인 후 셸 — PC는 사이드바, 모바일은 하단 탭(같은 메뉴, `lib/nav-items.ts`).
 *
 * 프로필 완성 게이트가 여기 산다: 소셜 가입자는 테니스 정보(성별·주력손·NTRP) 없이 계정이 생기므로 (main)의 어느
 * 화면이든 들어오면 `/onboarding/profile`로 보낸다(그 페이지는 (main) 밖이라 루프가 없다). 헤더용 프로필 조회에
 * `ntrp` 한 컬럼만 더 실어 게이트가 쿼리를 늘리지 않는다.
 *
 * /guide·/terms·/privacy는 보호 라우트가 아니라 비로그인도 이 레이아웃으로 들어온다 — 그때는 메뉴가 비고 탭이 없다.
 */
export default async function MainLayout({ children }: { children: React.ReactNode }) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const inbox = user ? await fetchNotificationInbox(user.id) : null

    let userDisplay: { id: string; name: string; nickname: string; role: string; profileImage: string | null } | null = null
    if (user) {
        const { data: profile } = await supabase
            .from('users')
            .select('name, nickname, role, profile_image, ntrp')
            .eq('id', user.id)
            .single()
        if (needsProfileOnboarding(profile)) redirect(PROFILE_ONBOARDING_PATH)
        if (profile) {
            userDisplay = { id: user.id, name: profile.name, nickname: profile.nickname, role: profile.role, profileImage: profile.profile_image }
        }
    }

    return (
        <SidebarProvider>
            <div className="flex h-dvh bg-background">
                <Sidebar userId={user?.id ?? null} />
                <div className="flex flex-col flex-1 min-w-0">
                    <Header userDisplay={userDisplay} userId={user?.id ?? null} inbox={inbox} />
                    {/* 모바일은 하단 탭(56px + 홈 인디케이터)만큼 아래를 비운다 — 마지막 버튼이 탭에 가리지 않게 */}
                    <main className={user ? 'flex-1 overflow-y-auto p-4 pb-[calc(5rem+env(safe-area-inset-bottom))] md:p-6' : 'flex-1 overflow-y-auto p-4 md:p-6'}>
                        {children}
                    </main>
                </div>
            </div>
            {user && <MobileTabBar userId={user.id} />}
            <Toaster />
        </SidebarProvider>
    )
}
