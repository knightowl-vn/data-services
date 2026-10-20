from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field


class Rule(str, Enum):
    not_null = "not_null"
    unique = "unique"
    row_count_min = "row_count_min"
    freshness_hours = "freshness_hours"


class CheckCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    dataset: str = Field(min_length=1, description="Table name, e.g. sales.orders")
    rule: Rule
    column: str | None = None
    threshold: float | None = None


class Check(CheckCreate):
    id: int
    created_at: datetime


class RunStatus(str, Enum):
    queued = "queued"
    running = "running"
    passed = "passed"
    failed = "failed"


class Run(BaseModel):
    id: int
    check_id: int
    status: RunStatus
    created_at: datetime
