"use client";

function Chip({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
        selected
          ? "border-primary bg-primary/20 text-primary"
          : "border-border/60 bg-muted/30 text-muted-foreground hover:border-border hover:text-foreground"
      }`}
    >
      {label}
    </button>
  );
}

export function ChipGroup({
  options,
  selected,
  multi = false,
  onChange,
}: {
  options: string[];
  selected: string | string[];
  multi?: boolean;
  onChange: (val: string | string[]) => void;
}) {
  const isSelected = (opt: string) =>
    multi ? (selected as string[]).includes(opt) : selected === opt;

  const toggle = (opt: string) => {
    if (multi) {
      const arr = selected as string[];
      onChange(arr.includes(opt) ? arr.filter((v) => v !== opt) : [...arr, opt]);
    } else {
      onChange(opt === selected ? "" : opt);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <Chip key={opt} label={opt} selected={isSelected(opt)} onClick={() => toggle(opt)} />
      ))}
    </div>
  );
}
