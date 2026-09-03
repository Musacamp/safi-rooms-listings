# Fix: portal crashes after ~2 seconds and admin won't open

You were right that the previous attempt didn't hold. I reproduced both failures just now and have the actual cause.

## What I observed (verified, not guessed)

- The live site at safi-rooms-listings.lovable.app **does** render listings from the server (99 listings, 58 available). So your data and the read path are fine.
- Then the browser throws, three times: `[Supabase] Missing Supabase environment variable(s): SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY`. That is the *browser* copy of the backend connection, not the server one. It is why the page dies a couple of seconds in (right after hydration) and why tapping Admin shows "something went wrong" — the sign-in screen can't create a backend client at all.
- On the preview/dev server the keys exist, but there is a separate crash-class warning: a hydration text mismatch on the home page.

So there are two independent problems, and the earlier fix (rebinding keys + republish) only touched the server side. The browser bundle gets its keys baked in at build time, so a republish alone can keep shipping a bundle with them missing.

## The fix

1. **Stop depending on build-time key injection for the browser.**
   Serve the two public values (backend URL + publishable key — both are safe to be public) from the server at request time, and have the browser client read them from there when the baked-in values are absent. Result: the client portal and admin sign-in work on any deployment, even if a build misses the variables.
2. **Fail soft instead of white-screening.** If the browser client still can't be created, the app must keep showing the server-rendered listings and show a clear inline notice on admin sign-in, rather than crashing the whole tree.
3. **Fix the hydration mismatch** on the home page so the client and server render the same header/stats text.
4. **Verify, then publish.** Re-run the same browser check against the live URL after deploying, and confirm: no console errors, listings visible, `/auth` renders and accepts a sign-in attempt, admin dashboard loads.

## Not touching

No schema changes, no migrations, no DB reset, no listing data changes, no redesign of any screen. Only the connection plumbing, one hydration bug, and error fallbacks.

## Technical notes

- Add a small public runtime-config source (root-route server data or a `src/routes/api/public/*` GET returning `{ url, publishableKey }`).
- `src/integrations/supabase/client.ts` is auto-generated, so the fallback goes in a thin wrapper/bootstrap the app imports, seeding config before first client use rather than editing the generated file.
- Guard `src/routes/index.tsx` stats/branding text against server/client divergence (stable values, or render post-hydration).
- Verification via Playwright at 390px against both localhost:8080 and the published URL, capturing `pageerror` and `console.error`.
