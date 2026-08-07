import { useState } from "react";
import { Share2 } from "lucide-react";
import { ShareTemplatePicker } from "@/components/ShareTemplatePicker";
import {
  renderListingShare,
  type ShareListing,
  type ShareTemplateKey,
} from "@/lib/share-templates";
import { formatUGX } from "@/lib/format";
import { ROOM_TYPE_LABEL } from "@/lib/constants";

export function ShareListingButton({
  listing,
  className = "",
}: {
  listing: ShareListing & { id: string };
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  const caption =
    `*${listing.title}*\n` +
    `${formatUGX(listing.rent_ugx)} / month · ${ROOM_TYPE_LABEL[listing.room_type] ?? listing.room_type}` +
    `${listing.is_available ? "" : " · TAKEN"}\n` +
    `📍 ${listing.location}\n\n` +
    (listing.description ? `${listing.description.slice(0, 300)}\n\n` : "") +
    `View on SafiRooms: ${typeof window !== "undefined" ? window.location.href : ""}`;

  const render = (key: ShareTemplateKey) =>
    renderListingShare(
      key,
      listing,
      typeof window !== "undefined" ? window.location.href : undefined,
    );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Share this room"
        className={
          "inline-flex items-center justify-center gap-1.5 rounded-xl bg-brand-green px-3 py-2.5 text-sm font-semibold text-white " +
          className
        }
      >
        <Share2 className="size-4" />
        Share
      </button>
      <ShareTemplatePicker
        open={open}
        onClose={() => setOpen(false)}
        render={render}
        filename={`safirooms-${listing.id}`}
        caption={caption}
        title={listing.title}
      />
    </>
  );
}
