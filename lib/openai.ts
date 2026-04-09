import OpenAI from 'openai'

// OpenAI 클라이언트 싱글톤 — 여러 파일에서 new OpenAI() 중복 생성 방지
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export default openai
