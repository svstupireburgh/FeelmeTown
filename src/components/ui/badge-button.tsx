import React from "react"
import { IceCreamCone } from "lucide-react"

import { Badge } from "../../components/ui/badge"

interface BadgeButtonProps {
  children: React.ReactNode
}

const BadgeButton = ({ children }: BadgeButtonProps) => {
  return (
    <Badge
      variant="outline"
      className="mb-3 cursor-pointer rounded-[14px] border border-black/20 dark:border-white/20 bg-white dark:bg-[#202020] text-black dark:text-white text-base md:left-6"
    >
      <IceCreamCone className=" fill-[#9ff01d] stroke-1 text-neutral-800" />{" "}
      {children}
    </Badge>
  )
}

export default BadgeButton