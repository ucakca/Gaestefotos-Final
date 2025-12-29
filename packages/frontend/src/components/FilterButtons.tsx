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
        <p className="text-sm text-gray-600 mb-2 w-full">{label}</p>
      )}
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option.id}
            onClick={() => onSelect(option.id)}
            className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
              selected === option.id
                ? 'bg-[#295B4D] text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}


