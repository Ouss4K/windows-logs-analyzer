import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import type { HeatCell } from "@/lib/types"
import { cn } from "@/lib/utils"

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

export function Heatmap({ cells }: { cells: HeatCell[] }) {
  const max = Math.max(1, ...cells.map((cell) => cell.count))
  return (
    <div className="overflow-x-auto">
      <div className="grid min-w-[640px] grid-cols-[40px_repeat(24,minmax(0,1fr))] gap-1">
        <div />
        {Array.from({ length: 24 }, (_, hour) => (
          <div key={hour} className="text-center font-mono text-[10px] text-muted-foreground">
            {hour % 3 === 0 ? hour : ""}
          </div>
        ))}
        {DAYS.map((day, dayIndex) => (
          <div key={day} className="contents">
            <div className="font-mono text-[10px] leading-6 text-muted-foreground">{day}</div>
            {Array.from({ length: 24 }, (_, hour) => {
              const cell = cells.find((item) => item.day === dayIndex && item.hour === hour)
              const count = cell?.count ?? 0
              const intensity = count / max
              return (
                <Tooltip key={`${day}-${hour}`}>
                  <TooltipTrigger asChild>
                    <span
                      className={cn(
                        "block h-6 rounded-sm",
                        count === 0 ? "bg-muted/40" : "bg-primary",
                      )}
                      style={count ? { opacity: 0.2 + intensity * 0.8 } : undefined}
                      aria-label={`${day} ${hour}:00, ${count} logons`}
                    />
                  </TooltipTrigger>
                  <TooltipContent>
                    {day} {String(hour).padStart(2, "0")}:00 · {count} interactive logons
                  </TooltipContent>
                </Tooltip>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
