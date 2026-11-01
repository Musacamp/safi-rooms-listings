<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Public listing queries use the shared database ordering helper before pagination/limits, with a generated photo-presence column derived from the saved array, so ordering is consistent across pages and updates automatically.
- WhatsApp room text uses a pure allowlisted-field formatter with ranked evidence-only detection; insight posts retain their separate legacy detector, so changing room text does not alter other generators. Editable overrides are keyed to the current filtered output to avoid stale category messages.
- Cover displays use the shared UTC-day photo index and hydration-safe midnight subscription; galleries retain stored order and sharing receives a display-only copy, so daily rotation never writes listing data.
- Public room-type tabs render once as a sticky sibling of the search/filter controls, using the shared property-type registry and existing URL filters; this keeps them sticky throughout the list without duplicating controls or changing query ordering.
