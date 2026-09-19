# KeyLingo UI and Two-Hand Keyboard Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 프리미엄 아케이드 시각 언어와 양손 엄지 입력에 맞춘 하단 3D 키보드를 기존 KeyLingo 기능 위에 적용한다.

**Architecture:** 기존 `Keyboard → onKey → Practice state → score/session` 데이터 흐름은 유지한다. 디자인 토큰, 독립적인 `Keycap`, 단일 `KeyFeedbackLayer`, 하단 전용 `PracticeLayout`을 추가하고 각 화면은 이 공통 단위를 조합한다. 애니메이션 실패나 비활성화가 입력·채점·저장에 영향을 주지 않도록 시각 상태를 도메인 상태와 분리한다.

**Tech Stack:** Expo 57, React 19, React Native 0.86, Expo Router, React Native Reanimated 4.5, Jest, React Native Testing Library, Playwright.

**Spec:** `docs/superpowers/specs/2026-09-19-keylingo-ui-keyboard-redesign-design.md`

## Global Constraints

- 휴대폰 폭 320~480px에서 키보드 좌우 여백은 8px를 기준으로 하고 가용 폭의 약 96%를 사용한다.
- 더 넓은 화면에서 키보드 폭은 최대 560px이며 중앙 정렬한다.
- 키 높이는 기본 42px, 작은 화면에서 최소 39px다.
- 열 간격은 3~4px, 행 간격은 8px다.
- 키 이동 거리는 기본 7px, 눌림은 60~80ms, 복귀는 90~120ms다.
- 키별 PNG, WebP 또는 다른 래스터 이미지를 사용하지 않는다.
- 기존 한글 두벌식, 영문 QWERTY, Shift, Backspace, Space, 문장 부호 동작을 유지한다.
- 프로필, 경제, 콘텐츠, 숙련도, 세션 저장 형식을 변경하지 않는다.
- Reduce Motion에서는 이동·확대·팝업을 끄고 색상·명도 상태는 유지한다.
- 현재 `C:\workspace\asmr_keypad`에는 `.git`이 없다. 각 작업의 커밋 명령은 실행 전에 이 폴더가 Git 저장소에 연결되거나 초기화된 경우에만 수행한다. Git이 없는 상태에서는 같은 검증 단위에서 멈추고 변경 파일 목록과 테스트 결과를 기록한다.

## Review Focus

- **320×568의 짧고 좁은 화면:** 키보드가 잘리거나 문서 스크롤이 생기지 않고 최소 키 높이를 유지해야 한다. Task 4의 Playwright 검증이 담당한다.
- **빠른 연타와 press-in/press 중복:** 다섯 번의 빠른 입력은 정확히 다섯 번 전달되어야 한다. Task 3의 네이티브 컴포넌트 테스트가 담당한다.
- **한글 조합 중 ghost suffix:** `ㅅ → ㅏ → ㄱ → ㅗ → ㅏ` 입력에서 기존 `사과` 조합과 ghost 진행 상태가 유지되어야 한다. Task 4의 기존 브라우저 회귀 테스트를 확장한다.
- **Reduce Motion:** 입력 callback과 눌린 색상은 유지하면서 이동·팝업을 만들지 않아야 한다. Task 2와 Task 3의 네이티브 테스트가 담당한다.
- **일시정지·정답 피드백 중 비활성 키보드:** 오디오, 문자 입력, 새 팝업이 발생하지 않아야 한다. Task 3의 disabled 테스트와 Task 4의 화면 테스트가 담당한다.

---

### Task 1: 3D 디자인 토큰과 테마 계약

**Files:**
- Create: `tests/theme.test.ts`
- Modify: `src/design-system/theme.ts`

**Interfaces:**
- Consumes: 기존 `KeyboardTheme`, `themes`, `getTheme(id)`.
- Produces: `KeyboardSurfaceTokens`, `motion`, `keyboardLayout`, 그리고 모든 테마의 `surface` 필드.

