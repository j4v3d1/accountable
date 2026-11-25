"""The sample data (R42), and the reset command (R41).

Run as a module (`npm run seed`, or `uv run --directory backend python -m app.seed`),
it empties every record table and refills it in one transaction. It keeps `users`,
and never deletes the database file, so it's safe while the app is running. Against
a database that isn't SQLite, such as Supabase's, it asks for "yes" first (R41).

Every sample record is credited to the reserved "Sample data" person (concern 18).

Everything is set in the fictional Cedar Bay metro area. Names are invented, emails
use reserved domains and phone numbers use the fictional 555-01xx range. All dates
are worked out from today(), and the data comes from a fixed random seed, so every
reset on the same day gives the same result.
"""

import calendar
import random
from collections.abc import Callable
from datetime import date, datetime, time, timedelta
from itertools import pairwise
from typing import NamedTuple, TypedDict

from sqlalchemy import Connection, Engine, delete, insert
from sqlalchemy.engine import make_url

from app.core import config
from app.core.db import insert_row, make_engine, run_migrations
from app.core.tables import SAMPLE_DATA_USER_ID, activities, contacts, deals, organizations
from app.deals.stages import BY_KEY, CLOSED_STAGES, STAGE_KEYS

RANDOM_SEED = 2026
ADDED_BY_SAMPLE_DATA = {"created_by": SAMPLE_DATA_USER_ID, "updated_by": SAMPLE_DATA_USER_ID}

# key, name, industry, website, notes
ORGANIZATIONS = [
    (
        "northgate",
        "Northgate Realty Partners",
        "Brokerage",
        "https://northgaterealty.example.com",
        "Co-op brokerage covering Northgate and the north shore of Cedar Bay.",
    ),
    (
        "keystone",
        "Keystone Brokerage Group",
        "Brokerage",
        "https://keystonebrokerage.example.com",
        "Refers out-of-area buyers to us.",
    ),
    (
        "harborpoint",
        "Harbor Point Lending",
        "Mortgage lending",
        "https://harborpointlending.example.com",
        "Quick pre-approvals, usually within two days.",
    ),
    ("stonebridge", "Stonebridge Mortgage", "Mortgage lending", "https://stonebridgemortgage.example.com", None),
    (
        "fairway",
        "Fairway Home Loans",
        "Mortgage lending",
        "https://fairwayhomeloans.example.com",
        "Good for first-time buyer programs.",
    ),
    (
        "ridgeline",
        "Ridgeline Development",
        "Development",
        "https://ridgelinedev.example.com",
        "Building the Riverside lots on the east side.",
    ),
    (
        "lakeshore",
        "Lakeshore Builders",
        "Development",
        "https://lakeshorebuilders.example.com",
        "New-build condos on the waterfront, Phase 2 starts next spring.",
    ),
    ("oakwell", "Oakwell Property Management", "Property management", "https://oakwellpm.example.com", None),
    ("summit", "Summit Residential Management", "Property management", None, "Manages rentals around Summit View."),
    (
        "meridian",
        "Meridian Relocation Services",
        "Relocation",
        "https://meridianrelocation.example.com",
        "Sends corporate transferees our way.",
    ),
    ("corpmove", "Corporate Move Partners", "Relocation", "https://corporatemove.example.com", None),
    (
        "bayline",
        "Bayline Title & Escrow",
        "Other",
        "https://baylinetitle.example.com",
        "Our usual title and escrow company.",
    ),
]

