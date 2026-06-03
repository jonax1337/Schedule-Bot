export function Placeholder({ title }: { title: string }) {
  return (
    <div className="flex flex-col gap-2 p-8">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="text-muted-foreground text-sm">
        This page is a placeholder created during the Vite migration. Real content lands in Phase 3.
      </p>
    </div>
  )
}
