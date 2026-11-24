from typing import get_args

from app.deals.stages import STAGE_KEYS, StageKey


def test_stages_come_in_order_with_probabilities_and_open_flags(client):
    response = client.get("/api/stages")

    assert response.status_code == 200
    assert response.json() == [
        {"key": "new_lead", "label": "New Lead", "probability": 10, "open": True},
        {"key": "qualified", "label": "Qualified", "probability": 20, "open": True},
        {"key": "showing", "label": "Showing", "probability": 40, "open": True},
        {"key": "offer", "label": "Offer", "probability": 60, "open": True},
        {"key": "under_contract", "label": "Under Contract", "probability": 90, "open": True},
        {"key": "closed_won", "label": "Closed (Won)", "probability": 100, "open": False},
        {"key": "lost", "label": "Lost", "probability": 0, "open": False},
    ]


def test_the_stage_key_type_accepts_exactly_the_stages_in_board_order():
    assert list(get_args(StageKey)) == STAGE_KEYS
