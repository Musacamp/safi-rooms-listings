import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { createListing } from "@/lib/admin-listings.functions";
import { ListingForm, type ListingFormValues } from "@/components/ListingForm";

export const Route = createFileRoute("/_authenticated/admin/new")({
  component: NewListing,
});

function NewListing() {
  const nav = useNavigate();
  const submit = async (v: ListingFormValues) => {
    try {
      await createListing({ data: v });
      toast.success("Listing created");
      nav({ to: "/admin/listings" });
    } catch (e: any) {
      toast.error(e.message);
    }
  };
  return (
    <div>
      <h1 className="mb-4 text-lg font-bold text-foreground">New listing</h1>
      <ListingForm onSubmit={submit} />
    </div>
  );
}
