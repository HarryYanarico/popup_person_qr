import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  // Mínimo 44px de alto (accesibilidad, RF requisitos no funcionales)
  size?: 'sm' | 'md';
  children: ReactNode;
}

const variantClasses: Record<Variant, string> = {
  primary:
    'bg-indigo-600 text-white hover:bg-indigo-500 focus-visible:ring-indigo-400',
  secondary:
    'bg-zinc-800 text-zinc-100 hover:bg-zinc-700 focus-visible:ring-zinc-500',
  ghost:
    'bg-transparent text-zinc-300 hover:bg-zinc-800/60 focus-visible:ring-zinc-500',
  danger: 'bg-red-600 text-white hover:bg-red-500 focus-visible:ring-red-400',
};

const sizeClasses = {
  // 44px mínimo para táctil
  sm: 'min-h-[44px] px-4 text-sm',
  md: 'min-h-[48px] px-6 text-base',
};

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  type = 'button',
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 disabled:cursor-not-allowed disabled:opacity-50 ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
