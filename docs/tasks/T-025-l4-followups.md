# T-025 Follow-ups to L-4 (delete a task, expense default), 13 Oct 2026

Owner: Claude Code · Status: PR open

L-4 (PR #19, Lovable) was tested live on 13 Oct in "Test chata (Claude)" at 375 px with invented data.

## Worked

- Admin sees "Delete task" (51 px, red text). The confirmation names the task; Cancel closes it; Delete shows "Task deleted.", goes back to Tasks, and the task is gone from the list.
- New expense starts with the current member selected; unselecting everyone shows "Pick at least one person."; saving with only yourself gives "Expense added, not split." and the next form starts selected again.

## Found and fixed here

| #   | Where                                                    | Problem                                                                                                                                        | Fix                                                                                                     |
| --- | -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| 1   | Task detail of a deleted or unknown task (`/ukoly/<id>`) | Blank page for ever: the query used `.single()`, which errors on 0 rows, and the page showed the loading skeleton whenever there was no task   | `maybeSingle()`; "This task no longer exists" with a link back, or "could not be loaded" with Try again |
| 2   | Delete task                                              | A delete refused by row-level security returns 0 rows and no error, so it would have said "Task deleted." while nothing happened (invariant 6) | Ask for the deleted id back; 0 rows → a clear error                                                     |
| 3   | Delete task                                              | The open task's cache was dropped before leaving the page, which could refetch the deleted task                                                | Navigate first, then drop the cache                                                                     |
| 4   | Confirmation dialog on phones                            | Square, edge-to-edge box                                                                                                                       | Rounded, 16 px from the edges                                                                           |

## Not verified

A plain member not seeing the button (no member sign-in available), and the 0-rows message in the browser (needs a member account; the code path is the same as an admin's).
