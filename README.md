# KeyLingo

영어·한국어를 직접 입력하며 연습하는 Expo / React Native 앱입니다. 로그인 없이 3문항 튜토리얼로 시작하고, Guided·Recall·Speed·60초 Word Rain, 두벌식 한글 조합, 키보드 소리와 수집, 일일 목표를 제공합니다. iOS·Android는 같은 소스를 사용합니다.

**현재 상태:** 앱 소스, 콘텐츠, SQLite 저장소, 자동 테스트, 웹 미리보기와 양 플랫폼 Hermes 번들이 준비되어 있습니다. APK/IPA의 실제 컴파일·서명·설치와 실기기 검증은 아직 통과한 것으로 간주하지 않습니다. 정확한 결과는 [QA 보고서](docs/QA_REPORT.md), 남은 조건은 [외부 차단 항목](docs/EXTERNAL_BLOCKERS.md)을 확인하세요.

## 바로 실행

Node 22.22.0과 npm을 권장합니다. 이 저장소에는 동일 버전의 로컬 Node 개발 의존성도 포함됩니다. PowerShell에서:

```powershell
cd C:\workspace\asmr_keypad
npm ci
Copy-Item .env.example .env
npm run web
```

처음 실행하면 앱 언어 확인 → 학습 언어 선택 → 가상 키보드 순서로 진행됩니다. 기기 언어가 기본 선택되고, 설명 슬라이드·로그인·초기 알림 권한 요청이 없습니다. 운영체제 키보드를 띄우는 입력창은 게임에 사용하지 않습니다.

Native development build (Android SDK/ADB 또는 macOS/Xcode 필요):

```powershell
npm run android
npm run ios
npm start -- --dev-client
```

AdMob / RevenueCat 네이티브 모듈이 포함되어 있으므로 개발 빌드를 사용하세요. 웹 미리보기는 별도 네이티브 도구 없이 실행됩니다.

## 검증 명령

```powershell
npm run lint
npm run typecheck
npm test
npm run test:native
npm run content:validate
npm run doctor
$env:EXPO_PUBLIC_PROVIDER_MODE='mock'
npm run export:web
npx playwright install chromium
npm run test:e2e
npm run export:native
```

`npm test`는 순수 로직·저장소·서비스 테스트, `test:native`는 React Native Testing Library 키보드 통합 테스트입니다. `test:e2e`는 Chromium에서 실제 UI, 오프라인 진행, 보상·복원, 세 화면 크기와 긴 문장을 검사하며 `artifacts/screenshots/`에 캡처를 남깁니다. Word Rain 종료 검증에는 Playwright 가상 시계를 사용합니다. 기기 렌더링 성능 측정과 혼동하지 마세요.

정적 미리보기는 `npm run export:web` 후 `npm run preview`로 실행합니다. 주소는 `http://127.0.0.1:8081`입니다. 모바일 화면 검토용 웹 저장소는 localStorage이며, 실제 iOS/Android에서는 SQLite가 원본 저장소입니다.

## 구성

| 경로 | 역할 |
| --- | --- |
| `app/` | Expo Router 시작·홈·학습·결과·컬렉션·설정 |
| `src/screens/`, `src/components/` | 스크롤 없는 게임 화면, 가상 키보드, 안전 영역 |
| `src/domain/` | 한글 조합, 정답·접두사 비교, 등급·숙련도·복습·경제·연속 기록 |
| `src/state/` | 세션·Word Rain 전이, 정확한 시간 측정, Zustand, 저장 데이터 검증 |
| `src/db/` | SQLite SQL 마이그레이션, Drizzle 스키마, 원자적 저장과 관계형 기록 |
| `src/content/`, `content/` | 양방향 244개 원본 콘텐츠, Zod·SHA-256 검증, 버전별 팩 |
| `src/audio/`, `assets/audio/` | 8개 테마 × 8개 원본 WAV, 미리 로딩하는 중첩 재생 풀 |
| `src/services/` | 개발 시뮬레이션, 실제 AdMob·RevenueCat 브리지, 알림 |
| `src/analytics/` | 명시적 설정 시 PostHog·Sentry, 개인정보 필터, 기본 네트워크 비활성 |
| `e2e/`, `tests/` | Maestro 흐름, 브라우저 E2E, 도메인·SQLite·컴포넌트 테스트 |