# first name, last name, status, organization key, job title
CONTACTS = [
    ("Sofia", "Alvarez", "qualified", "northgate", "Managing broker"),
    ("James", "Whitfield", "customer", "keystone", "Broker associate"),
    ("Laura", "Mendes", "customer", "harborpoint", "Loan officer"),
    ("Raj", "Malhotra", "qualified", "stonebridge", "Mortgage advisor"),
    ("Diane", "Holt", "lead", "fairway", "Loan officer"),
    ("Amara", "Obi", "lead", "ridgeline", "Development manager"),
    ("Henry", "Park", "qualified", "lakeshore", "Sales director"),
    ("Tyler", "Reed", "qualified", "oakwell", "Property manager"),
    ("Marco", "Bianchi", "lead", "summit", "Leasing manager"),
    ("Mei", "Tanaka", "customer", "meridian", "Relocation consultant"),
    ("Andre", "Dubois", "lead", "corpmove", "Account manager"),
    ("Claire", "Novak", "customer", "bayline", "Escrow officer"),
    ("Priya", "Nair", "lead", None, None),
    ("Hannah", "Ortiz", "lead", None, None),
    ("Dev", "Patel", "lead", None, None),
    ("Tom", "Whitaker", "qualified", None, None),
    ("Aisha", "Grant", "qualified", None, None),
    ("Ben", "Foster", "qualified", None, "Nurse practitioner"),
    ("Lucy", "Chen", "qualified", None, None),
    ("Nina", "Brooks", "qualified", None, "Graphic designer"),
    ("Greg", "Lawson", "qualified", None, None),
    ("Elena", "Rossi", "qualified", None, None),
    ("Omar", "Haddad", "qualified", None, "Software engineer"),
    ("Sam", "Okafor", "qualified", None, None),
    ("Rachel", "Kim", "qualified", None, None),
    ("Leo", "Martins", "qualified", None, None),
    ("Janet", "Moore", "qualified", None, "Retired teacher"),
    ("Chris", "Dunn", "qualified", None, None),
    ("Paula", "Svensson", "customer", None, None),
    ("Ivan", "Petrov", "customer", None, "Civil engineer"),
    ("Grace", "Liu", "customer", None, None),
    ("Noah", "Adams", "customer", None, None),
    ("Zoe", "Turner", "customer", None, "Pharmacist"),
    ("Ethan", "Wright", "customer", None, None),
    ("Maya", "Singh", "customer", None, None),
    ("Owen", "Clarke", "customer", None, None),
    ("Ruth", "Avery", "lead", None, None),
    ("Kyle", "Brennan", "qualified", None, None),
    ("Fiona", "Walsh", "lead", None, None),
    ("Victor", "Hale", "lead", None, None),
]

# Open deals, top of each column first: name, stage, contact, organization key,
# value, days from today to the close date (negative is late), probability set by hand.
OPEN_DEALS = [
    ("88 Birchwood Ct purchase", "new_lead", "Priya Nair", None, 415000, 57, None),
    ("17 Orchard Ln purchase", "new_lead", "Hannah Ortiz", "northgate", 562000, 65, None),
    ("Riverside lot 12 sale", "new_lead", None, "ridgeline", 275000, 88, None),
    ("301 Cedar Ave purchase", "qualified", "Tom Whitaker", None, 640000, 47, None),
    ("Hillcrest townhome sale", "qualified", "Aisha Grant", None, 455000, 25, None),
    ("9 Willow Way purchase", "qualified", "Ben Foster", "harborpoint", 720000, 74, None),
    ("Maple Ridge ranch sale", "qualified", "Lucy Chen", None, 510000, -6, None),
    ("26 Ashford Dr sale", "showing", "Greg Lawson", None, 695000, -8, None),
    ("Parkside loft 7C purchase", "showing", "Nina Brooks", None, 432000, 54, None),
    ("Summit View purchase", "showing", "Elena Rossi", "northgate", 815000, 60, 45),
    ("55 Juniper St purchase", "offer", "Omar Haddad", None, 529000, 19, None),
    ("142 Maple Ave purchase", "offer", "Sam Okafor", None, 585000, 37, None),
    ("Brookside cottage sale", "offer", "Rachel Kim", None, 368000, 12, None),
    ("Westgate 3-bed purchase", "offer", "Leo Martins", "harborpoint", 612500, -4, None),
    ("410 Sycamore Rd sale", "under_contract", "Janet Moore", None, 749000, 10, None),
    ("Fairview Heights purchase", "under_contract", "Chris Dunn", "keystone", 902000, 23, None),
]

# Won deals: name, contact, organization key, value, months back, day of the month.
WON_DEALS = [
    ("33 Laurel St sale", "Paula Svensson", None, 612000, 0, 12),
    ("Granite Ct purchase", "Ivan Petrov", "northgate", 875000, 1, 17),
    ("Old Mill Rd purchase", "Grace Liu", None, 738000, 2, 29),
    ("Bayview 2-bed sale", "Noah Adams", None, 574000, 2, 6),
    ("7 Meadow Ln purchase", "Zoe Turner", "harborpoint", 689000, 3, 21),
    ("Canal St loft purchase", "Ethan Wright", "stonebridge", 632000, 4, 27),
    ("Pinecrest Dr sale", "Maya Singh", "meridian", 498000, 4, 9),
    ("12 Oak Hollow purchase", "Owen Clarke", None, 545000, 5, 18),
]

