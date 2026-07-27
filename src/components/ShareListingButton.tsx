import { useState } from "react";
import { Share2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { buildListingShareImage, type ShareListing } from "@/lib/share-card";
import { formatUGX } from "@/lib/format";
import { ROOM_TYPE_LABEL } from "@/lib/constants";

export function ShareListingButton({
  listing,
  className = "",
}: {
  listing: ShareListing & { id: string };
  className?: string;
}) {
  const [busy, setBusy] = useState(false);

  const caption =
    `*${listing.title}*\n` +
    `${formatUGX(listing.rent_ugx)} / month · ${ROOM_TYPE_LABEL[listing.room_type] ?? listing.room_type}\n` +
    `📍 ${listing.location}\n\n` +
    (listing.description ? `${listing.description.slice(0, 300)}\n\n` : "") +
    `View on SafiRooms: ${typeof window !== "undefined" ? window.location.href : ""}`;

  const onShare = async () => {
    setBusy(true);
    try {
      const blob = await buildListingShareImage(listing);
      const file = blob
        ? new File([blob], `safirooms-${listing.id}.png`, { type: "image/png" })
        : null;

      if (file && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], text: caption, title: listing.title });
        return;
      }

      if (blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `safirooms-${listing.id}.png`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 5000);
        toast.success("Image saved — attach it in WhatsApp");
      }
      window.open(`https://wa.me/?text=${encodeURIComponent(caption)}`, "_blank", "noreferrer");
    } catch (e: any) {
      if (e?.name !== "AbortError") toast.error("Could not create the share image");
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={onShare}
      disabled={busy}
      aria-label="Share this room on WhatsApp"
      className={
        "inline-flex items-center justify-center gap-1.5 rounded-xl bg-brand-green px-3 py-2.5 text-sm font-semibold text-white disabled:opacity-60 " +
        className
      }
    >
      {busy ? <Loader2 className="size-4 animate-spin" /> : <Share2 className="size-4" />}
      {busy ? "Preparing…" : "Share"}
    </button>
  );
}