패키지는 Expo SDK 57 호환 범위로 설치했고 정확한 해결 버전은 `package-lock.json`에 고정됩니다. [SDK 공식 릴리스](https://expo.dev/changelog/sdk-57)를 기준으로 호환성을 확인했습니다. Skia나 외부 서버는 기본 학습에 필요하지 않습니다. TanStack Query는 외부 스토어 상품 조회에 사용합니다.

## 데이터와 조정

영어 92개 단어·30개 짧은 문장/표현과 한국어 대응 항목으로 총 244개 방향별 항목을 제공합니다. 큰 사전을 무단 수집하지 않았습니다. 표준 정답과 명시한 별칭만 채점합니다. 수업은 미노출 단어를 우선하고, Recall은 학습한 항목을 복습 일정 순으로, Rain은 충분히 회상한 항목 중 취약·복습 예정 항목에 가중치를 둡니다.

```powershell
npm run content:validate -- --write
npm run content:validate -- --input path/to/pack.json
```

보상·등급은 `src/domain/config.ts`, 세션 설정은 `src/state/model.ts`, Rain은 `src/state/rain.ts`, 키보드 가격·색은 `src/design-system/theme.ts`에서 조정합니다. 테마는 점수나 학습 능력을 바꾸지 않습니다. 토큰은 하나의 원장으로 지급·차감되고 세션·광고·구매 복원은 중복 지급을 막습니다. 최근 세션/정답 로그는 100세션으로 제한하고 경제 원장은 보존합니다.

## 서비스와 빌드

`.env.example`의 mock 모드는 실제 광고·결제 없이 전체 흐름을 실행합니다. 결과 화면의 광고는 선택 사항이며 개발 화면에는 시뮬레이션 표시가 있습니다. 운영 모드는 설정이 없으면 안전하게 사용 불가 상태를 표시합니다. 실제 가격은 SDK가 반환합니다. [서비스 연결 안내](src/services/README.md), [관측 설정](docs/OBSERVABILITY.md), [출시 체크리스트](docs/RELEASE_CHECKLIST.md)를 참조하세요.

EAS 계정·프로젝트와 플랫폼 자격 증명을 연결한 다음 실행합니다:

```powershell
npx eas-cli login
npx eas-cli init
npx eas-cli build --platform android --profile preview
npx eas-cli build --platform ios --profile preview
npx eas-cli build --platform all --profile production
```

`development`는 개발 클라이언트, `preview`는 내부 배포/Android APK, `production`은 운영 서비스 모드입니다. 광고 앱 ID가 없는 네이티브 미리보기는 Google 공식 테스트 앱 ID로 초기화 안전성을 확보하며, 운영 광고는 별도 실제 설정 없이는 요청하지 않습니다. 스토어 비밀 키·서비스 역할 키·서명 키를 `EXPO_PUBLIC_*`에 넣지 마세요.

## 사양과 라이선스

기존 `MASTER_SPEC.md`, `ASTRA_E2E_PROMPT.md`와 `docs/*_SPEC.md`, `GAME_DESIGN.md`, `DATA_MODEL.md`, `BM_ECONOMY.md`, `CONTENT_PIPELINE.md`, `ANALYTICS.md`, `IMPLEMENTATION_ORDER.md`, `QA_ACCEPTANCE.md`는 원본 요구사항으로 보존했습니다. 실행 기록은 [구현 계획](docs/IMPLEMENTATION_PLAN.md)에 남깁니다.

코드·콘텐츠: [0BSD](LICENSE), [콘텐츠 출처](CONTENT_LICENSES.md). 음원: [CC0 원본 합성 자산](ASSET_LICENSES.md). `node scripts/generate-audio.cjs`로 재생성할 수 있습니다.