# Lost deals: name, contact, organization key, value, months back, day, furthest stage reached.
LOST_DEALS = [
    ("Northfield purchase", "Ruth Avery", None, 680000, 0, 9, "offer"),
    ("Elmwood condo purchase", "Kyle Brennan", None, 310000, 1, 14, "showing"),
    ("Crestwood sale", "Fiona Walsh", None, 520000, 2, 8, "qualified"),
    ("Harper Rd purchase", "Victor Hale", None, 455000, 3, 25, "under_contract"),
    ("Pine Hollow lot purchase", None, None, 190000, 4, 11, "showing"),
    ("Lakeshore Phase 1 unit purchase", "Henry Park", "lakeshore", 399000, 5, 3, "offer"),
]

# The deal whose last stage change happened yesterday.
MOVED_YESTERDAY = "142 Maple Ave purchase"

# Activities with follow-ups, and a few that set the scene: type, "deal:" or
# "contact:" plus its name, description, days ago it happened, follow-up date in
# days from today (None for none), done, and the hour and minute it happened.
NAMED_ACTIVITIES = [
    ("call", "deal:Brookside cottage sale", "Call Rachel Kim about the inspection report", 9, -5, False, (11, 20)),
    ("email", "deal:26 Ashford Dr sale", "Send Greg Lawson the showing feedback", 7, -3, False, (16, 5)),
    ("call", "deal:Maple Ridge ranch sale", "Call Lucy Chen about a price drop", 10, -1, False, (10, 30)),
    ("note", "deal:410 Sycamore Rd sale", "Remind Janet Moore about the final walk-through", 2, 1, False, (14, 0)),
    ("call", "deal:55 Juniper St purchase", "Follow up with Omar Haddad on the counteroffer", 1, 2, False, (17, 10)),
    ("email", "contact:Ben Foster", "Email Harbor Point Lending about Ben's pre-approval", 3, 4, False, (9, 45)),
    ("call", "contact:Nina Brooks", "Ask Nina Brooks for her pre-approval letter", 2, 0, False, (13, 15)),
    ("note", "contact:Priya Nair", "Check in with Priya Nair after the holidays", 4, 16, False, (15, 40)),
    ("email", "deal:Fairview Heights purchase", "Send Chris Dunn the closing timeline", 5, 10, False, (12, 0)),
    ("call", "contact:Dev Patel", "Call Dev Patel about listing his duplex", 6, 21, False, (10, 0)),
    ("email", "contact:Grace Liu", "Send Grace Liu the moving checklist", 25, -20, True, (11, 0)),
    ("call", "contact:Claire Novak", "Confirm escrow instructions with Bayline", 15, -9, True, (9, 30)),
    ("note", "deal:Brookside cottage sale", "Rachel Kim will accept $360,000", 1, None, False, (17, 15)),
    ("note", "contact:Hannah Ortiz", "Relocating from Denver in March, needs 3 beds", 3, None, False, (16, 45)),
]
GENERAL_ACTIVITY_COUNT = 80 - len(NAMED_ACTIVITIES)

DEAL_NOTES = {
    "note": [
        "Buyer likes the layout but is worried about the roof",
        "Seller is flexible on the closing date",
        "Inspection found minor plumbing issues",
        "Booked a second showing for Saturday",
        "Appraisal came in at the asking price",
        "Wants a 30-day close if possible",
        "HOA fees are higher than expected",
        "Neighbor mentioned a similar house sold last month",
    ],
    "call": [
        "Called {first} about the offer timeline",
        "Talked {first} through the closing costs",
        "Called the listing agent about {deal}",
        "Went over the inspection results with {first}",
        "Called {first} about pricing strategy",
    ],
    "email": [
        "Sent {first} comparable sales for {deal}",
        "Emailed {first} the disclosure packet",
        "Sent {first} the inspection summary",
        "Shared the draft purchase agreement with {first}",
        "Sent {first} the staging recommendations",
    ],
}

CONTACT_NOTES = {
    "note": [
        "{first} prefers a quiet street near good schools",
        "{first} wants to sell before buying",
        "Met {first} at the open house on Laurel St",
        "{first} is flexible on timing, no rush",
        "{first} asked about rental income from an ADU",
    ],
    "call": [
        "Intro call with {first} about their search",
        "Called {first} to talk about the Cedar Bay market",
        "Left a voicemail for {first}",
        "Called {first} about referral partners",
    ],
    "email": [
        "Sent {first} new listings in Northgate",
        "Emailed {first} a Cedar Bay market update",
        "Sent {first} a list of local lenders",
        "Emailed {first} the buyer guide",
    ],
}


