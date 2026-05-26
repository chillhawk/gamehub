"use client";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface NexusCardProps {
  children: React.ReactNode;
  className?: string;
  glow?: "blue" | "purple" | "cyan" | "gold" | "none";
  hover?: boolean;
  onClick?: () => void;
  delay?: number;
  animated?: boolean;
}

const glowMap = {
  blue:   "hover:border-nexus-blue/40 hover:shadow-glow-blue",
  purple: "hover:border-nexus-purple/40 hover:shadow-glow-purple",
  cyan:   "hover:border-nexus-cyan/40 hover:shadow-glow-cyan",
  gold:   "hover:border-nexus-gold/40 hover:shadow-glow-gold",
  none:   "",
};

export default function NexusCard({
  children, className, glow = "blue", hover = true, onClick, delay = 0, animated = true,
}: NexusCardProps) {
  const Wrapper = animated ? motion.div : "div";
  const motionProps = animated
    ? {
        initial: { opacity: 0, y: 24 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: true },
        transition: { duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
        whileHover: hover ? { y: -4, scale: 1.01 } : undefined,
      }
    : {};

  return (
    <Wrapper
      {...motionProps}
      onClick={onClick}
      className={cn(
        "nexus-card relative overflow-hidden",
        hover && "cursor-pointer transition-all duration-400",
        hover && glow !== "none" && glowMap[glow],
        className
      )}
    >
      {/* Corner accent */}
      <span className="absolute top-0 right-0 w-16 h-16 opacity-20 pointer-events-none">
        <svg viewBox="0 0 64 64" fill="none" className="w-full h-full">
          <path d="M64 0 L64 64 L0 0 Z" fill="url(#card-corner)" />
          <defs>
            <linearGradient id="card-corner" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#6366f1" />
              <stop offset="100%" stopColor="transparent" />
            </linearGradient>
          </defs>
        </svg>
      </span>
      {children}
    </Wrapper>
  );
}
