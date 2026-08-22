interface Props {
  score: number;
}

function scoreStyle(score: number): { label: string; className: string } {
  if (score >= 70) return { label: "Bonne affaire", className: "bg-brand-100 text-brand-700" };
  if (score >= 40) return { label: "À creuser", className: "bg-amber-100 text-amber-800" };
  return { label: "Faible potentiel", className: "bg-neutral-100 text-neutral-600" };
}

export function DealScoreBadge({ score }: Props) {
  const { label, className } = scoreStyle(score);
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${className}`}>
      <span className="font-semibold">{score}</span>
      <span>· {label}</span>
    </span>
  );
}