def at(day: date, hour: int, minute: int = 0) -> datetime:
    """A local date and time, as an aware datetime (stored in UTC)."""
    return datetime.combine(day, time(hour, minute)).astimezone()


def stamp(day: date, hour: int, minute: int, today: date) -> datetime:
    """When a sample event happened. Anything on today's date happened just after
    midnight, so it's never later than the moment the seed runs, and whatever the
    agent logs afterwards comes first in timelines and recent activity."""
    return at(today, 0, minute) if day >= today else at(day, hour, minute)


def closed_on(today: date, months_back: int, day: int) -> date:
    index = today.year * 12 + today.month - 1 - months_back
    year, month = index // 12, index % 12 + 1
    return min(date(year, month, min(day, calendar.monthrange(year, month)[1])), today)


def stage_path(stage: str, furthest: str | None = None) -> list[str]:
    """The stages a deal passed through, from New Lead to where it is now."""
    if stage == "closed_won":
        return STAGE_KEYS[: STAGE_KEYS.index("under_contract") + 1] + ["closed_won"]
    if stage == "lost":
        if furthest is None:
            raise ValueError("A lost deal needs the furthest stage it reached")
        return STAGE_KEYS[: STAGE_KEYS.index(furthest) + 1] + ["lost"]
    return STAGE_KEYS[: STAGE_KEYS.index(stage) + 1]


class PlannedDeal(NamedTuple):
    """A deal's row, the stages it passed through, and the window its history spans."""

    name: str
    stage: str
    contact: str | None
    org_key: str | None
    value: int
    close: date
    probability: int | None
    path: list[str]
    started: date
    last_move: date


class ActivityRow(TypedDict):
    type: str
    deal_id: int | None
    contact_id: int | None
    description: str
    occurred_at: datetime
    follow_up_date: date | None
    done: bool
    from_stage: str | None
    to_stage: str | None
    created_at: datetime
    updated_at: datetime
    created_by: str
    updated_by: str


def activity_row(
    kind: str,
    description: str,
    occurred_at: datetime,
    *,
    deal_id: int | None = None,
    contact_id: int | None = None,
    follow_up_date: date | None = None,
    done: bool = False,
    from_stage: str | None = None,
    to_stage: str | None = None,
) -> ActivityRow:
    return {
        "type": kind,
        "deal_id": deal_id,
        "contact_id": contact_id,
        "description": description,
        "occurred_at": occurred_at,
        "follow_up_date": follow_up_date,
        "done": done,
        "from_stage": from_stage,
        "to_stage": to_stage,
        "created_at": occurred_at,
        "updated_at": occurred_at,
        "created_by": SAMPLE_DATA_USER_ID,
        "updated_by": SAMPLE_DATA_USER_ID,
    }


def _load_organizations(conn: Connection, today: date) -> dict[str, int]:
    org_ids = {}
    for index, (key, name, industry, website, notes) in enumerate(ORGANIZATIONS):
        created = at(today - timedelta(days=420 - index * 9), 9)
        org_ids[key] = insert_row(
            conn,
            organizations,
            name=name,
            industry=industry,
            website=website,
            notes=notes,
            created_at=created,
            updated_at=created,
            **ADDED_BY_SAMPLE_DATA,
        )
    return org_ids


def _email_domain(org_key: str | None) -> str:
    websites = {key: website for key, _name, _industry, website, _notes in ORGANIZATIONS}
    website = websites[org_key] if org_key else None
    return website.removeprefix("https://") if website else "example.com"


def _load_contacts(
    conn: Connection, today: date, rng: random.Random, org_ids: dict[str, int]
) -> tuple[dict[str, int], dict[int, str]]:
    """The contacts' ids by full name, and their first names by id."""
    contact_ids, first_names = {}, {}
    for index, (first, last, status, org_key, job_title) in enumerate(CONTACTS):
        created = at(today - timedelta(days=320 + rng.randint(0, 60)), 10)
        contact_id = insert_row(
            conn,
            contacts,
            first_name=first,
            last_name=last,
            email=f"{first}.{last}@{_email_domain(org_key)}".lower() if index % 9 != 4 else None,
            phone=f"(206) 555-01{index:02d}" if index % 7 != 3 else None,
            job_title=job_title,
            organization_id=org_ids[org_key] if org_key else None,
            status=status,
            created_at=created,
            updated_at=created,
            **ADDED_BY_SAMPLE_DATA,
        )
        contact_ids[f"{first} {last}"] = contact_id
        first_names[contact_id] = first
    return contact_ids, first_names


