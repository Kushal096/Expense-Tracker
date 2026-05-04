"""Shared request validation helpers."""

from datetime import date, datetime, time, timezone
from typing import Any


def parse_date_input(value: Any) -> datetime:
    """Parse a date or datetime input into a naive UTC datetime.

    Accepts:
    - datetime objects
    - date objects
    - ISO 8601 strings with or without time

    Empty strings and invalid values raise a ValueError so FastAPI returns a
    clear 422 validation error.
    """

    if value is None:
        raise ValueError("Date is required")

    if isinstance(value, datetime):
        parsed = value
    elif isinstance(value, date):
        parsed = datetime.combine(value, time.min)
    elif isinstance(value, str):
        text = value.strip()
        if not text:
            raise ValueError("Date is required")

        try:
            parsed = datetime.fromisoformat(text.replace("Z", "+00:00"))
        except ValueError:
            try:
                parsed = datetime.combine(date.fromisoformat(text), time.min)
            except ValueError as exc:
                raise ValueError("Invalid date format") from exc
    else:
        raise ValueError("Invalid date format")

    if parsed.tzinfo is not None:
        parsed = parsed.astimezone(timezone.utc).replace(tzinfo=None)

    return parsed
