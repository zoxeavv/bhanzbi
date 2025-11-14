import React from "react"
import type { Metadata } from "next"

interface PageContainerProps {
  title?: string
  description?: string
  children: React.ReactNode
}

export default function PageContainer({ title, description, children }: PageContainerProps) {
  return <>{children}</>
}

