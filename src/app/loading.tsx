export default function Loading() {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-2 text-center">
      <p className="text-sm font-medium">Reading event logs from this PC</p>
      <p className="text-xs text-muted-foreground">Nothing is sent off this computer.</p>
    </div>
  )
}
