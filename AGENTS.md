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
- WhatsApp text is built by a pure allowlisted-field formatter from the generator's existing filtered list and displayed in a separate editable message component, preserving the image generator and excluding private contact fields.
- Public room-type tabs render once as a sticky sibling of the search/filter controls, using the shared property-type registry and existing URL filters; this keeps them sticky throughout the list without duplicating controls or changing query ordering.
