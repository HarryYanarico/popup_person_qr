interface SpinnerProps {
  label?: string;
}

// Spinner accesible: texto alternativo visible + role="status"
export function Spinner({ label }: SpinnerProps) {
  return (
    <div role="status" className="flex flex-col items-center gap-3">
      <span className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-600 border-t-indigo-400" aria-hidden="true" />
      {label ? <p className="text-sm text-zinc-400">{label}</p> : null}
    </div>
  );
}
