import '@testing-library/jest-dom/vitest'
import { vi } from 'vitest'

// 개발자 .env에 실제 키가 있어도 테스트는 네트워크를 타지 않고 로컬 검색 경로로 고정한다.
// (.env.test에 빈 값을 두는 방식은 Vite가 빈 값을 병합에서 건너뛰어 동작하지 않는다)
vi.stubEnv('VITE_OPENAI_API_KEY', '')
vi.stubEnv('VITE_OPENAI_MODEL', 'gpt-4o-mini')
vi.stubEnv('VITE_OPENAI_BASE_URL', 'https://api.openai.com/v1')
