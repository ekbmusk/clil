from __future__ import annotations

from datetime import datetime

from sqlalchemy import (
    JSON,
    BigInteger,
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)
    telegram_id = Column(BigInteger, unique=True, nullable=False, index=True)
    first_name = Column(String(255), nullable=True)
    last_name = Column(String(255), nullable=True)
    username = Column(String(255), nullable=True)
    photo_url = Column(String(1000), nullable=True)
    role = Column(String(20), default="student", nullable=False)  # student | teacher
    streak_count = Column(Integer, default=0, nullable=False)
    last_active_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    attempts = relationship(
        "TaskAttempt", back_populates="user", cascade="all, delete-orphan"
    )
    progress = relationship(
        "LessonProgress", back_populates="user", cascade="all, delete-orphan"
    )
    enrollments = relationship(
        "GroupEnrollment", back_populates="user", cascade="all, delete-orphan"
    )


class Group(Base):
    __tablename__ = "groups"

    id = Column(Integer, primary_key=True)
    name = Column(String(255), nullable=False)
    code = Column(String(50), unique=True, nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    enrollments = relationship(
        "GroupEnrollment", back_populates="group", cascade="all, delete-orphan"
    )


class GroupEnrollment(Base):
    __tablename__ = "group_enrollments"

    id = Column(Integer, primary_key=True)
    group_id = Column(
        Integer, ForeignKey("groups.id", ondelete="CASCADE"), nullable=False
    )
    user_id = Column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    joined_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    group = relationship("Group", back_populates="enrollments")
    user = relationship("User", back_populates="enrollments")

    __table_args__ = (UniqueConstraint("group_id", "user_id", name="uq_group_user"),)


class Lesson(Base):
    __tablename__ = "lessons"

    id = Column(Integer, primary_key=True)
    external_id = Column(String(50), unique=True, nullable=False, index=True)
    topic = Column(String(255), nullable=True)
    title = Column(String(255), nullable=False)
    intro = Column(Text, nullable=True)
    physics_target = Column(Text, nullable=True)
    language_target = Column(Text, nullable=True)
    position = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    tasks = relationship(
        "LessonTask",
        back_populates="lesson",
        cascade="all, delete-orphan",
        order_by="LessonTask.position",
    )
    progress = relationship(
        "LessonProgress", back_populates="lesson", cascade="all, delete-orphan"
    )


class LessonTask(Base):
    __tablename__ = "lesson_tasks"

    id = Column(Integer, primary_key=True)
    lesson_id = Column(
        Integer,
        ForeignKey("lessons.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    external_id = Column(String(50), unique=True, nullable=False, index=True)
    position = Column(Integer, default=0, nullable=False)
    # single_choice | fill_blank | matching | classification | ordering
    type = Column(String(30), nullable=False)
    difficulty = Column(Integer, default=1, nullable=False)
    # Type-specific fields: prompt, prompt_template, options, correct_index,
    # correct_answers, left_items, right_items, correct_pairs, items, categories,
    # correct_mapping, correct_order, feedback_right, feedback_wrong, language_tip.
    payload = Column(JSON, nullable=False, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    lesson = relationship("Lesson", back_populates="tasks")
    attempts = relationship(
        "TaskAttempt", back_populates="task", cascade="all, delete-orphan"
    )


class TaskAttempt(Base):
    """Append-only log of every submission for grading auditing."""

    __tablename__ = "task_attempts"

    id = Column(Integer, primary_key=True)
    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    task_id = Column(
        Integer,
        ForeignKey("lesson_tasks.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    payload = Column(JSON, nullable=False, default=dict)
    is_correct = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="attempts")
    task = relationship("LessonTask", back_populates="attempts")


class LessonProgress(Base):
    __tablename__ = "lesson_progress"

    id = Column(Integer, primary_key=True)
    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    lesson_id = Column(
        Integer,
        ForeignKey("lessons.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    correct_count = Column(Integer, default=0, nullable=False)
    total_count = Column(Integer, default=0, nullable=False)
    accuracy = Column(Float, default=0.0, nullable=False)
    completed_at = Column(DateTime, nullable=True)
    updated_at = Column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    user = relationship("User", back_populates="progress")
    lesson = relationship("Lesson", back_populates="progress")

    __table_args__ = (
        UniqueConstraint("user_id", "lesson_id", name="uq_user_lesson_progress"),
    )


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True)
    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    kind = Column(String(50), nullable=False)
    payload = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    read_at = Column(DateTime, nullable=True)


class BroadcastLog(Base):
    __tablename__ = "broadcast_log"

    id = Column(Integer, primary_key=True)
    sent_by_user_id = Column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    recipient_user_id = Column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    message = Column(Text, nullable=False)
    sent_at = Column(DateTime, default=datetime.utcnow, nullable=False)
