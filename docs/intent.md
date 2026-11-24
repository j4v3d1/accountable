# Intent: the Accountable MVP

## Problem

A small real estate business keeps track of its clients and property deals in spreadsheets, inboxes and people's heads. Nobody can see at a glance which companies we work with, who our buyers, sellers and leads are, what's in the deal pipeline, what happened last with a client or what needs doing next.

Accountable is for a generic real estate business: it uses no real brokerage's name or branding, and its sample data is fictional.

## Proposed outcome

Accountable is a business management system: a sales CRM that will grow into a full Business OS, including ERP. This first version, the MVP, is a complete real estate sales CRM for one agent, running on their own computer. Think of it as a private Salesforce that does the everyday CRM essentials really well. It should feel sharp, modern and professional, and be a pleasure to use.

### Five sections

- **Dashboard**, the landing page: how sales are going at a glance. Deals won and revenue won month by month, the open pipeline and its expected revenue (each deal's value times its probability of close), a sales funnel showing how much value reaches each stage, recent activity, and the follow-ups that are coming up or overdue. It should be visually stunning, with at least a line chart, a bar chart and a visual of the pipeline. Which figures each one shows, and how, is the designer's call.
- **Organizations**: the companies we work with, such as other brokerages, mortgage lenders, developers, property management firms and corporate relocation firms. Open one to see its contacts and deals.
- **Contacts**: the people we deal with, such as buyers, sellers and leads, with a filter by status. Open one to see their organization and a timeline of everything that has happened with them.
- **Deals**: the property transactions, with each one's stage, value and close date. Open one to see its details and its timeline. A deal still open after its expected close date stands out, in the table and on its pipeline card.
- **Pipeline**: the deals as cards on a board, one column per stage. Drag a card to another column to change the deal's stage, or within a column to change its place; a card can be dropped anywhere in a column, and it stays where it was dropped. A new deal can be added straight into a column, at that stage. The board shows the total value and expected revenue of the deals still open, each column shows its own, and the figures change as soon as a card moves.

Every table has a search box, columns you can sort by clicking their headings, a way to add a new record, and edit and delete on each row. That's how we add a new deal, a new lead or a new customer. Deleting asks first, and says what will happen to the records linked to the one being deleted, with counts (for example "3 contacts will be unlinked, 5 activities will be deleted"):

- Deleting an organization keeps its contacts and deals and clears their link to it.
- Deleting a contact keeps their deals, with the main contact cleared, and deletes their activities.
- Deleting a deal deletes its activities.

From any contact or deal you can log an activity (a note, call or email) and give it a follow-up date. A follow-up shows on the dashboard as a task until it's marked done. Activities can be edited and deleted too. When a deal moves to another stage, including Closed (Won) or Lost, an entry such as "Moved from Showing to Offer" appears in its timeline and in the dashboard's recent activity by itself.

### Four kinds of record

- **Organization**: a company we work with. Name, website, industry (such as brokerage, mortgage lending, development, property management or relocation) and notes. An organization has many contacts and many deals. Most buyers and sellers are individuals, so a contact or deal doesn't need an organization.
- **Contact**: a person we deal with. Name, email, phone, job title, the organization they belong to (optional), and a status (lead, qualified or customer). A lead is a contact with the lead status, so there's no separate list of leads.
- **Deal**: a property transaction. Name (which describes the property, such as "142 Maple Ave purchase"), the main contact and the organization it is with (both optional), its stage, its value (the property's price in US dollars), its probability of close, its expected or actual close date, and notes. Each stage has a usual probability of close, and a deal takes its new stage's probability when it moves; a probability set by hand is kept until the stage changes. The stages are fixed, in this order:

  | Stage | Usual probability of close |
  |---|---|
  | New Lead | 10% |
  | Qualified | 20% |
  | Showing | 40% |
  | Offer | 60% |
  | Under Contract | 90% |
  | Closed (Won) | 100% |
  | Lost | 0% |
- **Activity**: something that happened, or needs to happen, with a contact or deal. Type (note, call or email), the contact or deal it relates to, a description and when it happened, and optionally a follow-up date and whether it's done.

### Sample data

Accountable comes with realistic, fictional real estate sample data set in a fictional US metro area, so every screen looks alive the first time it starts: about 12 organizations across the industries above, about 40 contacts at every status, about 30 deals at every stage (including deals closed and lost over the past six months, deals expected to close in the months ahead and a few running late), and about 80 activities with some follow-ups due soon and some overdue.

### Look and feel

The look follows Accountable's brand guidelines, which take priority over any general design guidance. The MVP is light mode, designed for a laptop or desktop screen.

## Affected users and systems

- One real estate agent, using Accountable on their own computer every day. The rest of the team joins later.
- No other systems are involved yet.

## Constraints

- The technology in `docs/TECH_STACK.md`.
- It runs locally with one documented command that works on Mac, Linux and Windows, and needs no internet connection to use.
- Every change is kept: it's still there after a browser refresh, and every time the app starts it shows every change made before.
- One documented command resets the data to the sample data, to start again from scratch.
- Not in the MVP: sign-in, user accounts or several users; a dark mode or a layout for phones; AI features; email, calendar or phone integrations; currencies other than US dollars; reports beyond the dashboard; tags or custom fields; changing the pipeline stages; importing or exporting data; commission tracking; property listings or MLS data; properties as a separate kind of record (a deal's property is described in its name and notes).

## Success criteria

1. Someone non-technical can start Accountable with the one documented command, open it in a browser and land on the dashboard, with sample data on every screen.
2. Organizations, contacts (leads, qualified contacts and customers) and deals can each be added, found by searching, sorted, edited and deleted from their tables, and every change is still there after a refresh and after a restart. Deleting asks first. The reset command brings back the sample data.
3. Contacts can be filtered by status, and each record's page shows the records it's linked to.
4. Dragging a deal to another column on the pipeline changes its stage and its probability of close, and the deals list shows both. A card dropped anywhere in a column, including higher or lower in its own column, stays there after a refresh. The board's and the columns' totals and expected revenue change as soon as the card moves. A deal added in a column starts at that stage, and late deals stand out.
5. An activity or follow-up logged on a contact or deal appears in its timeline, newest first, and so does an entry for each change of stage. Follow-ups show on the dashboard as upcoming or overdue until they're marked done.
6. The dashboard's figures match the data, and they reflect a deal moved to Closed (Won) or a new follow-up.
7. Every screen is sharp, modern and professional, and follows the brand. The dashboard is visually stunning, with a line chart, a bar chart and a visual of the pipeline.
8. Before it's called done, someone has used it end to end in a real browser, the way a real estate agent would: every section and every action above, each screen checked by eye, with no errors in the browser's console. Passing tests is necessary, but it isn't enough.

## Open questions

- Sign-in, several people sharing the same data, and a record of who did what are for a later intent.
- Making Accountable available to people beyond the computer it runs on is for later too.
