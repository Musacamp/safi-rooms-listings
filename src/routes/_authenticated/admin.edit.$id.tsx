import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { adminGetListing, updateListing } from "@/lib/admin-listings.functions";
import { ListingForm, type ListingFormValues } from "@/components/ListingForm";

export const Route = createFileRoute("/_authenticated/admin/edit/$id")({
  component: EditListing,
});

function EditListing() {
  const { id } = Route.useParams();
  const nav = useNavigate();
  const q = useQuery({
    queryKey: ["admin-listing", id],
    queryFn: () => adminGetListing({ data: { id } }),
  });

  const submit = async (v: ListingFormValues) => {
    try {
      await updateListing({ data: { id, patch: v } });
      toast.success("Listing updated");
      nav({ to: "/admin/listings" });
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  if (q.isLoading) return <p className="text-sm text-muted-foreground">Loading...</p>;
  if (!q.data) return <p className="text-sm text-muted-foreground">Listing not found.</p>;

  return (
    <div>
      <h1 className="mb-4 text-lg font-bold text-foreground">Edit listing</h1>
      <ListingForm initial={q.data} onSubmit={submit} />
    </div>
  );
}
