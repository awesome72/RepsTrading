import { InfoTooltip } from "@/components/info-tooltip";
import { getGlossaryTerm } from "@/lib/glossary";

type TermProps = {
  id: string;
  children?: React.ReactNode;
};

export function Term({ id, children }: TermProps) {
  const entry = getGlossaryTerm(id);
  if (!entry) {
    return <>{children}</>;
  }

  return (
    <InfoTooltip
      content={entry.description}
      triggerClassName="font-medium text-foreground underline decoration-muted-foreground decoration-dotted underline-offset-4 cursor-help"
    >
      {children ?? entry.term}
    </InfoTooltip>
  );
}
