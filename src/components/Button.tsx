import { ButtonHTMLAttributes, forwardRef } from 'react';
import clsx from 'clsx';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  fullWidth?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', fullWidth, children, ...props }, ref) => {
    const baseStyles = "relative flex items-center justify-center gap-2 px-6 py-4 rounded-2xl font-bold transition-all active:scale-95 overflow-hidden font-sans";
    
    const variants = {
      primary: "bg-gradient-to-r from-primary to-yellow-500 text-black shadow-[0_0_20px_rgba(255,193,7,0.3)] hover:shadow-[0_0_25px_rgba(255,193,7,0.5)]",
      secondary: "bg-surface text-white border border-white/10 hover:bg-white/5",
      danger: "bg-failure/20 text-failure border border-failure/30 hover:bg-failure/30",
      ghost: "bg-transparent text-white/70 hover:text-white hover:bg-white/5"
    };

    return (
      <button
        ref={ref}
        className={clsx(baseStyles, variants[variant], fullWidth && "w-full", className)}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
