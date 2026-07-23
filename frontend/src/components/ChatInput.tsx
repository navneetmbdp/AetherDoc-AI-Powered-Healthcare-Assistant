import { useState } from "react";
import { Send, Paperclip, Image, FileText, Mic } from "lucide-react";

interface ChatInputProps {
  onSend: (message: string) => void;
  onAttachment?: (file: File) => void | Promise<void>;
  attachmentDisabled?: boolean;
}

const ChatInput = ({ onSend, onAttachment, attachmentDisabled = false }: ChatInputProps) => {
  const [value, setValue] = useState("");
  const [micActive, setMicActive] = useState(false);

  const handleSend = () => {
    if (!value.trim()) return;
    onSend(value.trim());
    setValue("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleAttachmentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onAttachment) return;
    void onAttachment(file);
    e.target.value = "";
  };

  return (
    <div className="flex items-end gap-2 p-3 border-t border-white/5">
      <div className="flex items-center gap-1">
        <label className={`p-2 rounded-full transition-colors ${attachmentDisabled ? "cursor-not-allowed text-muted-foreground/40" : "cursor-pointer text-muted-foreground hover:text-foreground hover:bg-secondary"}`}>
          <input type="file" accept="image/*" className="hidden" onChange={handleAttachmentChange} disabled={attachmentDisabled || !onAttachment} />
          <Paperclip size={18} />
        </label>
        <label className={`p-2 rounded-full transition-colors ${attachmentDisabled ? "cursor-not-allowed text-muted-foreground/40" : "cursor-pointer text-muted-foreground hover:text-foreground hover:bg-secondary"}`}>
          <input type="file" accept="image/*" className="hidden" onChange={handleAttachmentChange} disabled={attachmentDisabled || !onAttachment} />
          <Image size={18} />
        </label>
        <button className="p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors" type="button">
          <FileText size={18} />
        </button>
      </div>

      <div className="flex-1 relative">
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type anything.."
          rows={1}
          className="w-full resize-none glass-input rounded-2xl px-4 py-2.5 pr-12 text-sm text-black placeholder:text-black/60 focus:outline-none focus:ring-1 focus:ring-primary/50"
        />
        <button
          onClick={handleSend}
          className="absolute right-2 bottom-1.5 p-1.5 rounded-full bg-primary text-primary-foreground hover:scale-110 transition-transform disabled:opacity-40"
          disabled={!value.trim()}
        >
          <Send size={16} />
        </button>
      </div>

      <button
        onClick={() => setMicActive(!micActive)}
        className={`p-2.5 rounded-full transition-all ${
          micActive
            ? "bg-primary text-primary-foreground glow-sm"
            : "text-muted-foreground hover:text-foreground hover:bg-secondary"
        }`}
      >
        <Mic size={18} />
      </button>
    </div>
  );
};

export default ChatInput;
