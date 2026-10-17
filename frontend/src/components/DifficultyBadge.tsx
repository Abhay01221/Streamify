interface DifficultyBadgeProps {
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  size?: 'sm' | 'md';
}

export function DifficultyBadge({ difficulty, size = 'sm' }: DifficultyBadgeProps) {
  const classes = {
    EASY: 'badge-easy',
    MEDIUM: 'badge-medium',
    HARD: 'badge-hard',
  };

  const labels = {
    EASY: 'Easy',
    MEDIUM: 'Medium',
    HARD: 'Hard',
  };

  return (
    <span className={`${classes[difficulty]} ${size === 'md' ? 'text-sm px-3 py-1' : ''}`}>
      {labels[difficulty]}
    </span>
  );
}
