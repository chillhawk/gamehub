"use client";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface GlowButtonProps {
  children: React.ReactNode;
  variant?: "primary" | "outline" | "ghost" | "danger" | "gold";
  size?: "sm" | "md" | "lg" | "xl";
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  icon?: React.ReactNode;
  fullWidth?: boolean;
  type?: "button" | "submit" | "reset";
}

const variants = {
  primary: "bg-gradient-to-r from-nexus-blue to-nexus-purple text-white shadow-glow-blue hover:shadow-[0_0_40px_rgba(99,102,241,0.8)]",
  outline:  "bg-transparent border border-nexus-blue/50 text-nexus-blue hover:bg-nexus-blue/10 hover:border-nexus-blue hover:shadow-glow-blue",
  ghost:    "bg-transparent text-nexus-muted hover:text-nexus-text hover:bg-white/5",
  danger:   "bg-gradient-to-r from-nexus-crimson to-red-700 text-white shadow-[0_0_20px_rgba(239,68,68,0.4)] hover:shadow-[0_0_40px_rgba(239,68,68,0.8)]",
  gold:     "bg-gradient-to-r from-nexus-gold to-amber-500 text-black font-bold shadow-glow-gold hover:shadow-[0_0_40px_rgba(245,158,11,0.8)]",
};

const sizes = {
  sm: "px-4 py-2 text-xs rounded-md gap-1.5",
  md: "px-6 py-2.5 text-sm rounded-lg gap-2",
  lg: "px-8 py-3.5 text-base rounded-xl gap-2.5",
  xl: "px-10 py-4 text-lg rounded-xl gap-3",
};

export default function GlowButton({
  children, variant = "primary", size = "md", onClick,
  disabled, className, icon, fullWidth, type = "button",
}: GlowButtonProps) {
  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled}
      whileHover={{ scale: disabled ? 1 : 1.03, y: disabled ? 0 : -2 }}
      whileTap={{ scale: disabled ? 1 : 0.97 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className={cn(
        "relative inline-flex items-center justify-center font-space font-semibold",
        "transition-all duration-300 cursor-pointer select-none",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        fullWidth && "w-full",
        variants[variant],
        sizes[size],
        className
      )}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      <span>{children}</span>
      {/* Shine sweep */}
      <span className="absolute inset-0 rounded-[inherit] overflow-hidden pointer-events-none">
        <span className="absolute inset-0 translate-x-[-100%] bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-700 group-hover:translate-x-[100%]" />
      </span>
    </motion.button>
  );
}
