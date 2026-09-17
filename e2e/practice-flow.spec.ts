import { expect, test, type Page } from "@playwright/test";

/**
 * 핵심 흐름(계획 작성 → 재생 → 채점 → 결과 공개)을 게스트 모드로 끝까지 돈다.
 * 로그인이 필요 없는 유일한 전 구간 경로라서 CI(placeholder Supabase 값)에서도 그대로 돈다.
 */

async function clickByText(page: Page, text: string) {
  await page.locator('button, [role="button"]').filter({ hasText: text }).first().click();
}

test("계획을 적고 재생을 지켜본 뒤 채점하면 결과가 공개된다", async ({ page }) => {
  await page.goto("/practice");
  await expect(page.getByText("여기서 산다")).toBeVisible();

  await clickByText(page, "여기서 산다");

  await clickByText(page, "눌림목");
  await clickByText(page, "-3%");
  await clickByText(page, "2R");
  await clickByText(page, "계획 저장");

  // 계획을 저장하면 COMMITTED 상태로 넘어가 재생이 시작된다
  await expect(page.getByText("목표까지", { exact: false })).toBeVisible({ timeout: 15_000 });

  // 재생을 끝까지 기다리지 않고 바로 청산해 채점 화면으로 넘어간다
  await clickByText(page, "지금 판다");
  await expect(page.getByText("결과를 보기 전에", { exact: false })).toBeVisible({ timeout: 15_000 });

  // 직접 청산(manual)은 판단 점검 문항 없이 바로 채점 버튼이 뜬다
  await clickByText(page, "확인하고 결과 보기");

  await expect(page.getByText("이번 판단의 결과")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole("button", { name: "다음 연습" })).toBeVisible();
});

test("차트를 보고 지나가면 그 판단도 기록되고 결과가 공개된다", async ({ page }) => {
  await page.goto("/practice");
  await expect(page.getByText("여기서 산다")).toBeVisible();

  await clickByText(page, "지나간다");

  await expect(page.getByRole("button", { name: "다음 연습" })).toBeVisible({ timeout: 15_000 });
});
