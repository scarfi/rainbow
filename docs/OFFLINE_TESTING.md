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
- Tap 4 in shooting mode, wait for the saved status, and reopen offline. The arrow and its totals must be present.
- Check that a target face cannot change while scores exist.
- Verify standard target sessions still support X, 10 through 1, and M.
- After an application update, reopen an old session and check its target description and original scores.

## Timer and shooting view

- Start the timer, background or lock the device, and return. Verify elapsed time includes the background interval.
- Stop and resume it, then finish the session. Check that stopped time is excluded and finishing stops the timer.
- Set manual minutes while stopped; verify the next timer run starts from that duration.
- Open shooting mode in both languages on mobile and desktop. Verify large score buttons, keyboard navigation, Escape, and return focus when closing.
- Enter six progression scores. Verify automatic end creation, next-arrow numbering, and undo across the end boundary.
- Enter 35 scores of 8: 280 points must not yet count as achieved. Add M as arrow 36: the goal should be achieved, and arrow 37 must be blocked.
- For Beursault, check halte numbering for arrows 1/2, 3/4, and the final pair in each preset.
- Stop a progression session with a partial end, reopen it as a draft, and continue without losing scores.
- Force a save conflict and check that recovery and export remain available in shooting mode and after returning to the editor.

## Activity calendar

- Record two sessions on one date and confirm their arrow counts add up in that day's tile.
- Select the day and verify that both draft and completed sessions appear. Select an empty date and check the empty state.
- Search within a selected day, then select another date. Verify the search clears. Show all sessions should restore the full journal.
- Change a session's date or arrow count and verify that the calendar updates after the local save.
- Browse past years, leap days, and the date picker in English and French.
- Navigate days with the arrow keys and select with Enter or Space. Verify mobile horizontal scrolling and the date-picker alternative.