- [ ] **Step 1: 모든 키보드 테마가 입체 표면 토큰을 제공하는 실패 테스트 작성**

```ts
import { getTheme, themes, keyboardLayout, motion } from "../src/design-system/theme";

test("every keyboard theme provides complete 3D surface tokens", () => {
  for (const theme of themes) {
    expect(theme.surface).toEqual(
      expect.objectContaining({
        deckTop: expect.any(String),
        deckSide: expect.any(String),
        keyTop: expect.any(String),
        keySide: expect.any(String),
        pressedTop: expect.any(String),
        pressedSide: expect.any(String),
        legend: expect.any(String),
        glow: expect.any(String),
      }),
    );
  }
  expect(getTheme("missing").id).toBe("starter");
  expect(keyboardLayout).toMatchObject({ sideInset: 8, keyHeight: 42, minKeyHeight: 39, columnGap: 3, rowGap: 8, maxWidth: 560 });
  expect(motion).toMatchObject({ keyTravel: 7, pressMs: 70, releaseMs: 105, feedbackMs: 520 });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx jest --runInBand tests/theme.test.ts`

Expected: FAIL with missing `surface`, `keyboardLayout`, and `motion` exports.

- [ ] **Step 3: 입체 토큰 타입과 고정 치수 구현**

```ts
export interface KeyboardSurfaceTokens {
  deckTop: string;
  deckSide: string;
  keyTop: string;
  keySide: string;
  pressedTop: string;
  pressedSide: string;
  legend: string;
  glow: string;
}

export const keyboardLayout = {
  sideInset: 8,
  keyHeight: 42,
  minKeyHeight: 39,
  columnGap: 3,
  rowGap: 8,
  maxWidth: 560,
} as const;

export const motion = {
  keyTravel: 7,
  pressMs: 70,
  releaseMs: 105,
  feedbackMs: 520,
} as const;
```

`KeyboardTheme`에 `surface: KeyboardSurfaceTokens`를 추가하고 Starter, Clicky Blue, Creamy, Deep Thock, Retro, Silent, Sky 65, Midnight에 각각 명시적인 값을 입력한다. 기존 `base`, `key`, `ink`, `accent`, 가격 및 잠금 값은 저장 호환성을 위해 유지한다.

| Theme | deckTop | deckSide | keyTop | keySide | pressedTop | pressedSide | legend | glow |
|---|---|---|---|---|---|---|---|---|
| starter | `#E0EDF8` | `#A9C8E1` | `#FFFFFF` | `#B4CEE3` | `#A3D5FF` | `#69A5D6` | `#153975` | `#61B9FF` |
| clicky | `#D3E5F6` | `#8DB5D7` | `#EAF6FF` | `#A0C7E6` | `#61B9FF` | `#2F88CC` | `#16497C` | `#38A6FF` |
| creamy | `#E9E0CF` | `#C9B99D` | `#FFFAED` | `#D9C9A9` | `#E5C492` | `#B68B51` | `#665138` | `#F4C56F` |
| thock | `#293A49` | `#17252E` | `#415A69` | `#263D49` | `#78BAAE` | `#3F8177` | `#F5F9F8` | `#78E0CC` |
| retro | `#DDDACE` | `#AFA99A` | `#F5F0E5` | `#C7BDAB` | `#E8A385` | `#B36E54` | `#495B54` | `#F6A479` |
| silent | `#E5E9EC` | `#BBC4CB` | `#FAFAFA` | `#CFD7DC` | `#BECBD5` | `#8FA0AD` | `#505C69` | `#B9D5E5` |
| sky | `#C5DEF5` | `#7FACE0` | `#F2FAFF` | `#AACCEB` | `#94C6F5` | `#5A98CE` | `#23528B` | `#66B8FF` |
| midnight | `#202B44` | `#111827` | `#354263` | `#1F2A43` | `#9AACE5` | `#6778B8` | `#EAF3FF` | `#A6B8FF` |

- [ ] **Step 4: 토큰 테스트와 타입 검사 통과 확인**

