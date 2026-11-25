# Dashboard

The landing page: how sales are going at a glance. Part of the spec; the summary and index are in `docs/spec.md`.

## Concerns

- **8. What the sales funnel measures.** Lost deals all sit in Lost, so their current stage can't say how far they got. The funnel uses each deal's furthest stage, taken from its stage-change history. A deal counts in every stage up to and including its furthest one. The sample data has matching stage-change history.
- **12. The dashboard's time window.** The charts show the last six calendar months, including the current one.

## Requirements

- **R31** A **summary line** under the title, such as "18 open deals worth $10,151,500. 2 follow-ups are overdue and 3 deals are past their close date." A part that would be zero is left out.
- **R32** A **revenue panel** with:
  - revenue won this month, as the large figure;
  - the change from last month, as a percentage. When last month's revenue was $0, it reads "No revenue won in October" (naming last month) instead;
  - the total for the last six months and the best month;
  - a **line chart** of revenue won per month over those six months (concern 12), with each month's figure labelled.
- **R33** Three **figure cards**:
  - **Open pipeline**, the total value of open deals, with the number of open deals and a mini stage strip;
  - **Expected revenue**, the sum of value times probability over open deals, with a ring showing it as a share of open value. With no open deals, the ring shows 0%;
  - **Deals won this month**, with last month's count, the win rate, and a small six-month chart of deals won.

  The **win rate** is deals won divided by deals won plus deals lost, over the last six months by close date. When none have been won or lost in that time, it reads "No closed deals yet".
- **R34** A **sales funnel** showing, for each stage from New Lead to Closed (Won), the number of deals and the value that reached it (concern 8). For every stage after New Lead, it also shows the share of deals that moved on from the stage before (deals reaching this stage divided by deals reaching the previous one). The share is left blank when the stage before had no deals.
- **R34a** A **won and lost chart** for the same six months: deals won as bars above a centre line and deals lost as bars below it, each labelled with its count. Underneath it go the six-month totals won and lost, and the win rate.
- **R35** A **pipeline strip**: one horizontal bar split by open stage, each part as wide as that stage's share of open value, labelled with the stage, value and count. Clicking it opens the Pipeline.
- **R36** **Follow-ups**, in three groups:
  - **Overdue**, in Raspberry;
  - **This week**, from today to Sunday;
  - **Later**.

  Each group is in date order, oldest first. Each follow-up has a round checkbox to mark it done, which removes it from the list, and links to its contact or deal.
- **R37** **Recent activity**: the latest 10 activities of every kind, including stage changes, each linked to its contact or deal.
- **R38** Every dashboard figure is worked out by the backend from the current data. It changes as soon as the data changes, such as a deal moving to Closed (Won) or a new follow-up being saved.

## API

| Method and path | Purpose |
|---|---|
| `GET /api/dashboard` | Everything the dashboard shows, in one response |

## Layout

- **Dashboard**: two areas side by side.
  - The main area, top to bottom:
    - the header: the date above the title, the summary line (R31) under it, and "Log activity" and "New deal" on the right;
    - the Midnight revenue panel (R32), about two thirds wide, beside the three figure cards stacked (R33). On the dark panel, figures are white, labels are Sea Mist, the change is a Coral pill, and the line is Sea Green with a light fill;
    - the sales funnel as horizontal bars, with the share moving on at the right of each row (R34), beside the won and lost chart (R34a);
    - the pipeline strip across the full width, with a legend giving each stage's value and count (R35).
  - A panel, 384px wide, on the right:
    - follow-ups at the top, grouped with small uppercase headings (R36). Overdue rows have a light Raspberry background and the due date in a Raspberry pill;
    - recent activity below, as a timeline: a tinted icon for each type, joined by a thin line.