def _plan_deals(today: date, rng: random.Random) -> list[PlannedDeal]:
    planned = []
    for name, stage, contact, org_key, value, days, probability in OPEN_DEALS:
        started = today - timedelta(days=30 + 12 * STAGE_KEYS.index(stage) + rng.randint(0, 20))
        last_move = today - timedelta(days=1 if name == MOVED_YESTERDAY else rng.randint(1, 6))
        close = today + timedelta(days=days)
        planned.append(
            PlannedDeal(name, stage, contact, org_key, value, close, probability, stage_path(stage), started, last_move)
        )
    for name, contact, org_key, value, months_back, day in WON_DEALS:
        close = closed_on(today, months_back, day)
        started = close - timedelta(days=45 + rng.randint(0, 60))
        path = stage_path("closed_won")
        planned.append(PlannedDeal(name, "closed_won", contact, org_key, value, close, None, path, started, close))
    for name, contact, org_key, value, months_back, day, furthest in LOST_DEALS:
        close = closed_on(today, months_back, day)
        started = close - timedelta(days=30 + rng.randint(0, 45))
        path = stage_path("lost", furthest)
        planned.append(PlannedDeal(name, "lost", contact, org_key, value, close, None, path, started, close))
    return planned


def _board_positions(planned: list[PlannedDeal]) -> dict[str, int]:
    """Each deal's place in its column: open columns in the order listed, closed columns newest first."""
    closed = sorted((plan for plan in planned if plan.stage in CLOSED_STAGES), key=lambda p: p.close, reverse=True)
    still_open = [plan for plan in planned if plan.stage not in CLOSED_STAGES]
    positions, columns = {}, {}
    for plan in closed + still_open:
        positions[plan.name] = columns.setdefault(plan.stage, 0)
        columns[plan.stage] += 1
    return positions


def _move_times(plan: PlannedDeal, today: date) -> list[datetime]:
    """When each stage change happened, spread over the deal's window."""
    move_count = len(plan.path) - 1
    span = (plan.last_move - plan.started).days
    return [
        stamp(
            plan.started + timedelta(days=round(span * (n + 1) / move_count)),
            8 + n,
            42 if n == move_count - 1 else 10,
            today,
        )
        for n in range(move_count)
    ]


def _load_deals(
    conn: Connection,
    today: date,
    planned: list[PlannedDeal],
    contact_ids: dict[str, int],
    org_ids: dict[str, int],
) -> tuple[dict[str, int], list[ActivityRow]]:
    """The deals' ids by name, and their stage-change history."""
    positions = _board_positions(planned)
    deal_ids, history = {}, []
    for plan in planned:
        move_times = _move_times(plan, today)
        created = at(plan.started, 9)
        deal_id = insert_row(
            conn,
            deals,
            name=plan.name,
            contact_id=contact_ids.get(plan.contact) if plan.contact else None,
            organization_id=org_ids.get(plan.org_key) if plan.org_key else None,
            stage=plan.stage,
            value=plan.value,
            probability=plan.probability if plan.probability is not None else BY_KEY[plan.stage].probability,
            close_date=plan.close,
            position=positions[plan.name],
            notes=None,
            created_at=created,
            updated_at=move_times[-1] if move_times else created,
            **ADDED_BY_SAMPLE_DATA,
        )
        deal_ids[plan.name] = deal_id
        for (from_stage, to_stage), when in zip(pairwise(plan.path), move_times, strict=True):
            description = f"Moved from {BY_KEY[from_stage].label} to {BY_KEY[to_stage].label}"
            history.append(
                activity_row(
                    "stage_change", description, when, deal_id=deal_id, from_stage=from_stage, to_stage=to_stage
                )
            )
    return deal_ids, history


