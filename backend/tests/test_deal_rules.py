"""R14 to R16 and R19: probability, close date, stage-change entries and the late flag."""

from conftest import TODAY


def test_a_new_deal_starts_at_new_lead_with_its_probability(api):
    deal = api.deal()

    assert deal["stage"] == "new_lead"
    assert deal["probability"] == 10


def test_a_new_deal_takes_its_stages_probability(api):
    assert api.deal(stage="showing")["probability"] == 40


def test_a_new_deal_keeps_a_probability_given_with_it(api):
    assert api.deal(stage="offer", probability=55)["probability"] == 55


def test_a_new_deal_logs_no_stage_change(api):
    deal = api.deal(stage="offer")

    assert api.stage_changes(deal["id"]) == []


def test_a_probability_set_by_hand_is_kept_until_the_stage_changes(api):
    deal = api.deal(stage="showing")

    assert api.patch(f"/api/deals/{deal['id']}", {"probability": 55})["probability"] == 55
    assert api.patch(f"/api/deals/{deal['id']}", {"name": "New name", "value": 1})["probability"] == 55
    assert api.patch(f"/api/deals/{deal['id']}", {"stage": "offer"})["probability"] == 60


def test_a_patch_that_changes_the_stage_and_sets_a_probability_keeps_that_probability(api):
    deal = api.deal(stage="showing")

    assert api.patch(f"/api/deals/{deal['id']}", {"stage": "offer", "probability": 70})["probability"] == 70


def test_a_move_to_another_stage_takes_its_probability(api):
    deal = api.deal(stage="showing", probability=55)

    api.move(deal["id"], "under_contract", 0)

    assert api.get(f"/api/deals/{deal['id']}")["probability"] == 90


def test_moving_to_closed_won_or_lost_sets_the_close_date_to_today(api):
    won = api.deal(stage="offer", close_date="2027-02-01")
    lost = api.deal(stage="offer", close_date="2026-10-01")
    patched = api.deal(stage="offer", close_date="2027-03-01")

    api.move(won["id"], "closed_won", 0)
    api.move(lost["id"], "lost", 0)
    api.patch(f"/api/deals/{patched['id']}", {"stage": "closed_won"})

    assert api.get(f"/api/deals/{won['id']}")["close_date"] == TODAY
    assert api.get(f"/api/deals/{lost['id']}")["close_date"] == TODAY
    assert api.get(f"/api/deals/{patched['id']}")["close_date"] == TODAY


def test_a_patch_to_won_that_sends_the_unchanged_close_date_still_sets_today(api):
    deal = api.deal(stage="offer", close_date="2027-02-01")

    updated = api.patch(f"/api/deals/{deal['id']}", {"stage": "closed_won", "close_date": "2027-02-01"})

    assert updated["close_date"] == TODAY


def test_a_patch_to_won_keeps_a_close_date_changed_in_the_same_request(api):
    deal = api.deal(stage="offer", close_date="2027-02-01")

    updated = api.patch(f"/api/deals/{deal['id']}", {"stage": "closed_won", "close_date": "2026-11-10"})

    assert updated["close_date"] == "2026-11-10"


def test_the_close_date_can_be_edited_after_a_win(api):
    deal = api.deal(stage="offer")
    api.move(deal["id"], "closed_won", 0)

    assert api.patch(f"/api/deals/{deal['id']}", {"close_date": "2026-11-02"})["close_date"] == "2026-11-02"


def test_a_stage_change_by_patch_logs_exactly_one_entry(api):
    deal = api.deal(stage="showing")

    api.patch(f"/api/deals/{deal['id']}", {"stage": "offer"})

    [entry] = api.stage_changes(deal["id"])
    assert entry["description"] == "Moved from Showing to Offer"
    assert entry["from_stage"] == "showing"
    assert entry["to_stage"] == "offer"
    assert entry["deal_id"] == deal["id"]
    assert entry["contact_id"] is None


def test_a_stage_change_by_move_logs_exactly_one_entry(api):
    deal = api.deal(stage="under_contract")

    api.move(deal["id"], "lost", 0)

    [entry] = api.stage_changes(deal["id"])
    assert entry["description"] == "Moved from Under Contract to Lost"


def test_edits_that_keep_the_stage_log_nothing(api):
    deal = api.deal(stage="showing")

    api.patch(f"/api/deals/{deal['id']}", {"name": "Renamed", "stage": "showing", "probability": 45})

    assert api.stage_changes(deal["id"]) == []


def test_moves_within_a_column_log_nothing(api):
    first = api.deal(stage="offer")
    api.deal(stage="offer")

    api.move(first["id"], "offer", 0)
    api.move(first["id"], "offer", 1)

    assert api.stage_changes(first["id"]) == []


def test_an_open_deal_past_its_close_date_is_late(api):
    late = api.deal(stage="offer", close_date="2026-11-17")
    due_today = api.deal(stage="offer", close_date=TODAY)
    future = api.deal(stage="offer", close_date="2026-12-01")

    assert api.get(f"/api/deals/{late['id']}")["late"] is True
    assert api.get(f"/api/deals/{due_today['id']}")["late"] is False
    assert api.get(f"/api/deals/{future['id']}")["late"] is False


def test_closed_deals_are_never_late(api):
    won = api.deal(stage="closed_won", close_date="2026-10-01")
    lost = api.deal(stage="lost", close_date="2026-10-01")

    late_by_name = {deal["id"]: deal["late"] for deal in api.get("/api/deals")}

    assert late_by_name[won["id"]] is False
    assert late_by_name[lost["id"]] is False


def test_moving_a_late_deal_to_won_clears_its_late_flag(api):
    deal = api.deal(stage="offer", close_date="2026-11-01")
    assert deal["late"] is True

    api.move(deal["id"], "closed_won", 0)

    assert api.get(f"/api/deals/{deal['id']}")["late"] is False
