// TODO: /api/reports + /api/answers 연결 후 실제 데이터로 교체
const mockStats = {
  totalQuestions: 124,
  correctRate: 87,
  streak: 7,
  todayQuestions: 8,
  weekly: [
    { day: '월', count: 6 },
    { day: '화', count: 9 },
    { day: '수', count: 14 },
    { day: '목', count: 8 },
    { day: '금', count: 5 },
    { day: '토', count: 3 },
    { day: '일', count: 2 },
  ],
}

const maxCount = Math.max(...mockStats.weekly.map((d) => d.count))

export default function StatsPage() {
  return (
    <div className="flex flex-col min-h-screen px-5 pt-8 pb-6">
      <h1 className="text-xl font-bold text-primary-dark mb-5">학습 통계</h1>

      {/* 요약 카드 그리드 */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {[
          { label: '총 풀이 문제', value: mockStats.totalQuestions, unit: '' },
          { label: '정답률', value: `${mockStats.correctRate}%`, unit: '' },
          { label: '연속 학습일', value: mockStats.streak, unit: '일' },
          { label: '오늘 문제', value: mockStats.todayQuestions, unit: '' },
        ].map((item) => (
          <div key={item.label} className="bg-white rounded-2xl p-4 shadow-sm">
            <p className="text-xs text-gray-400 mb-1">{item.label}</p>
            <p className="text-2xl font-bold text-primary-dark">
              {item.value}
              {item.unit && (
                <span className="text-sm font-normal text-gray-400 ml-1">{item.unit}</span>
              )}
            </p>
          </div>
        ))}
      </div>

      {/* 주간 학습량 바 차트 */}
      <div className="bg-white rounded-2xl p-5 shadow-sm">
        <h2 className="text-sm font-bold text-gray-700 mb-4">주간 학습량</h2>
        <div className="flex items-end justify-between gap-1.5" style={{ height: '100px' }}>
          {mockStats.weekly.map((d) => {
            const heightPct = maxCount > 0 ? (d.count / maxCount) * 100 : 0
            const isToday = d.day === '수' // TODO: 실제 요일 계산
            return (
              <div key={d.day} className="flex flex-1 flex-col items-center gap-1">
                <div className="w-full flex items-end justify-center" style={{ height: '80px' }}>
                  <div
                    className={`w-full rounded-t-lg transition-all ${isToday ? 'bg-primary' : 'bg-primary-light'}`}
                    style={{ height: `${heightPct}%`, minHeight: '4px' }}
                  />
                </div>
                <span className="text-[10px] text-gray-400">{d.day}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
