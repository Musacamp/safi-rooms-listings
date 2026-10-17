import { Copy, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { whatsappTextUrl } from "@/lib/whatsapp-text";

export function WhatsAppTextEditor({ parts, onChange }: { parts: string[]; onChange: (parts: string[]) => void }) {
  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("WhatsApp text copied");
    } catch {
      toast.error("Could not copy. Select the message and copy it manually.");
    }
  };

  return (
    <section className="flex min-w-0 flex-col gap-4" aria-label="WhatsApp text">
      <h2 className="text-base font-semibold text-foreground">WhatsApp text</h2>
      {parts.map((text, index) => (
        <div key={index} className="min-w-0 space-y-2">
          <label htmlFor={`whatsapp-part-${index}`} className="block text-sm font-semibold text-foreground">
            {parts.length > 1 ? `Part ${index + 1}/${parts.length}` : "Message"}
          </label>
          <Textarea id={`whatsapp-part-${index}`} value={text} rows={12} className="bg-card text-foreground"
            onChange={(event) => onChange(parts.map((part, i) => i === index ? event.target.value : part))} />
          <div className="flex flex-wrap gap-2">
            <Button asChild className="min-h-11" disabled={!text.trim()}>
              <a href={text.trim() ? whatsappTextUrl(text) : undefined} target="_blank" rel="noopener noreferrer" aria-disabled={!text.trim()}>
                <MessageCircle /> Share to WhatsApp
              </a>
            </Button>
            <Button variant="outline" className="min-h-11" onClick={() => copy(text)} disabled={!text.trim()}><Copy /> Copy</Button>
          </div>
        </div>
      ))}
    </section>
  );
}