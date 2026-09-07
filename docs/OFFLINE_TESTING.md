# Offline verification checklist

Run against a production build on localhost or HTTPS. These checks remain to be performed in real browsers and on representative iOS and Android devices.

1. Open the app online and wait for the offline-ready status.
2. Select French, add a bow setup, and start a session.
3. Disconnect the network, enter notes and scores, and wait for the saved status.
4. Leave an unfinished end with two arrows. Close the app and reopen it offline.
5. Open the draft and verify its setup, notes, completed ends, and unfinished end.
6. Finish the session and verify journal totals. Reopen it as a draft.
7. Reload and verify the language preference and localized date display.
8. Open the same session in two tabs. Save a change in the first, then edit the stale second tab. Verify the second tab reports the conflict and can export its edits.
9. Test a denied or full browser store. Verify the app never claims a successful save and offers an export when possible.
10. Export a backup and inspect its sessions, equipment, open editor, and pending end.
11. Install where supported and repeat offline reopen from the installed app.
12. Publish a new build on the same test origin, close all old tabs, and reopen. Verify the application updates without deleting training data.
13. Check keyboard navigation, narrow screens, enlarged text, and both languages.

Development and production-preview ports are different storage origins. A journal created at one will not automatically appear at the other. There is no cloud synchronization in this version.

## Target faces and Beursault

- Start a new session and check the 40, 60, 80, 122 cm, and Beursault dropdown choices in both languages. There should be no free-text target input.
- Select Beursault, add 1, 2, 3, 4, and M as separate arrows, and verify 4 honneurs, 10 points, 2 chapelets, and 1 noir in the editor and journal.
- Leave a pending 4, wait for the saved status, and reopen offline. It must still be pending and excluded from totals until added.
- Check that a target face cannot change while scores exist.
- Verify standard target sessions still support X, 10 through 1, and M.
- After an application update, reopen an old session and check its target description and original scores.
