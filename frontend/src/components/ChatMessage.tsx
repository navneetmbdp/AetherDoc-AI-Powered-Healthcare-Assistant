interface ChatMessageProps {
    content: string;
    role: "user" | "assistant";
    senderName?: string;
  }
  
  const ChatMessage = ({ content, role, senderName }: ChatMessageProps) => {
    const isUser = role === "user";
  
    return (
      <div className={`message-enter flex ${isUser ? "justify-end" : "justify-start"} mb-3`}>
        <div className={`max-w-[80%] ${isUser ? "order-1" : "order-1"}`}>
          {senderName && (
            <p className={`text-xs text-muted-foreground mb-1 ${isUser ? "text-right" : "text-left"}`}>
              {senderName}
            </p>
          )}
          <div
            className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
              isUser
                ? "bg-bubble-user text-bubble-user-foreground rounded-br-md"
                : "bg-bubble-assistant text-bubble-assistant-foreground rounded-bl-md"
            }`}
          >
            {content}
          </div>
        </div>
      </div>
    );
  };
  
  export default ChatMessage;
  