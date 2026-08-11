import { useState } from "react";
import { Share2 } from "lucide-react";
import { ShareTemplatePicker } from "@/components/ShareTemplatePicker";
import {
  renderListingShare,
  type ShareListing,
  type ShareTemplateKey,
} from "@/lib/share-templates";
import { formatUGX } from "@/lib/format";
import { ROOM_TYPE_LABEL, SITE_URL } from "@/lib/constants";

/** Canonical public URL of a listing, used for the QR code / caption link. */
function listingUrl(id: string) {
  const origin = typeof window !== "undefined" ? window.location.origin : SITE_URL;
  return `${origin}/listing/${id}`;
}

export function ShareListingButton({
  listing,
  className = "",
  iconOnly = false,
}: {
  listing: ShareListing & { id: string };
  className?: string;
  iconOnly?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const url = listingUrl(listing.id);

  const caption =
    `*${listing.title}*\n` +
    `${formatUGX(listing.rent_ugx)} / month · ${ROOM_TYPE_LABEL[listing.room_type] ?? listing.room_type}` +
    `${listing.is_available ? "" : " · TAKEN"}\n` +
    `📍 ${listing.location}\n\n` +
    (listing.description ? `${listing.description.slice(0, 300)}\n\n` : "") +
    `View on SafiRooms: ${url}`;

  const render = (key: ShareTemplateKey) => renderListingShare(key, listing, url);

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        }}
        aria-label={`Share ${listing.title}`}
        className={
          (iconOnly
            ? "grid size-8 place-items-center rounded-lg bg-brand-blue text-white "
            : "inline-flex items-center justify-center gap-1.5 rounded-xl bg-brand-green px-3 py-2.5 text-sm font-semibold text-white ") +
          className
        }
      >
        <Share2 className="size-4" />
        {!iconOnly && "Share"}
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