Run: `npx jest --runInBand tests/theme.test.ts && npm run typecheck`

Expected: PASS and TypeScript exits 0.

- [ ] **Step 5: 검토 단위 기록 또는 커밋**

```bash
git add src/design-system/theme.ts tests/theme.test.ts
git commit -m "feat: add 3d keyboard design tokens"
```

Expected: Git 저장소가 있으면 commit 생성. Git이 없으면 두 파일과 테스트 결과를 작업 기록에 남긴다.

---

### Task 2: 독립적인 3층 `Keycap` 컴포넌트

**Files:**
- Create: `src/components/Keycap.tsx`
- Create: `tests/keycap.native.test.tsx`

**Interfaces:**
- Consumes: `KeyboardTheme`, `motion`, `KeyboardSurfaceTokens` from Task 1.
- Produces:

```ts
export interface KeycapProps {
  label: string;
  accessibilityLabel: string;
  testID: string;
  flex?: number;
  disabled?: boolean;
  reducedMotion: boolean;
  theme: KeyboardTheme;
  onTrigger: () => void;
  onVisualPress?: () => void;
}
```

- [ ] **Step 1: 접근성, 단일 입력, disabled, Reduce Motion 계약 테스트 작성**

```tsx
import React from "react";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { Keycap } from "../src/components/Keycap";
import { getTheme } from "../src/design-system/theme";

jest.mock("react-native-reanimated", () => require("react-native-reanimated/mock"));

test("triggers once on press-in and preserves its accessible label", () => {
  const onTrigger = jest.fn();
  render(<Keycap label="a" accessibilityLabel="a" testID="key-a" reducedMotion={false} theme={getTheme("starter")} onTrigger={onTrigger} />);
  fireEvent(screen.getByTestId("key-a"), "pressIn");
  fireEvent.press(screen.getByTestId("key-a"));
  expect(onTrigger).toHaveBeenCalledTimes(1);
  expect(screen.getByLabelText("a")).toBeTruthy();
});

test("disabled keycaps never emit input or visual events", () => {
  const onTrigger = jest.fn();
  const onVisualPress = jest.fn();
  render(<Keycap label="a" accessibilityLabel="a" testID="key-a" disabled reducedMotion theme={getTheme("starter")} onTrigger={onTrigger} onVisualPress={onVisualPress} />);
  fireEvent(screen.getByTestId("key-a"), "pressIn");
  expect(onTrigger).not.toHaveBeenCalled();
  expect(onVisualPress).not.toHaveBeenCalled();
});

test("reduced motion keeps input while suppressing popup animation", () => {
  const onTrigger = jest.fn();
  const onVisualPress = jest.fn();
  render(<Keycap label="a" accessibilityLabel="a" testID="key-a" reducedMotion theme={getTheme("starter")} onTrigger={onTrigger} onVisualPress={onVisualPress} />);
  fireEvent(screen.getByTestId("key-a"), "pressIn");
  expect(onTrigger).toHaveBeenCalledTimes(1);
  expect(onVisualPress).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: 실패 확인**

Run: `npm run test:native -- --runTestsByPath tests/keycap.native.test.tsx`

Expected: FAIL because `src/components/Keycap.tsx` does not exist.

- [ ] **Step 3: 3층 키캡과 UI 스레드 애니메이션 구현**

`Keycap.tsx`는 하나의 `Pressable` 안에 `switchLayer`, `sideLayer`, `Animated.View`인 `topLayer`, `Text` legend를 렌더링한다. `onPressIn`에서 callback을 한 번 호출하고 shared value를 1로, `onPressOut`과 취소 경로에서 0으로 복귀시킨다.

```tsx
const pressed = useSharedValue(0);
const animatedTop = useAnimatedStyle(() => ({
  transform: [{ translateY: reducedMotion ? 0 : pressed.value * motion.keyTravel }],
  backgroundColor: interpolateColor(
    pressed.value,
    [0, 1],
    [theme.surface.keyTop, theme.surface.pressedTop],
  ),
}));

