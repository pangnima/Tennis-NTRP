/**
 * 약관·개인정보처리방침의 본문 모양(Week 70). 문구는 `terms.ts`·`privacy.ts`가 데이터로 들고
 * `LegalPage`가 같은 골격으로 그린다 — 두 페이지가 마크업을 복제하지 않게.
 * 구글 OAuth 동의 화면 게시가 두 링크(`/terms`·`/privacy`)를 필수로 요구해 만들었다.
 */
export type LegalSection = {
    /** 조 제목 — 앵커 id는 순번에서 만든다 */
    title: string
    /** 본문 문단(순서대로) */
    paragraphs?: string[]
    /** 항목 나열(문단 뒤) */
    items?: string[]
}

/** 시행일 — 본문을 고치면 함께 올린다(두 문서 공통) */
// 2026-12-04: 개인정보처리방침 개정 — 2조(성별·등급을 다른 회원에게 표시, 11-26 작성) + 비회원 참가자·초대 링크로 보이는 범위(0108, 11-27).
// 방침 9조에 따라 시행 7일 전(11-27)부터 공지가 필요하다. 아직 prod에 공지하기 전이라 두 개정을 한 번에 묶었다
export const LEGAL_EFFECTIVE_DATE = '2026-12-04'

/** 서비스 이름 — 두 문서가 같은 이름을 부른다 */
export const SERVICE_NAME = 'BASELINE'
