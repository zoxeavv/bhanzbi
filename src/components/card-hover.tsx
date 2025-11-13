"use client"

import { motion } from "framer-motion"
import { Card } from "@/components/ui/card"
import type { ReactNode } from "react"

interface CardHoverProps {
  children: ReactNode
  className?: string
}

export function CardHover({ children, className }: CardHoverProps) {
  return (
    <motion.div whileHover={{ scale: 1.02, y: -4 }} transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}>
      <Card className={className}>{children}</Card>
    </motion.div>
  )
}