const animatedSide = useAnimatedStyle(() => ({
  opacity: reducedMotion ? 1 : 1 - pressed.value * 0.82,
  backgroundColor: interpolateColor(
    pressed.value,
    [0, 1],
    [theme.surface.keySide, theme.surface.pressedSide],
  ),
}));

const pressIn = () => {
  if (disabled) return;
  pressed.value = withTiming(1, { duration: reducedMotion ? 0 : motion.pressMs });
  onTrigger();
  if (!reducedMotion) onVisualPress?.();
};

const release = () => {
  pressed.value = withTiming(0, { duration: reducedMotion ? 0 : motion.releaseMs });
};
```

웹과 네이티브 공통 그림자는 `keySide` 색상의 절대 위치 층으로 만들고, 플랫폼별 shadow/elevation은 보조 효과로만 사용한다.

- [ ] **Step 4: 컴포넌트 테스트와 타입 검사 통과 확인**

Run: `npm run test:native -- --runTestsByPath tests/keycap.native.test.tsx && npm run typecheck`

Expected: PASS and TypeScript exits 0.

- [ ] **Step 5: 검토 단위 기록 또는 커밋**

```bash
git add src/components/Keycap.tsx tests/keycap.native.test.tsx
git commit -m "feat: add tactile 3d keycap"
```

---

### Task 3: 하단 키보드 도크와 단일 피드백 레이어

**Files:**
- Create: `src/components/KeyboardDock.tsx`
- Create: `src/components/KeyFeedbackLayer.tsx`
- Modify: `src/components/Keyboard.tsx`
- Modify: `tests/keyboard.native.test.tsx`

**Interfaces:**
- Consumes: `KeycapProps`, `KeyboardTheme.surface`, `keyboardLayout`, `motion`.
- Produces:

```ts
export type KeyboardFeedbackMode = "quiet" | "score";
export interface KeyFeedbackEvent {
  id: number;
  label: string;
  row: number;
  column: number;
}

export interface KeyboardProps {
  language: "en" | "ko";
  themeId: string;
  settings: Settings;
  onKey: (key: string) => void;
  sentence?: boolean;
  disabled?: boolean;
  height?: number;
  bottomInset?: number;
  feedbackMode?: KeyboardFeedbackMode;
}
```

- [ ] **Step 1: 빠른 연타, disabled, Shift, 피드백 상한 테스트 추가**

`tests/keyboard.native.test.tsx`에 영어 harness를 추가한다.

```tsx
test("five rapid press-in events emit exactly five characters", () => {
  const onKey = jest.fn();
  render(<Keyboard language="en" themeId="starter" settings={createProfile("en").settings} onKey={onKey} />);
  for (let i = 0; i < 5; i++) fireEvent(screen.getByTestId("key-a"), "pressIn");
  expect(onKey).toHaveBeenCalledTimes(5);
  expect(onKey).toHaveBeenNthCalledWith(5, "a");
});

