import { TutorialPlayer } from "@/components/tutorial/tutorial-player";
import { pageMetadata } from "@/lib/seo/pages";

export const metadata = pageMetadata("/tutorial");

export default function TutorialPage() {
  return <TutorialPlayer />;
}
