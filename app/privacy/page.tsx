'use client'

import { useRouter } from 'next/navigation'

export default function PrivacyPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-primary-light">
      {/* 헤더 */}
      <div className="flex items-center relative px-5 pt-8 pb-4">
        <button
          onClick={() => router.back()}
          className="p-1.5 rounded-full hover:bg-white/60 transition-colors"
          aria-label="뒤로가기"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M13 4l-6 6 6 6" stroke="#185FA5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <h1 className="text-lg font-bold text-primary-dark mx-auto">개인정보 처리방침</h1>
      </div>

      <div className="px-5 pb-10 flex flex-col gap-5">
        {/* 시행일 */}
        <p className="text-xs text-gray-400 text-right">시행일: 2026년 4월 12일</p>

        {/* 섹션들 */}
        {[
          {
            title: '1. 수집하는 개인정보 항목',
            content: '3분코딩은 서비스 제공을 위해 아래와 같은 개인정보를 수집합니다.\n\n• 필수 항목: 이메일 주소, 이름, 비밀번호\n• 자동 수집: 서비스 이용 기록, 학습 이력, 문제 풀이 데이터',
          },
          {
            title: '2. 개인정보 수집 목적',
            content: '• 회원 식별 및 서비스 제공\n• 맞춤형 학습 문제 생성 및 복습 콘텐츠 제공\n• 학습 통계 및 취약점 분석 서비스 제공\n• 서비스 개선을 위한 통계 분석',
          },
          {
            title: '3. 개인정보 보유 및 이용 기간',
            content: '회원 탈퇴 시 즉시 삭제합니다. 단, 관련 법령에 따라 보존이 필요한 경우 해당 기간 동안 보관합니다.\n\n• 전자상거래 등에서의 소비자 보호에 관한 법률: 5년\n• 통신비밀보호법: 3개월',
          },
          {
            title: '4. 개인정보의 제3자 제공',
            content: '3분코딩은 원칙적으로 이용자의 개인정보를 외부에 제공하지 않습니다. 다만, 아래의 경우는 예외로 합니다.\n\n• 이용자가 사전에 동의한 경우\n• 법령의 규정에 의거하거나 수사 목적으로 법령에 정해진 절차에 따라 요청이 있는 경우',
          },
          {
            title: '5. 개인정보 보호를 위한 기술적 조치',
            content: '• 비밀번호 암호화 저장 (bcrypt)\n• HTTPS 암호화 통신\n• Supabase Row Level Security(RLS)를 통한 데이터 접근 제한\n• 본인 데이터만 조회 가능하도록 권한 관리',
          },
          {
            title: '6. 이용자의 권리',
            content: '이용자는 언제든지 아래 권리를 행사할 수 있습니다.\n\n• 개인정보 조회 및 수정\n• 개인정보 삭제(회원 탈퇴)\n• 개인정보 처리 정지 요청',
          },
          {
            title: '7. 문의',
            content: '개인정보 처리방침에 관한 문의는 아래로 연락해 주세요.\n\n• 서비스명: 3분코딩\n• 이메일: contact@3mincoding.com',
          },
        ].map((section) => (
          <div key={section.title} className="bg-white rounded-2xl p-5 shadow-sm">
            <h2 className="text-sm font-bold text-primary-dark mb-2">{section.title}</h2>
            <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-line">{section.content}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