test("disabled keyboard emits no character and no feedback", () => {
  const onKey = jest.fn();
  render(<Keyboard language="en" themeId="starter" settings={createProfile("en").settings} onKey={onKey} disabled />);
  fireEvent(screen.getByTestId("key-a"), "pressIn");
  expect(onKey).not.toHaveBeenCalled();
  expect(screen.queryAllByTestId("key-feedback-event")).toHaveLength(0);
});
```

기존 한글 조합 테스트는 그대로 유지한다. Shift를 누른 뒤 `key-A`가 한 번 전달되는 테스트를 추가한다.

- [ ] **Step 2: 실패 확인**

Run: `npm run test:native -- --runTestsByPath tests/keyboard.native.test.tsx`

Expected: FAIL until `Keyboard` delegates to `Keycap` and exposes feedback events.

- [ ] **Step 3: `KeyboardDock` 구현**

`KeyboardDock`은 deck top, 13px deck side, 하단 inset 연결부를 렌더링하고 다음 스타일 계약을 적용한다.

```ts
const dock = {
  width: "100%" as const,
  maxWidth: keyboardLayout.maxWidth,
  alignSelf: "center" as const,
  paddingHorizontal: 6,
  paddingTop: 12,
  borderTopLeftRadius: 21,
  borderTopRightRadius: 21,
};
```

행은 `columnGap: 3`, `marginBottom: 8`을 사용하고 두 번째 행에만 8px 수평 inset을 준다. `bottomInset`은 deck side 색상의 별도 `View` 높이로 사용한다.

- [ ] **Step 4: `KeyFeedbackLayer` 구현**

단일 absolute overlay가 최근 이벤트 최대 3개를 렌더링한다. `quiet`은 입력 글자, `score`는 `+1`을 표시한다. `reducedMotion`이면 이벤트를 추가하지 않는다. 각 이벤트는 `motion.feedbackMs` 후 제거한다.

```ts
setEvents((current) => [...current, next].slice(-3));
setTimeout(() => setEvents((current) => current.filter((event) => event.id !== next.id)), motion.feedbackMs);
```

- [ ] **Step 5: `Keyboard`를 `Keycap`과 도크로 리팩터링**

현재 EN/KO 배열, Shift 변환, `playKey`, `preloadTheme`, `pressedKey` 중복 방지 로직은 유지한다. `key()` 내부의 평면 `Pressable`을 `Keycap`으로 교체하고 row/column 정보를 피드백 레이어에 전달한다. 일반 키는 flex 1, Shift와 Backspace는 1.5, Space는 6을 사용한다.

- [ ] **Step 6: 네이티브 키보드 회귀 테스트 통과 확인**

Run: `npm run test:native -- --runTestsByPath tests/keycap.native.test.tsx tests/keyboard.native.test.tsx`

Expected: PASS; 한글 `사과 → 사고` 회귀, 빠른 영어 입력, disabled, Shift가 모두 통과한다.

- [ ] **Step 7: 검토 단위 기록 또는 커밋**

```bash
git add src/components/KeyboardDock.tsx src/components/KeyFeedbackLayer.tsx src/components/Keyboard.tsx tests/keyboard.native.test.tsx
git commit -m "feat: rebuild keyboard as full-width tactile dock"
```

---

### Task 4: 학습 화면과 Rain의 양손 레이아웃

**Files:**
- Create: `src/components/PracticeLayout.tsx`
- Modify: `src/screens/Practice.tsx`
- Modify: `src/screens/RainPractice.tsx`
- Modify: `e2e/browser/core.spec.ts`

**Interfaces:**
- Consumes: Task 3의 `KeyboardProps`, 기존 `Screen`과 safe-area context.
- Produces:

```ts
export interface PracticeLayoutProps {
  header: React.ReactNode;
  progress: React.ReactNode;
  body: React.ReactNode;
  actions?: React.ReactNode;
  keyboard: React.ReactNode;
  overlay?: React.ReactNode;
}
```

- [ ] **Step 1: 소형 화면과 96% 도크 검증을 E2E에 추가**

`fit(page)`를 다음 검증으로 확장한다.

```ts
async function fitKeyboardDock(page: Page) {
  const viewport = page.viewportSize()!;
  const board = await page.getByTestId("virtual-keyboard").boundingBox();
  expect(board).not.toBeNull();
  expect(board!.x).toBeGreaterThanOrEqual(4);
  expect(viewport.width - board!.x - board!.width).toBeGreaterThanOrEqual(4);
  expect(board!.width / viewport.width).toBeGreaterThanOrEqual(0.94);
  expect(board!.y + board!.height).toBeLessThanOrEqual(viewport.height);
}
```

시각 화면 목록 앞에 `{ width: 320, height: 568 }`을 추가한다. 일시정지 overlay에서 `key-a`를 클릭해도 answer region이 변하지 않는 검증을 별도 테스트로 추가한다.

- [ ] **Step 2: 기존 코드에서 테스트 실패 확인**

Run: `npm run export:web && npm run test:e2e -- --grep "visual en 320x568|paused keyboard"`

Expected: FAIL because the current 22px content inset makes the keyboard narrower than 94% or the new paused test has no matching flow.

- [ ] **Step 3: `PracticeLayout` 구현**

`SafeAreaView edges={["top", "left", "right"]}` 안에 최대 560px 컨테이너를 만들고 header/progress/body/actions는 22px 콘텐츠 패딩에 둔다. keyboard는 `paddingHorizontal: 8`의 별도 하단 슬롯에 둔다. 하단 inset은 `KeyboardDock`이 deck side 색상으로 직접 렌더링해 이중 여백을 막는다. `body`에만 `flex: 1`과 `minHeight: 0`을 적용한다.

- [ ] **Step 4: `Practice`에 레이아웃 적용**

기존 타이머, 입력, 채점, 세션 저장 함수는 이동하지 않는다. JSX의 최상위 구조만 `PracticeLayout`으로 교체하고 `Keyboard`에 `bottomInset={insets.bottom}`, `feedbackMode={mode === "SPEED" ? "score" : "quiet"}`를 전달한다. 짧은 화면에서는 prompt 폰트와 body gap을 줄이는 기존 계산을 유지하고 키 높이는 39px 아래로 내려가지 않게 한다.

- [ ] **Step 5: `RainPractice`에 같은 하단 도크 적용**

Rain의 낙하 영역은 body 슬롯에, 시작/일시정지 행동은 actions 슬롯에 둔다. `Keyboard`에는 `feedbackMode="score"`를 전달한다. 게임 시작 전에도 키보드 높이와 하단 연결부가 변하지 않게 한다.

- [ ] **Step 6: 한글 조합, 긴 문장, 작은 화면 검증**

Run: `npm run export:web && npm run test:e2e -- --grep "visual|long sentence|Korean in-progress|sentences are reachable|paused keyboard"`

Expected: PASS at 320×568, 375×667, 390×844, 430×932 with no horizontal or vertical document overflow.

- [ ] **Step 7: 네이티브 회귀 확인**

Run: `npm run test:native`

Expected: PASS.

- [ ] **Step 8: 검토 단위 기록 또는 커밋**

```bash
git add src/components/PracticeLayout.tsx src/screens/Practice.tsx src/screens/RainPractice.tsx e2e/browser/core.spec.ts
git commit -m "feat: fit practice keyboard to two-hand footer"
```

---

### Task 5: 공통 UI와 홈 화면의 프리미엄 아케이드 계층

**Files:**
- Modify: `src/components/ui.tsx`
- Modify: `src/design-system/theme.ts`
- Modify: `app/home.tsx`
- Modify: `e2e/browser/core.spec.ts`

**Interfaces:**
- Consumes: Task 1의 화면 색상·간격·모션 토큰.
- Produces: 기존 이름을 유지한 `Screen`, `Header`, `Label`, `Card`, `Button`, `Nav`, `styles`와 새 `ProgressRail`.

- [ ] **Step 1: 홈 핵심 행동과 정보 계층 E2E 검증 추가**

튜토리얼 완료 후 홈에서 다음을 검증한다.

```ts
await expect(page.getByTestId("daily-progress")).toBeVisible();
await expect(page.getByTestId("start-learning")).toBeVisible();
await expect(page.getByTestId("mode-GUIDED")).toBeVisible();
await expect(page.getByTestId("mode-RECALL")).toBeVisible();
```

375×667에서 `start-learning`의 bounding box가 viewport 안에 있고 모드 카드 텍스트가 잘리지 않는 검증을 추가한다.

- [ ] **Step 2: 새 testID가 없어 실패하는지 확인**

Run: `npm run export:web && npm run test:e2e -- --grep "English tutorial"`

Expected: FAIL because `daily-progress` is not present.

- [ ] **Step 3: 공통 표면과 버튼 눌림 구현**

`Button`은 기존 API를 유지하고 pressed 상태에서 2px 아래로 이동하며 아래 그림자가 줄어들게 한다. `Card`는 1px 테두리 대신 명도 차이와 얕은 그림자를 사용한다. `Nav`는 활성 항목의 텍스트와 표면을 함께 바꾼다. 모든 일반 행동 버튼은 최소 높이 44px 이상을 유지한다.

- [ ] **Step 4: `ProgressRail` 추가**

```tsx
export function ProgressRail({ value, testID }: { value: number; testID?: string }) {
  const clamped = Math.max(0, Math.min(1, value));
  return <View testID={testID} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped * 100) }} style={styles.progressTrack}><View style={[styles.progressFill, { width: `${clamped * 100}%` }]} /></View>;
}
```

- [ ] **Step 5: 홈 화면 재구성**

일일 목표, 연속 학습, 레벨, 시작 버튼을 하나의 hero surface로 묶고 `ProgressRail testID="daily-progress"`를 사용한다. Words/Short sentences segmented choice와 네 모드의 라우팅·잠금 로직은 현재 코드를 그대로 유지한다. 모드 카드는 mark, 제목, 한 줄 설명, 상태 화살표만 표시한다.

- [ ] **Step 6: 홈 회귀 및 스크린샷 확인**

Run: `npm run export:web && npm run test:e2e -- --grep "English tutorial"`

Expected: PASS and writes updated `artifacts/screenshots/home-375x667.png` without page errors.

- [ ] **Step 7: 검토 단위 기록 또는 커밋**

```bash
git add src/components/ui.tsx src/design-system/theme.ts app/home.tsx e2e/browser/core.spec.ts
git commit -m "feat: apply premium arcade ui hierarchy"
```

---

### Task 6: 결과, 컬렉션, 설정, 온보딩 일관성

**Files:**
- Modify: `app/result.tsx`
- Modify: `app/collection.tsx`
- Modify: `app/settings.tsx`
- Modify: `app/onboarding.tsx`
- Modify: `e2e/browser/core.spec.ts`

**Interfaces:**
- Consumes: Task 3의 `Keyboard`, Task 5의 공통 UI 컴포넌트.
- Produces: 기존 route와 testID를 유지하는 일관된 보조 화면.

- [ ] **Step 1: 보조 화면의 핵심 상태 E2E 검증 추가**

기존 전체 튜토리얼 테스트에 다음 assertion을 추가한다.

```ts
await expect(page.getByTestId("result-rank")).toBeVisible();
await expect(page.getByTestId("result-rewards")).toBeVisible();
await page.getByRole("button", { name: "Meet your first keyboard" }).click();
await expect(page.getByTestId("theme-preview-keyboard")).toBeVisible();
```

설정 화면에서 Sound, Haptics, Effects의 switch가 기존 저장 상태를 유지하는 검증을 추가한다.

- [ ] **Step 2: 새 testID가 없어 실패하는지 확인**

Run: `npm run export:web && npm run test:e2e -- --grep "English tutorial"`

Expected: FAIL at `result-rank` or `theme-preview-keyboard`.

- [ ] **Step 3: 결과 화면 정리**

랭크에 `result-rank`, XP·토큰 그룹에 `result-rewards`를 부여한다. 랭크, 정확도/WPM, 획득 보상, 행동 순서로 시각 계층을 재구성한다. 보상 광고, provider mode, 결과 저장 로직은 수정하지 않는다.

- [ ] **Step 4: 컬렉션 미리보기 정리**

기존 전체 `Keyboard`를 `testID="theme-preview-keyboard"`를 가진 preview surface 안에서 재사용한다. 테마 선택 타일은 `surface.deckTop`, `surface.keyTop`, `surface.keySide`, `surface.pressedTop` 색상을 가진 축소 키캡 네 개로 표시한다. 잠김, 가격, 선택, 장착 상태의 기존 도메인 로직은 유지한다.

- [ ] **Step 5: 설정과 온보딩 표면 정리**

설정의 switch, 음량, 목표, 리마인더, 언어, 구매 카드는 Task 5의 표면과 간격을 사용한다. 온보딩의 두 단계와 분석 이벤트는 유지하고, 학습 언어 선택 후 기존 튜토리얼로 이동해 새 키보드를 바로 체험하게 한다.

- [ ] **Step 6: 보조 화면 회귀 확인**

Run: `npm run export:web && npm run test:e2e -- --grep "English tutorial|optional mock ad"`

Expected: PASS; result, collection, home, settings screenshots are regenerated and provider flows remain idempotent.

- [ ] **Step 7: 검토 단위 기록 또는 커밋**

```bash
git add app/result.tsx app/collection.tsx app/settings.tsx app/onboarding.tsx e2e/browser/core.spec.ts
git commit -m "feat: unify supporting screens with tactile theme"
```

---

### Task 7: 전체 회귀, 플랫폼 export, 시각 승인 자료

**Files:**
- Modify: `docs/QA_REPORT.md`
- Modify: `docs/UX_UI_SPEC.md`
- Regenerate: `artifacts/screenshots/*.png`

**Interfaces:**
- Consumes: Tasks 1–6의 완성된 UI와 기존 테스트 스위트.
- Produces: 검증 결과와 최종 화면 증거.

- [ ] **Step 1: 포맷과 정적 검사 실행**

Run: `npx prettier --check "app/**/*.{ts,tsx}" "src/**/*.{ts,tsx}" "tests/**/*.{ts,tsx}" "e2e/**/*.ts" && npm run typecheck && npm run lint`

