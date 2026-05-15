"""Pure server-side grading for the 5 microtask types.

The client lies: the student's frontend may say "this is right" but the only
thing we trust is `grade()`'s return value here. The returned dict is
serialised straight into AttemptOut.
"""
from __future__ import annotations

import logging
import re
from typing import Any

from app.database.models import LessonTask

logger = logging.getLogger(__name__)


def _normalize_text(value: Any) -> str:
    if value is None:
        return ""
    s = str(value).strip().lower()
    # Collapse runs of whitespace into a single space.
    return re.sub(r"\s+", " ", s)


def _grade_single_choice(payload: dict, answer: dict) -> tuple[bool, Any]:
    correct_index = payload.get("correct_index")
    selected = answer.get("selected_index")
    is_correct = (
        isinstance(correct_index, int)
        and isinstance(selected, int)
        and selected == correct_index
    )
    options = payload.get("options") or []
    correct_value = None
    if isinstance(correct_index, int) and 0 <= correct_index < len(options):
        correct_value = options[correct_index]
    return is_correct, correct_value


def _grade_fill_blank(payload: dict, answer: dict) -> tuple[bool, Any]:
    correct_answers = payload.get("correct_answers") or []
    student_text = _normalize_text(answer.get("text"))
    normalized_correct = [_normalize_text(c) for c in correct_answers]
    is_correct = bool(student_text) and student_text in normalized_correct
    correct_value = correct_answers[0] if correct_answers else None
    return is_correct, correct_value


def _grade_matching(payload: dict, answer: dict) -> tuple[bool, Any]:
    correct_pairs = payload.get("correct_pairs") or []
    student_pairs = answer.get("pairs") or []

    def _as_pair_set(pairs):
        out = set()
        for p in pairs:
            if isinstance(p, (list, tuple)) and len(p) == 2:
                out.add((p[0], p[1]))
        return out

    is_correct = _as_pair_set(student_pairs) == _as_pair_set(correct_pairs)
    # Human-readable correct_value: "left → right" strings.
    left = payload.get("left_items") or []
    right = payload.get("right_items") or []
    pretty: list[str] = []
    for p in correct_pairs:
        if isinstance(p, (list, tuple)) and len(p) == 2:
            li, ri = p
            l = left[li] if isinstance(li, int) and 0 <= li < len(left) else li
            r = right[ri] if isinstance(ri, int) and 0 <= ri < len(right) else ri
            pretty.append(f"{l} → {r}")
    return is_correct, pretty


def _grade_classification(payload: dict, answer: dict) -> tuple[bool, Any]:
    correct_mapping = payload.get("correct_mapping") or {}
    student_mapping = answer.get("mapping") or {}
    is_correct = (
        isinstance(student_mapping, dict)
        and dict(student_mapping) == dict(correct_mapping)
    )
    return is_correct, correct_mapping


def _grade_ordering(payload: dict, answer: dict) -> tuple[bool, Any]:
    correct_order = payload.get("correct_order") or []
    student_order = answer.get("order") or []
    is_correct = (
        isinstance(student_order, list) and list(student_order) == list(correct_order)
    )
    # Human-readable correct_value: items rearranged into the right order.
    items = payload.get("items") or []
    pretty: list[str] = []
    for idx in correct_order:
        if isinstance(idx, int) and 0 <= idx < len(items):
            pretty.append(str(items[idx]))
    return is_correct, pretty


_GRADERS = {
    "single_choice": _grade_single_choice,
    "fill_blank": _grade_fill_blank,
    "matching": _grade_matching,
    "classification": _grade_classification,
    "ordering": _grade_ordering,
}


def grade(task: LessonTask, answer_payload: dict) -> dict[str, Any]:
    """Grade a single task attempt.

    Returns: {is_correct, correct_value, feedback, language_tip}.
    Never raises — unknown task types return is_correct=False with an
    explanatory feedback string.
    """
    payload = task.payload or {}
    answer = answer_payload or {}

    grader = _GRADERS.get(task.type)
    if grader is None:
        logger.warning("Unknown task type: %s (task %s)", task.type, task.id)
        return {
            "is_correct": False,
            "correct_value": None,
            "feedback": "Unknown task type",
            "language_tip": None,
        }

    try:
        is_correct, correct_value = grader(payload, answer)
    except Exception:  # noqa: BLE001 — defensive against malformed payloads
        logger.exception("Grader crashed on task %s", task.id)
        is_correct, correct_value = False, None

    feedback = payload.get("feedback_right" if is_correct else "feedback_wrong") or ""
    language_tip = payload.get("language_tip")

    return {
        "is_correct": bool(is_correct),
        "correct_value": correct_value,
        "feedback": feedback,
        "language_tip": language_tip,
    }
