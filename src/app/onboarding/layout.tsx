import { pageMetadata } from "@/lib/seo/pages";

// page.tsx가 클라이언트 컴포넌트라 metadata는 이 서버 레이아웃에서 내보낸다
export const metadata = pageMetadata("/onboarding");

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