Expected: all commands exit 0.

- [ ] **Step 2: 단위 및 네이티브 테스트 실행**

Run: `npm test && npm run test:native`

Expected: all tests pass; no existing session, domain, database, provider, analytics, or keyboard regression.

- [ ] **Step 3: 웹 export와 전체 Playwright 실행**

Run: `npm run export:web && npm run test:e2e`

Expected: all browser tests pass at 320×568, 375×667, 390×844, 430×932 and screenshots are written under `artifacts/screenshots`.

- [ ] **Step 4: 네이티브 export와 Expo 진단 실행**

Run: `npm run export:native && npm run doctor`

Expected: Android and iOS export complete and Expo Doctor reports no blocking issue.

- [ ] **Step 5: 시각 상태 수동 확인**

다음 파일을 원본 크기로 확인한다.

- `artifacts/screenshots/en-320x568-guided.png`
- `artifacts/screenshots/ko-375x667-composing.png`
- `artifacts/screenshots/en-375x667-rain.png`
- `artifacts/screenshots/home-375x667.png`
- `artifacts/screenshots/result-375x667.png`
- `artifacts/screenshots/collection-375x667.png`
- `artifacts/screenshots/settings-375x667.png`

확인 기준은 키 잘림 없음, 키보드 좌우 여백 4~12px, deck와 safe area의 색상 연결, 프롬프트·키보드 겹침 없음, 누락 텍스트 없음이다.

- [ ] **Step 6: QA 문서 갱신**

`docs/QA_REPORT.md`에 실행 명령, 통과 수, 확인한 화면 크기, 남은 플랫폼 차이를 기록한다. `docs/UX_UI_SPEC.md`에는 3층 키캡, 96% 도크, 모션 시간, Reduce Motion 동작을 기준값으로 추가한다.

- [ ] **Step 7: 최종 검토 단위 기록 또는 커밋**

```bash
git add docs/QA_REPORT.md docs/UX_UI_SPEC.md artifacts/screenshots
git commit -m "test: verify tactile keyboard redesign"
```

- [ ] **Step 8: 최종 변경 검토**

Git 저장소가 있으면 `git status --short`가 비어 있는지 확인하고 `git log --oneline -7`로 각 검토 단위를 확인한다. Git이 없으면 Tasks 1–7의 변경 파일 목록과 모든 실행 명령의 종료 코드를 QA 보고서 마지막에 기록한다.
