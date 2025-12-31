'use client';

interface FilterOption {
  id: string;
  label: string;
}

interface FilterButtonsProps {
  options: FilterOption[];
  selected: string;
  onSelect: (id: string) => void;
  label?: string;
}

export default function FilterButtons({ options, selected, onSelect, label }: FilterButtonsProps) {
  if (options.length === 0) return null;

  return (
    <div className="mb-6">
      {label && (
        <p className="text-sm text-app-muted mb-2 w-full">{label}</p>
      )}
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option.id}
            onClick={() => onSelect(option.id)}
            className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
              selected === option.id
                ? 'bg-tokens-brandGreen text-app-bg'
                : 'bg-app-bg text-app-fg hover:bg-app-card'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}


