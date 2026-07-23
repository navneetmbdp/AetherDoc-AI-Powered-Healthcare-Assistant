const TypingIndicator = () => (
    <div className="flex justify-start mb-3 message-enter">
      <div className="bg-bubble-assistant px-4 py-3 rounded-2xl rounded-bl-md flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-muted-foreground typing-dot" />
        <span className="w-2 h-2 rounded-full bg-muted-foreground typing-dot" />
        <span className="w-2 h-2 rounded-full bg-muted-foreground typing-dot" />
      </div>
    </div>
  );
  
  export default TypingIndicator;
  