export function TypingIndicator({ name }: { name?: string }) {
  return (
    <div className="text-muted-foreground flex items-end gap-1 px-3 py-1 text-xs">
      {name && <span className="mr-1">{name}</span>}
      <div className="bg-muted flex items-center gap-[3px] rounded-full px-3 py-1.5">
        <span className="animate-typing-bounce bg-muted-foreground/60 h-1.5 w-1.5 rounded-full [animation-delay:0ms]" />
        <span className="animate-typing-bounce bg-muted-foreground/60 h-1.5 w-1.5 rounded-full [animation-delay:200ms]" />
        <span className="animate-typing-bounce bg-muted-foreground/60 h-1.5 w-1.5 rounded-full [animation-delay:400ms]" />
      </div>
    </div>
  );
}
