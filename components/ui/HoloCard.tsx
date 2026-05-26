"use client";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { useRef, MouseEvent } from "react";
import { cn } from "@/lib/utils";

interface HoloCardProps {
  children: React.ReactNode;
  className?: string;
  intensity?: number;
}

export default function HoloCard({ children, className, intensity = 15 }: HoloCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [intensity, -intensity]), {
    stiffness: 300, damping: 30,
  });
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-intensity, intensity]), {
    stiffness: 300, damping: 30,
  });
  const brightness = useSpring(useTransform(mouseX, [-0.5, 0.5], [0.9, 1.2]), {
    stiffness: 300, damping: 30,
  });
  const glareX = useTransform(mouseX, [-0.5, 0.5], [0, 100]);
  const glareY = useTransform(mouseY, [-0.5, 0.5], [0, 100]);

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    mouseX.set((e.clientX - rect.left) / rect.width - 0.5);
    mouseY.set((e.clientY - rect.top) / rect.height - 0.5);
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  return (
    <motion.div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        rotateX,
        rotateY,
        filter: useTransform(brightness, (v) => `brightness(${v})`),
        transformStyle: "preserve-3d",
      }}
      className={cn("relative cursor-pointer", className)}
    >
      {children}
      {/* Glare overlay */}
      <motion.div
        className="absolute inset-0 rounded-[inherit] pointer-events-none overflow-hidden"
        style={{ opacity: 0.15 }}
      >
        <motion.div
          className="absolute w-32 h-32 rounded-full blur-2xl bg-white/30"
          style={{ left: useTransform(glareX, (v) => `${v}%`), top: useTransform(glareY, (v) => `${v}%`), transform: "translate(-50%, -50%)" }}
        />
      </motion.div>
    </motion.div>
  );
}
