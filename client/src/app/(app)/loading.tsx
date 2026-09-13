export default function AppLoading() {
  return (
    <div className="flex h-full animate-pulse flex-col">
      <header className="flex items-center gap-2 border-b p-3">
        <div className="bg-muted h-8 w-8 rounded-md" />
        <div className="bg-muted h-4 w-32 rounded" />
      </header>
      <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6">
        <div className="bg-muted h-8 w-8 rounded-full" />
        <div className="bg-muted h-3 w-24 rounded" />
      </div>
    </div>
  );
}
