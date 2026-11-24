"""R23 and R25: where a deal lands in its column."""

import random

from app.deals.stages import STAGE_KEYS


def board(api):
    columns = {stage: [] for stage in STAGE_KEYS}
    for deal in sorted(api.get("/api/deals"), key=lambda d: d["position"]):
        columns[deal["stage"]].append(deal["name"])
    return columns


def positions(api):
    columns = {stage: [] for stage in STAGE_KEYS}
    for deal in api.get("/api/deals"):
        columns[deal["stage"]].append(deal["position"])
    return {stage: sorted(found) for stage, found in columns.items()}


def make_column(api, stage, names):
    # A new deal goes to the top, so create them bottom first.
    return {name: api.deal(name=name, stage=stage)["id"] for name in reversed(names)}


def test_a_new_deal_goes_to_the_top_of_its_column(api):
    api.deal(name="A", stage="offer")
    api.deal(name="B", stage="offer")

    assert board(api)["offer"] == ["B", "A"]


def test_moving_to_another_column_puts_the_deal_at_the_given_index(api):
    ids = make_column(api, "showing", ["S1", "S2"])
    make_column(api, "offer", ["O1", "O2", "O3"])

    api.move(ids["S1"], "offer", 1)

    assert board(api)["offer"] == ["O1", "S1", "O2", "O3"]
    assert board(api)["showing"] == ["S2"]


def test_moving_within_a_column_changes_only_the_order(api):
    ids = make_column(api, "offer", ["O1", "O2", "O3", "O4"])

    moved = api.move(ids["O4"], "offer", 1)

    assert board(api)["offer"] == ["O1", "O4", "O2", "O3"]
    deal = api.get(f"/api/deals/{ids['O4']}")
    assert deal["stage"] == "offer"
    assert isinstance(moved, list)


def test_moving_down_within_a_column_uses_the_index_in_the_final_order(api):
    ids = make_column(api, "offer", ["O1", "O2", "O3", "O4"])

    api.move(ids["O1"], "offer", 2)

    assert board(api)["offer"] == ["O2", "O3", "O1", "O4"]


def test_an_index_past_the_end_puts_the_deal_last(api):
    ids = make_column(api, "showing", ["S1"])
    make_column(api, "offer", ["O1", "O2"])

    api.move(ids["S1"], "offer", 99)

    assert board(api)["offer"] == ["O1", "O2", "S1"]


def test_a_deal_can_move_into_an_empty_column(api):
    ids = make_column(api, "showing", ["S1"])

    api.move(ids["S1"], "under_contract", 0)

    assert board(api)["under_contract"] == ["S1"]
    assert board(api)["showing"] == []


def test_the_move_returns_the_whole_board(api):
    ids = make_column(api, "showing", ["S1", "S2"])

    moved = api.move(ids["S1"], "offer", 0)

    assert sorted(d["name"] for d in moved) == ["S1", "S2"]
    assert {d["name"]: d["stage"] for d in moved} == {"S1": "offer", "S2": "showing"}


def test_positions_stay_gap_free_and_unique_after_a_run_of_mixed_moves(api):
    ids = []
    for stage in ["new_lead", "qualified", "showing", "offer"]:
        ids += list(make_column(api, stage, [f"{stage}-{n}" for n in range(4)]).values())
    rng = random.Random(7)

    for _ in range(60):
        api.move(rng.choice(ids), rng.choice(STAGE_KEYS), rng.randint(0, 8))

    for stage, found in positions(api).items():
        assert found == list(range(len(found))), stage


def test_a_stage_change_by_patch_puts_the_deal_at_the_top_and_closes_the_gap(api):
    ids = make_column(api, "showing", ["S1", "S2", "S3"])
    make_column(api, "offer", ["O1"])

    api.patch(f"/api/deals/{ids['S2']}", {"stage": "offer"})

    assert board(api)["offer"] == ["S2", "O1"]
    assert positions(api)["showing"] == [0, 1]


def test_deleting_a_deal_closes_the_gap_in_its_column(api):
    ids = make_column(api, "offer", ["O1", "O2", "O3"])

    api.client.delete(f"/api/deals/{ids['O2']}")

    assert board(api)["offer"] == ["O1", "O3"]
    assert positions(api)["offer"] == [0, 1]


def test_an_unknown_stage_returns_422(api, client):
    deal = api.deal()

    assert client.post(f"/api/deals/{deal['id']}/move", json={"stage": "won", "index": 0}).status_code == 422


def test_a_negative_index_returns_422(api, client):
    deal = api.deal()

    assert client.post(f"/api/deals/{deal['id']}/move", json={"stage": "offer", "index": -1}).status_code == 422


def test_moving_a_missing_deal_returns_404(client):
    assert client.post("/api/deals/999/move", json={"stage": "offer", "index": 0}).status_code == 404