def _named_activities(today: date, deal_ids: dict[str, int], contact_ids: dict[str, int]) -> list[ActivityRow]:
    logged = []
    for kind, owner, description, days_ago, follow_up, done, (hour, minute) in NAMED_ACTIVITIES:
        owner_kind, owner_name = owner.split(":", 1)
        logged.append(
            activity_row(
                kind,
                description,
                stamp(today - timedelta(days=days_ago), hour, minute, today),
                deal_id=deal_ids[owner_name] if owner_kind == "deal" else None,
                contact_id=contact_ids[owner_name] if owner_kind == "contact" else None,
                follow_up_date=today + timedelta(days=follow_up) if follow_up is not None else None,
                done=done,
            )
        )
    return logged


def _general_activities(
    today: date,
    rng: random.Random,
    planned: list[PlannedDeal],
    deal_ids: dict[str, int],
    contact_ids: dict[str, int],
    first_names: dict[int, str],
) -> list[ActivityRow]:
    """Everyday notes, calls and emails, spread over each deal's window or the last four months."""
    plans_by_id = {deal_ids[plan.name]: plan for plan in planned}
    owners = [("deal", deal_id) for deal_id in deal_ids.values()] + [("contact", c) for c in contact_ids.values()]
    rng.shuffle(owners)
    logged = []
    for n in range(GENERAL_ACTIVITY_COUNT):
        owner_kind, owner_id = owners[n % len(owners)]
        kind = rng.choice(["note", "call", "call", "email"])
        if owner_kind == "deal":
            plan = plans_by_id[owner_id]
            start, end = plan.started, min(plan.last_move, today - timedelta(days=1))
            contact_id = contact_ids.get(plan.contact) if plan.contact else None
            first = first_names.get(contact_id, "the client") if contact_id is not None else "the client"
            description = rng.choice(DEAL_NOTES[kind]).format(first=first, deal=plan.name)
        else:
            start, end = today - timedelta(days=120), today - timedelta(days=1)
            description = rng.choice(CONTACT_NOTES[kind]).format(first=first_names[owner_id])
        day = start + timedelta(days=rng.randint(0, max((end - start).days, 0)))
        when = stamp(day, rng.randint(8, 17), rng.choice([0, 10, 15, 25, 30, 40, 45, 55]), today)
        logged.append(
            activity_row(
                kind,
                description,
                when,
                deal_id=owner_id if owner_kind == "deal" else None,
                contact_id=owner_id if owner_kind == "contact" else None,
            )
        )
    return logged


def load(conn: Connection, today: date) -> dict:
    # One random generator, drawn from in a fixed order, so every reset on the same day matches.
    rng = random.Random(RANDOM_SEED)
    org_ids = _load_organizations(conn, today)
    contact_ids, first_names = _load_contacts(conn, today, rng, org_ids)
    planned = _plan_deals(today, rng)
    deal_ids, history = _load_deals(conn, today, planned, contact_ids, org_ids)
    logged = _named_activities(today, deal_ids, contact_ids)
    logged += _general_activities(today, rng, planned, deal_ids, contact_ids, first_names)

    conn.execute(insert(activities), sorted(history + logged, key=lambda a: a["occurred_at"]))
    return {
        "organizations": len(org_ids),
        "contacts": len(contact_ids),
        "deals": len(deal_ids),
        "activities": len(logged),
        "stage changes": len(history),
    }


def reset(engine: Engine) -> dict:
    """Empty every record table and load the sample data, in one transaction. `users` is kept."""
    run_migrations(engine)
    with engine.begin() as conn:
        for table in (activities, deals, contacts, organizations):
            conn.execute(delete(table))
        return load(conn, config.today())


def confirm_reset(url: str, ask: Callable[[str], str]) -> bool:
    """The local SQLite file is reset straight away. Any other database, such as the
    live one on Supabase, only after the person types "yes" (R41)."""
    if config.is_sqlite(url):
        return True
    print(f"This will delete every record in the database at {make_url(url).host}.")
    try:
        return ask('Type "yes" to go on: ').strip() == "yes"
    except EOFError:
        return False


def main() -> None:
    url = config.database_url()
    if not confirm_reset(url, input):
        raise SystemExit("Nothing changed.")
    engine = make_engine(url)
    counts = reset(engine)
    engine.dispose()
    print(
        f"Sample data loaded: {counts['organizations']} organizations, {counts['contacts']} contacts, "
        f"{counts['deals']} deals and {counts['activities']} activities, plus {counts['stage changes']} stage changes."
    )


if __name__ == "__main__":
    main()
