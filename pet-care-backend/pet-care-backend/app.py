import json
import os
import csv
import io
from datetime import datetime, timedelta, timezone
from functools import wraps

import jwt
from flask import Flask, Response, jsonify, request
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash


app = Flask(__name__)

frontend_origins = [
    origin.strip()
    for origin in os.environ.get("FRONTEND_ORIGINS", "").split(",")
    if origin.strip()
]

CORS(
    app,
    resources={
        r"/api/*": {
            "origins": frontend_origins
            or [
                "http://localhost:5173",
                "http://127.0.0.1:5173",
                "http://localhost:5174",
                "http://127.0.0.1:5174",
                "http://localhost:5181",
                "http://127.0.0.1:5181",
            ],
            "methods": ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
            "allow_headers": ["Content-Type", "Authorization"],
        }
    },
)

app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///pet_care.db"
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
app.config["SECRET_KEY"] = os.environ.get(
    "PET_CARE_SECRET_KEY",
    "dev-secret-key-change-before-production",
)

db = SQLAlchemy(app)

APP_TIMEZONE = timezone(timedelta(hours=8))


def now_local():
    return datetime.now(APP_TIMEZONE).replace(tzinfo=None)


# =========================
# Models
# =========================

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)

    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)

    name = db.Column(db.String(80), nullable=False)
    phone = db.Column(db.String(30), nullable=False)

    role = db.Column(db.String(20), default="member")
    created_at = db.Column(db.DateTime, default=now_local)

    pets = db.relationship(
        "Pet",
        backref="user",
        lazy=True,
        cascade="all, delete-orphan"
    )

    orders = db.relationship(
        "Order",
        backref="user",
        lazy=True,
        cascade="all, delete-orphan"
    )


class Pet(db.Model):
    id = db.Column(db.Integer, primary_key=True)

    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)

    name = db.Column(db.String(80), nullable=False)
    species = db.Column(db.String(20), nullable=False)
    breed = db.Column(db.String(80), nullable=False)

    age = db.Column(db.Integer, nullable=False)
    weight = db.Column(db.Float, nullable=False)
    gender = db.Column(db.String(10), nullable=False)

    notes = db.Column(db.Text, default="")
    image_url = db.Column(db.String(255), default="")
    allergies = db.Column(db.Text, default="")
    medical_notes = db.Column(db.Text, default="")
    vaccine_date = db.Column(db.String(20), default="")
    vet_name = db.Column(db.String(120), default="")
    vet_phone = db.Column(db.String(30), default="")
    emergency_contact = db.Column(db.String(120), default="")

    created_at = db.Column(db.DateTime, default=now_local)

    orders = db.relationship("Order", backref="pet", lazy=True)


class Order(db.Model):
    id = db.Column(db.Integer, primary_key=True)

    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    pet_id = db.Column(db.Integer, db.ForeignKey("pet.id"), nullable=False)

    service_type = db.Column(db.String(30), nullable=False)  # accommodation / grooming

    room_type = db.Column(db.String(30), nullable=True)
    grooming_service = db.Column(db.String(30), nullable=True)

    start_date = db.Column(db.String(20), nullable=False)
    end_date = db.Column(db.String(20), nullable=True)
    assigned_spot = db.Column(db.String(40), nullable=True)
    scheduled_time = db.Column(db.String(20), nullable=True)
    assignment_note = db.Column(db.Text, default="")
    cancel_reason = db.Column(db.String(120), default="")

    total = db.Column(db.Integer, nullable=False)
    add_on_items = db.Column(db.Text, default="[]")
    add_on_total = db.Column(db.Integer, default=0)

    status = db.Column(db.String(20), default="待確認")
    payment_status = db.Column(db.String(20), default="未付款")
    payment_method = db.Column(db.String(30), default="")
    paid_amount = db.Column(db.Integer, default=0)
    receipt_no = db.Column(db.String(40), default="")
    paid_at = db.Column(db.DateTime, nullable=True)

    notes = db.Column(db.Text, default="")
    rating = db.Column(db.Integer, nullable=True)
    review = db.Column(db.Text, nullable=True)

    created_at = db.Column(db.DateTime, default=now_local)

    care_logs = db.relationship(
        "CareLog",
        backref="order",
        lazy=True,
        cascade="all, delete-orphan"
    )

    audit_logs = db.relationship(
        "AuditLog",
        backref="order",
        lazy=True,
        cascade="all, delete-orphan"
    )


class CareLog(db.Model):
    id = db.Column(db.Integer, primary_key=True)

    order_id = db.Column(db.Integer, db.ForeignKey("order.id"), nullable=False)
    author_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=True)

    log_type = db.Column(db.String(30), nullable=False)
    message = db.Column(db.Text, nullable=False)
    photo_url = db.Column(db.String(255), default="")
    visible_to_customer = db.Column(db.Boolean, default=True)

    created_at = db.Column(db.DateTime, default=now_local)

    author = db.relationship("User", lazy=True)


class Notification(db.Model):
    id = db.Column(db.Integer, primary_key=True)

    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    order_id = db.Column(db.Integer, db.ForeignKey("order.id"), nullable=True)

    type = db.Column(db.String(30), default="info")
    title = db.Column(db.String(120), nullable=False)
    message = db.Column(db.Text, nullable=False)
    read_at = db.Column(db.DateTime, nullable=True)

    created_at = db.Column(db.DateTime, default=now_local)

    user = db.relationship("User", lazy=True)
    order = db.relationship("Order", lazy=True)


class AuditLog(db.Model):
    id = db.Column(db.Integer, primary_key=True)

    order_id = db.Column(db.Integer, db.ForeignKey("order.id"), nullable=True)
    actor_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=True)

    action = db.Column(db.String(60), nullable=False)
    detail = db.Column(db.Text, default="")

    created_at = db.Column(db.DateTime, default=now_local)

    actor = db.relationship("User", lazy=True)


class AppSetting(db.Model):
    key = db.Column(db.String(80), primary_key=True)
    value = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=now_local)
    updated_at = db.Column(
        db.DateTime,
        default=now_local,
        onupdate=now_local,
    )


class StaffShift(db.Model):
    id = db.Column(db.Integer, primary_key=True)

    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    work_date = db.Column(db.String(20), nullable=False)
    shift_label = db.Column(db.String(80), nullable=False)
    role = db.Column(db.String(20), nullable=False)
    note = db.Column(db.Text, default="")

    created_at = db.Column(db.DateTime, default=now_local)

    user = db.relationship("User", lazy=True)


class StaffAttendance(db.Model):
    id = db.Column(db.Integer, primary_key=True)

    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    work_date = db.Column(db.String(20), nullable=False)
    role = db.Column(db.String(20), nullable=False)
    clock_in_at = db.Column(db.DateTime, nullable=True)
    clock_out_at = db.Column(db.DateTime, nullable=True)
    note = db.Column(db.Text, default="")

    created_at = db.Column(db.DateTime, default=now_local)
    updated_at = db.Column(
        db.DateTime,
        default=now_local,
        onupdate=now_local,
    )

    user = db.relationship("User", lazy=True)


# =========================
# Constants
# =========================

ROOM_PRICES = {
    "standard": 800,
    "deluxe": 1200,
    "vip": 2000,
}

ROOM_CAPACITY = {
    "standard": 5,
    "deluxe": 3,
    "vip": 2,
}

ROOM_SPOTS = {
    "standard": ["S-01", "S-02", "S-03", "S-04", "S-05"],
    "deluxe": ["D-01", "D-02", "D-03"],
    "vip": ["V-01", "V-02"],
}

GROOMING_PRICES = {
    "basic": 600,
    "styling": 1200,
    "spa": 1800,
}

GROOMING_STATIONS = ["G-01", "G-02", "G-03"]

GROOMING_TIMES = ["09:00", "10:30", "13:00", "14:30", "16:00", "17:30"]

ADD_ON_SERVICES = {
    "pickup": {
        "name": "到店接送",
        "price": 300,
        "description": "由店家協助定點接送毛孩。",
    },
    "medication": {
        "name": "餵藥與特殊照護",
        "price": 200,
        "description": "依家長交代協助用藥、觀察食慾與精神。",
    },
    "walk": {
        "name": "散步加購",
        "price": 180,
        "description": "住宿或托育期間加一次散步活動。",
    },
}

DEFAULT_ASSIGNMENT_OPTIONS = {
    "roomSpots": ROOM_SPOTS,
    "groomingStations": GROOMING_STATIONS,
    "groomingTimes": GROOMING_TIMES,
}

DEFAULT_SERVICE_CATALOG = {
    "roomPrices": ROOM_PRICES,
    "groomingPrices": GROOMING_PRICES,
    "addOnServices": ADD_ON_SERVICES,
}

DEFAULT_BUSINESS_SETTINGS = {
    "weekdayHours": "09:00 - 21:00",
    "weekendHours": "09:00 - 21:00",
    "shifts": ["早班 09:00-15:00", "晚班 15:00-21:00"],
    "closedDates": [],
}

DEFAULT_NOTIFICATION_SETTINGS = {
    "bookingReminderHours": 72,
    "paymentReminderHours": 12,
    "careLogNotifyCustomer": True,
    "channels": ["站內通知", "Email"],
    "staffReminderText": "請確認今日入住、退房、美容與待收款項目。",
}

SYSTEM_USER_ROLES = ["staff", "groomer", "caregiver", "admin"]
WORKER_ROLES = {"staff", "groomer", "caregiver", "admin"}


# =========================
# Helpers
# =========================

def user_to_dict(user: User):
    return {
        "id": str(user.id),
        "email": user.email,
        "name": user.name,
        "phone": user.phone,
        "role": user.role,
        "createdAt": user.created_at.isoformat(),
    }


def role_label(role: str):
    return {
        "member": "會員",
        "staff": "店務人員",
        "groomer": "美容師",
        "caregiver": "寵物照護師",
        "admin": "系統管理員",
    }.get(role, role)


def pet_to_dict(pet: Pet):
    return {
        "id": str(pet.id),
        "userId": str(pet.user_id),
        "name": pet.name,
        "species": pet.species,
        "breed": pet.breed,
        "age": pet.age,
        "weight": pet.weight,
        "gender": pet.gender,
        "notes": pet.notes or "",
        "imageUrl": pet.image_url or "",
        "allergies": pet.allergies or "",
        "medicalNotes": pet.medical_notes or "",
        "vaccineDate": pet.vaccine_date or "",
        "vetName": pet.vet_name or "",
        "vetPhone": pet.vet_phone or "",
        "emergencyContact": pet.emergency_contact or "",
        "createdAt": pet.created_at.isoformat(),
    }


def care_log_to_dict(log: CareLog):
    return {
        "id": str(log.id),
        "orderId": str(log.order_id),
        "authorName": log.author.name if log.author else "系統",
        "logType": log.log_type,
        "message": log.message,
        "photoUrl": log.photo_url or "",
        "visibleToCustomer": log.visible_to_customer,
        "createdAt": log.created_at.isoformat(),
    }


def notification_to_dict(notification: Notification):
    return {
        "id": str(notification.id),
        "orderId": str(notification.order_id) if notification.order_id else None,
        "type": notification.type,
        "title": notification.title,
        "message": notification.message,
        "read": notification.read_at is not None,
        "readAt": notification.read_at.isoformat() if notification.read_at else None,
        "createdAt": notification.created_at.isoformat(),
    }


def audit_log_to_dict(log: AuditLog):
    return {
        "id": str(log.id),
        "orderId": str(log.order_id) if log.order_id else None,
        "actorName": log.actor.name if log.actor else "系統",
        "action": log.action,
        "detail": log.detail or "",
        "createdAt": log.created_at.isoformat(),
    }


def order_to_dict(order: Order, include_internal_logs: bool = False):
    care_logs = sorted(
        order.care_logs,
        key=lambda log: log.created_at,
        reverse=True,
    )

    if not include_internal_logs:
        care_logs = [
            log for log in care_logs if log.visible_to_customer
        ]

    paid_amount = order.paid_amount or 0
    balance_due = max(0, order.total - paid_amount)
    add_on_items = parse_add_on_items(order.add_on_items)

    result = {
        "id": str(order.id),
        "userId": str(order.user_id),
        "userName": order.user.name if order.user else "",
        "userEmail": order.user.email if order.user else "",
        "userPhone": order.user.phone if order.user else "",
        "petId": str(order.pet_id),
        "petName": order.pet.name if order.pet else "",
        "petImageUrl": order.pet.image_url if order.pet else "",
        "pet": pet_to_dict(order.pet) if order.pet else None,
        "serviceType": order.service_type,
        "roomType": order.room_type,
        "groomingService": order.grooming_service,
        "startDate": order.start_date,
        "endDate": order.end_date,
        "assignedSpot": order.assigned_spot,
        "scheduledTime": order.scheduled_time,
        "assignmentNote": order.assignment_note or "",
        "cancelReason": order.cancel_reason or "",
        "total": order.total,
        "addOnItems": add_on_items,
        "addOnTotal": order.add_on_total or 0,
        "status": order.status,
        "paymentStatus": order.payment_status,
        "paymentMethod": order.payment_method or "",
        "paidAmount": paid_amount,
        "balanceDue": balance_due,
        "receiptNo": order.receipt_no or "",
        "paidAt": order.paid_at.isoformat() if order.paid_at else None,
        "notes": order.notes or "",
        "rating": order.rating,
        "review": order.review,
        "careLogs": [care_log_to_dict(log) for log in care_logs],
        "createdAt": order.created_at.isoformat(),
    }

    if include_internal_logs:
        audit_logs = sorted(
            order.audit_logs,
            key=lambda log: log.created_at,
            reverse=True,
        )
        result["auditLogs"] = [audit_log_to_dict(log) for log in audit_logs]

    return result


def staff_shift_to_dict(shift: StaffShift):
    return {
        "id": str(shift.id),
        "userId": str(shift.user_id),
        "userName": shift.user.name if shift.user else "",
        "userEmail": shift.user.email if shift.user else "",
        "workDate": shift.work_date,
        "shiftLabel": shift.shift_label,
        "role": shift.role,
        "roleLabel": role_label(shift.role),
        "note": shift.note or "",
        "createdAt": shift.created_at.isoformat(),
    }


def staff_attendance_to_dict(attendance: StaffAttendance | None):
    if not attendance:
        return None

    worked_minutes = 0
    if attendance.clock_in_at:
        end_at = attendance.clock_out_at or now_local()
        worked_minutes = max(0, int((end_at - attendance.clock_in_at).total_seconds() // 60))

    return {
        "id": str(attendance.id),
        "userId": str(attendance.user_id),
        "userName": attendance.user.name if attendance.user else "",
        "workDate": attendance.work_date,
        "role": attendance.role,
        "roleLabel": role_label(attendance.role),
        "clockInAt": attendance.clock_in_at.isoformat() if attendance.clock_in_at else None,
        "clockOutAt": attendance.clock_out_at.isoformat() if attendance.clock_out_at else None,
        "workedMinutes": worked_minutes,
        "note": attendance.note or "",
        "createdAt": attendance.created_at.isoformat(),
        "updatedAt": attendance.updated_at.isoformat(),
    }


def member_to_dict(user: User):
    member_orders = sorted(
        user.orders,
        key=lambda order: order.created_at,
        reverse=True,
    )

    return {
        **user_to_dict(user),
        "pets": [pet_to_dict(pet) for pet in user.pets],
        "orders": [
            order_to_dict(order, include_internal_logs=True)
            for order in member_orders[:8]
        ],
        "orderCount": len(user.orders),
        "petCount": len(user.pets),
    }


def normalize_string_list(value):
    if isinstance(value, str):
        raw_items = value.replace("\n", ",").split(",")
    elif isinstance(value, list):
        raw_items = value
    else:
        raw_items = []

    result = []
    seen = set()

    for item in raw_items:
        text = str(item).strip()

        if not text or text in seen:
            continue

        result.append(text)
        seen.add(text)

    return result


def normalize_assignment_options(data):
    room_spots = data.get("roomSpots") if isinstance(data, dict) else None
    normalized_room_spots = {}

    for room_type in ROOM_PRICES:
        source = room_spots if isinstance(room_spots, dict) else {}
        items = normalize_string_list(source.get(room_type))
        normalized_room_spots[room_type] = (
            items or list(DEFAULT_ASSIGNMENT_OPTIONS["roomSpots"].get(room_type, []))
        )

    grooming_stations = normalize_string_list(
        data.get("groomingStations") if isinstance(data, dict) else None
    )
    grooming_times = normalize_string_list(
        data.get("groomingTimes") if isinstance(data, dict) else None
    )

    return {
        "roomSpots": normalized_room_spots,
        "groomingStations": (
            grooming_stations or list(DEFAULT_ASSIGNMENT_OPTIONS["groomingStations"])
        ),
        "groomingTimes": (
            grooming_times or list(DEFAULT_ASSIGNMENT_OPTIONS["groomingTimes"])
        ),
    }


def get_assignment_options():
    setting = db.session.get(AppSetting, "assignment_options")

    if not setting:
        return normalize_assignment_options(DEFAULT_ASSIGNMENT_OPTIONS)

    try:
        data = json.loads(setting.value)
    except (TypeError, json.JSONDecodeError):
        return normalize_assignment_options(DEFAULT_ASSIGNMENT_OPTIONS)

    return normalize_assignment_options(data)


def save_assignment_options(data):
    options = normalize_assignment_options(data or {})
    setting = db.session.get(AppSetting, "assignment_options")

    if setting:
        setting.value = json.dumps(options, ensure_ascii=False)
    else:
        setting = AppSetting(
            key="assignment_options",
            value=json.dumps(options, ensure_ascii=False),
        )
        db.session.add(setting)

    return options


def get_json_setting(key, default_value):
    setting = db.session.get(AppSetting, key)

    if not setting:
        return default_value

    try:
        value = json.loads(setting.value)
    except (TypeError, json.JSONDecodeError):
        return default_value

    return value if isinstance(value, dict) else default_value


def save_json_setting(key, value):
    setting = db.session.get(AppSetting, key)
    encoded = json.dumps(value, ensure_ascii=False)

    if setting:
        setting.value = encoded
    else:
        db.session.add(AppSetting(key=key, value=encoded))

    return value


def normalize_price_map(value, defaults):
    source = value if isinstance(value, dict) else {}
    result = {}

    for key, default_price in defaults.items():
        try:
            price = int(source.get(key, default_price))
        except (TypeError, ValueError):
            price = default_price

        result[key] = max(0, price)

    return result


def add_on_services_to_dict():
    return {
        key: {
            "id": key,
            "name": value["name"],
            "price": value["price"],
            "description": value["description"],
        }
        for key, value in ADD_ON_SERVICES.items()
    }


def normalize_add_on_ids(value):
    if isinstance(value, str):
        source = value.replace("\n", ",").split(",")
    elif isinstance(value, list):
        source = value
    else:
        source = []

    result = []
    seen = set()

    for item in source:
        add_on_id = str(item).strip()

        if add_on_id not in ADD_ON_SERVICES or add_on_id in seen:
            continue

        result.append(add_on_id)
        seen.add(add_on_id)

    return result


def serialize_add_on_items(add_on_ids):
    items = []

    for add_on_id in normalize_add_on_ids(add_on_ids):
        option = ADD_ON_SERVICES[add_on_id]
        items.append({
            "id": add_on_id,
            "name": option["name"],
            "price": option["price"],
        })

    return items


def parse_add_on_items(value):
    if not value:
        return []

    try:
        items = json.loads(value)
    except (TypeError, json.JSONDecodeError):
        return serialize_add_on_items(value)

    if not isinstance(items, list):
        return []

    result = []

    for item in items:
        if not isinstance(item, dict):
            continue

        add_on_id = str(item.get("id", "")).strip()
        option = ADD_ON_SERVICES.get(add_on_id)

        if not option:
            continue

        result.append({
            "id": add_on_id,
            "name": option["name"],
            "price": option["price"],
        })

    return result


def add_on_total(add_on_ids):
    return sum(item["price"] for item in serialize_add_on_items(add_on_ids))


def get_service_catalog():
    data = get_json_setting("service_catalog", DEFAULT_SERVICE_CATALOG)

    return {
        "roomPrices": normalize_price_map(
            data.get("roomPrices"),
            DEFAULT_SERVICE_CATALOG["roomPrices"],
        ),
        "groomingPrices": normalize_price_map(
            data.get("groomingPrices"),
            DEFAULT_SERVICE_CATALOG["groomingPrices"],
        ),
        "addOnServices": add_on_services_to_dict(),
    }


def save_service_catalog(data):
    catalog = {
        "roomPrices": normalize_price_map(
            data.get("roomPrices") if isinstance(data, dict) else None,
            DEFAULT_SERVICE_CATALOG["roomPrices"],
        ),
        "groomingPrices": normalize_price_map(
            data.get("groomingPrices") if isinstance(data, dict) else None,
            DEFAULT_SERVICE_CATALOG["groomingPrices"],
        ),
        "addOnServices": add_on_services_to_dict(),
    }

    return save_json_setting("service_catalog", catalog)


def get_business_settings():
    data = get_json_setting("business_settings", DEFAULT_BUSINESS_SETTINGS)

    return {
        "weekdayHours": str(
            data.get("weekdayHours", DEFAULT_BUSINESS_SETTINGS["weekdayHours"])
        ).strip(),
        "weekendHours": str(
            data.get("weekendHours", DEFAULT_BUSINESS_SETTINGS["weekendHours"])
        ).strip(),
        "shifts": normalize_string_list(data.get("shifts"))
        or list(DEFAULT_BUSINESS_SETTINGS["shifts"]),
        "closedDates": normalize_string_list(data.get("closedDates")),
    }


def save_business_settings(data):
    settings = {
        "weekdayHours": str(data.get("weekdayHours", "")).strip()
        or DEFAULT_BUSINESS_SETTINGS["weekdayHours"],
        "weekendHours": str(data.get("weekendHours", "")).strip()
        or DEFAULT_BUSINESS_SETTINGS["weekendHours"],
        "shifts": normalize_string_list(data.get("shifts"))
        or list(DEFAULT_BUSINESS_SETTINGS["shifts"]),
        "closedDates": normalize_string_list(data.get("closedDates")),
    }

    return save_json_setting("business_settings", settings)


def get_notification_settings():
    data = get_json_setting("notification_settings", DEFAULT_NOTIFICATION_SETTINGS)

    def safe_int(key):
        try:
            return max(0, int(data.get(key, DEFAULT_NOTIFICATION_SETTINGS[key])))
        except (TypeError, ValueError):
            return DEFAULT_NOTIFICATION_SETTINGS[key]

    return {
        "bookingReminderHours": safe_int("bookingReminderHours"),
        "paymentReminderHours": safe_int("paymentReminderHours"),
        "careLogNotifyCustomer": bool(
            data.get(
                "careLogNotifyCustomer",
                DEFAULT_NOTIFICATION_SETTINGS["careLogNotifyCustomer"],
            )
        ),
        "channels": normalize_string_list(data.get("channels"))
        or list(DEFAULT_NOTIFICATION_SETTINGS["channels"]),
        "staffReminderText": str(
            data.get(
                "staffReminderText",
                DEFAULT_NOTIFICATION_SETTINGS["staffReminderText"],
            )
        ).strip(),
    }


def save_notification_settings(data):
    settings = get_notification_settings()

    if isinstance(data, dict):
        settings = {
            "bookingReminderHours": max(
                0,
                int(data.get("bookingReminderHours", settings["bookingReminderHours"])),
            ),
            "paymentReminderHours": max(
                0,
                int(data.get("paymentReminderHours", settings["paymentReminderHours"])),
            ),
            "careLogNotifyCustomer": bool(
                data.get("careLogNotifyCustomer", settings["careLogNotifyCustomer"])
            ),
            "channels": normalize_string_list(data.get("channels"))
            or settings["channels"],
            "staffReminderText": str(
                data.get("staffReminderText", settings["staffReminderText"])
            ).strip(),
        }

    return save_json_setting("notification_settings", settings)


def create_audit_log(action: str, detail: str, order=None):
    actor = getattr(request, "current_user", None)
    audit_log = AuditLog(
        order_id=order.id if order else None,
        actor_id=actor.id if actor else None,
        action=action,
        detail=detail,
    )
    db.session.add(audit_log)
    return audit_log


def create_token(user_id: int):
    payload = {
        "user_id": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
        "iat": datetime.now(timezone.utc),
    }

    return jwt.encode(
        payload,
        app.config["SECRET_KEY"],
        algorithm="HS256"
    )


def auth_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        auth_header = request.headers.get("Authorization", "")

        if not auth_header.startswith("Bearer "):
            return jsonify({"message": "缺少登入憑證"}), 401

        token = auth_header.replace("Bearer ", "").strip()

        try:
            payload = jwt.decode(
                token,
                app.config["SECRET_KEY"],
                algorithms=["HS256"]
            )

            user = db.session.get(User, payload["user_id"])

            if not user:
                return jsonify({"message": "使用者不存在"}), 401

            request.current_user = user

        except jwt.ExpiredSignatureError:
            return jsonify({"message": "登入已過期，請重新登入"}), 401

        except jwt.InvalidTokenError:
            return jsonify({"message": "無效的登入憑證"}), 401

        return fn(*args, **kwargs)

    return wrapper


def admin_required(fn):
    @auth_required
    @wraps(fn)
    def wrapper(*args, **kwargs):
        if request.current_user.role not in {"staff", "admin"}:
            return jsonify({"message": "需要店務人員權限"}), 403

        return fn(*args, **kwargs)

    return wrapper


def worker_required(fn):
    @auth_required
    @wraps(fn)
    def wrapper(*args, **kwargs):
        if request.current_user.role not in WORKER_ROLES:
            return jsonify({"message": "需要工作人員權限"}), 403

        return fn(*args, **kwargs)

    return wrapper


def staff_user_required(fn):
    @auth_required
    @wraps(fn)
    def wrapper(*args, **kwargs):
        if request.current_user.role not in WORKER_ROLES:
            return jsonify({"message": "需要員工權限"}), 403

        return fn(*args, **kwargs)

    return wrapper


def system_admin_required(fn):
    @auth_required
    @wraps(fn)
    def wrapper(*args, **kwargs):
        if request.current_user.role != "admin":
            return jsonify({"message": "需要系統管理員權限"}), 403

        return fn(*args, **kwargs)

    return wrapper


def worker_can_access_order(user: User, order: Order):
    if user.role in {"staff", "admin"}:
        return True

    if user.role == "groomer":
        return order.service_type == "grooming"

    if user.role == "caregiver":
        return order.service_type == "accommodation"

    return False


def get_today_attendance(user: User):
    work_date = now_local().date().isoformat()
    attendance = StaffAttendance.query.filter_by(
        user_id=user.id,
        work_date=work_date,
    ).first()

    return attendance


def order_matches_work_date(order: Order, target_date: str):
    if order.status == "已取消":
        return False

    if order.service_type == "accommodation":
        return bool(order.end_date) and order.start_date <= target_date < order.end_date

    return order.start_date == target_date


def auto_cancel_expired_orders():
    today = now_local().date().isoformat()
    expirable_statuses = ["待確認", "已確認", "待會員確認"]
    expired_orders = (
        Order.query
        .filter(
            Order.status.in_(expirable_statuses),
            Order.start_date < today,
        )
        .all()
    )

    if not expired_orders:
        return 0

    for order in expired_orders:
        previous_status = order.status
        order.status = "已取消"
        db.session.add(AuditLog(
            order_id=order.id,
            actor_id=None,
            action="系統自動取消",
            detail=f"預約日期 {order.start_date} 已逾期，狀態由「{previous_status}」改為「已取消」",
        ))

    db.session.commit()
    return len(expired_orders)


def create_upcoming_booking_reminders(user: User):
    settings = get_notification_settings()

    try:
        reminder_hours = int(settings.get("bookingReminderHours", 24))
    except (TypeError, ValueError):
        reminder_hours = 24

    days_before = max(1, round(reminder_hours / 24))
    target_date = (now_local().date() + timedelta(days=days_before)).isoformat()
    orders = (
        Order.query
        .filter_by(user_id=user.id)
        .filter(
            Order.status.in_(["已確認", "待會員確認"]),
            Order.start_date == target_date,
        )
        .all()
    )

    changed_count = 0

    for order in orders:
        if order.status == "已確認":
            order.status = "待會員確認"
            changed_count += 1
            db.session.add(AuditLog(
                order_id=order.id,
                actor_id=None,
                action="系統預約確認",
                detail=f"預約日期 {order.start_date} 即將到來，等待會員再次確認。",
            ))

        exists = (
            Notification.query
            .filter_by(
                user_id=user.id,
                order_id=order.id,
                type="booking_reconfirm",
            )
            .first()
        )

        if exists:
            continue

        service_name = "住宿" if order.service_type == "accommodation" else "美容"
        time_text = (
            f"{order.scheduled_time} "
            if order.service_type == "grooming" and order.scheduled_time
            else ""
        )
        create_customer_notification(
            order,
            "請確認是否保留預約",
            f"{target_date} {time_text}有 {order.pet.name if order.pet else '毛孩'} 的{service_name}預約，請確認是否仍要前往。若不前往，系統會取消訂單並釋出原本安排的位置。",
            "booking_reconfirm",
        )
        changed_count += 1

    if changed_count:
        db.session.commit()

    return changed_count


def create_customer_notification(
    order: Order,
    title: str,
    message: str,
    notification_type: str = "info",
):
    db.session.add(Notification(
        user_id=order.user_id,
        order_id=order.id,
        type=notification_type,
        title=title,
        message=message,
    ))


def generate_receipt_no(order: Order):
    if order.receipt_no:
        return order.receipt_no

    date_key = now_local().strftime("%Y%m%d")
    return f"RC-{date_key}-{order.id:04d}"


def notify_customer_for_care_log(order: Order, log_type: str, message: str):
    settings = get_notification_settings()

    if not settings.get("careLogNotifyCustomer", True):
        return

    is_abnormal = log_type == "異常"
    create_customer_notification(
        order,
        "毛孩異常狀況通知" if is_abnormal else "新的照護回報",
        f"訂單 #{order.id}（{order.pet.name if order.pet else '毛孩'}）：{message}",
        "alert" if is_abnormal else "care_log",
    )


def get_room_availability_by_date(target_date: str):
    stats = {}
    assignment_options = get_assignment_options()
    room_spots = assignment_options["roomSpots"]

    for room_type in ROOM_PRICES:
        capacity = len(room_spots.get(room_type, [])) or ROOM_CAPACITY[room_type]
        booked_count = (
            Order.query
            .filter(
                Order.service_type == "accommodation",
                Order.room_type == room_type,
                Order.status != "已取消",
                Order.start_date <= target_date,
                Order.end_date > target_date,
            )
            .count()
        )

        stats[room_type] = {
            "capacity": capacity,
            "booked": booked_count,
            "remaining": max(0, capacity - booked_count),
        }

    return stats


def check_room_available_for_range(room_type: str, start_date: str, end_date: str):
    current = datetime.fromisoformat(start_date)
    end = datetime.fromisoformat(end_date)

    while current < end:
        target_date = current.strftime("%Y-%m-%d")
        availability = get_room_availability_by_date(target_date)

        if availability[room_type]["remaining"] <= 0:
            return False, target_date

        current += timedelta(days=1)

    return True, None


def get_grooming_availability_by_date(target_date: str):
    assignment_options = get_assignment_options()
    stations = assignment_options["groomingStations"] or GROOMING_STATIONS
    times = assignment_options["groomingTimes"] or GROOMING_TIMES
    capacity = len(stations)
    result = []

    for scheduled_time in times:
        booked_count = (
            Order.query
            .filter(
                Order.service_type == "grooming",
                Order.status != "已取消",
                Order.start_date == target_date,
                Order.scheduled_time == scheduled_time,
            )
            .count()
        )
        result.append({
            "time": scheduled_time,
            "capacity": capacity,
            "booked": booked_count,
            "remaining": max(0, capacity - booked_count),
        })

    return result


def check_grooming_time_available(target_date: str, scheduled_time: str):
    availability = get_grooming_availability_by_date(target_date)
    slot = next((item for item in availability if item["time"] == scheduled_time), None)

    if not slot:
        return False, "此美容時段不存在"

    if slot["remaining"] <= 0:
        return False, f"{scheduled_time} 美容時段已額滿"

    return True, ""


def can_customer_cancel(order: Order):
    if order.status not in ["待確認", "已確認", "待會員確認"]:
        return False, "此訂單目前不可取消"

    today = now_local().date()

    if order.service_type == "grooming" and order.scheduled_time:
        try:
            service_at = datetime.fromisoformat(
                f"{order.start_date}T{order.scheduled_time}"
            )
        except ValueError:
            service_at = datetime.fromisoformat(f"{order.start_date}T00:00")

        if service_at - now_local() < timedelta(hours=24):
            return False, "預約前 24 小時內不可自行取消，請聯繫店務人員"

        return True, ""

    try:
        start_date = datetime.fromisoformat(order.start_date).date()
    except ValueError:
        return True, ""

    if start_date <= today:
        return False, "當日預約不可自行取消，請聯繫店務人員"

    return True, ""


def validate_order_assignment(order: Order, assigned_spot: str, scheduled_time: str):
    assigned_spot = (assigned_spot or "").strip()
    scheduled_time = (scheduled_time or "").strip()
    assignment_options = get_assignment_options()

    if order.service_type == "accommodation":
        room_type = order.room_type or "standard"
        valid_spots = assignment_options["roomSpots"].get(room_type, [])

        if assigned_spot and assigned_spot not in valid_spots:
            raise ValueError("此房位不屬於訂單房型")

        if assigned_spot:
            conflict = (
                Order.query
                .filter(
                    Order.id != order.id,
                    Order.service_type == "accommodation",
                    Order.assigned_spot == assigned_spot,
                    Order.status != "已取消",
                    Order.start_date < order.end_date,
                    Order.end_date > order.start_date,
                )
                .first()
            )

            if conflict:
                raise ValueError(
                    f"{assigned_spot} 在此住宿期間已安排給訂單 #{conflict.id}"
                )

        return assigned_spot, ""

    if order.service_type == "grooming":
        if assigned_spot and assigned_spot not in assignment_options["groomingStations"]:
            raise ValueError("美容台不存在")

        if scheduled_time and scheduled_time not in assignment_options["groomingTimes"]:
            raise ValueError("美容時段不存在")

        if bool(assigned_spot) != bool(scheduled_time):
            raise ValueError("美容服務需同時選擇美容台與時段")

        if assigned_spot and scheduled_time:
            conflict = (
                Order.query
                .filter(
                    Order.id != order.id,
                    Order.service_type == "grooming",
                    Order.assigned_spot == assigned_spot,
                    Order.scheduled_time == scheduled_time,
                    Order.start_date == order.start_date,
                    Order.status != "已取消",
                )
                .first()
            )

            if conflict:
                raise ValueError(
                    f"{assigned_spot} 的 {scheduled_time} 已安排給訂單 #{conflict.id}"
                )

        return assigned_spot, scheduled_time

    raise ValueError("服務類型不存在")


def calculate_total(data):
    service_type = data.get("serviceType")
    extras_total = add_on_total(data.get("addOnItems"))

    if service_type == "accommodation":
        service_catalog = get_service_catalog()
        room_prices = service_catalog["roomPrices"]
        room_type = data.get("roomType", "standard")
        start_date = data.get("startDate")
        end_date = data.get("endDate")

        if room_type not in room_prices:
            raise ValueError("房型不存在")

        if not start_date or not end_date:
            raise ValueError("請選擇入住與退房日期")

        start = datetime.fromisoformat(start_date)
        end = datetime.fromisoformat(end_date)

        if end <= start:
            raise ValueError("退房日期必須晚於入住日期")

        days = max(1, (end - start).days)

        return room_prices[room_type] * days + extras_total

    if service_type == "grooming":
        service_catalog = get_service_catalog()
        grooming_prices = service_catalog["groomingPrices"]
        grooming_service = data.get("groomingService", "basic")

        if grooming_service not in grooming_prices:
            raise ValueError("美容服務不存在")

        return grooming_prices[grooming_service] + extras_total

    raise ValueError("服務類型不存在")


def default_pet_image(species: str):
    if species == "貓":
        return "/images/pets/cat-1.jpg"

    if species == "狗":
        return "/images/pets/dog-1.jpg"

    return "/images/pets/pet-default.jpg"


# =========================
# Auth APIs
# =========================

@app.post("/api/auth/register")
def register():
    data = request.get_json() or {}

    email = data.get("email", "").strip().lower()
    password = data.get("password", "")
    name = data.get("name", "").strip()
    phone = data.get("phone", "").strip()

    if not email or not password or not name or not phone:
        return jsonify({"message": "請填寫所有欄位"}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({"message": "此電子郵件已被註冊"}), 409

    user = User(
        email=email,
        password_hash=generate_password_hash(password),
        name=name,
        phone=phone,
    )

    db.session.add(user)
    db.session.commit()

    token = create_token(user.id)

    return jsonify({
        "message": "註冊成功",
        "token": token,
        "user": user_to_dict(user),
    }), 201


@app.post("/api/auth/login")
def login():
    data = request.get_json() or {}

    email = data.get("email", "").strip().lower()
    password = data.get("password", "")

    user = User.query.filter_by(email=email).first()

    if not user or not check_password_hash(user.password_hash, password):
        return jsonify({"message": "帳號或密碼錯誤"}), 401

    token = create_token(user.id)

    return jsonify({
        "message": "登入成功",
        "token": token,
        "user": user_to_dict(user),
    })


@app.get("/api/auth/me")
@auth_required
def me():
    return jsonify({
        "user": user_to_dict(request.current_user)
    })


@app.put("/api/auth/me")
@auth_required
def update_me():
    data = request.get_json() or {}

    user = request.current_user

    name = data.get("name", "").strip()
    phone = data.get("phone", "").strip()

    if not name or not phone:
        return jsonify({"message": "姓名與手機號碼不可空白"}), 400

    user.name = name
    user.phone = phone

    db.session.commit()

    return jsonify({
        "message": "會員資料已更新",
        "user": user_to_dict(user),
    })


# =========================
# Pet APIs
# =========================

@app.get("/api/pets")
@auth_required
def get_pets():
    pets = (
        Pet.query
        .filter_by(user_id=request.current_user.id)
        .order_by(Pet.created_at.desc())
        .all()
    )

    return jsonify({
        "pets": [pet_to_dict(pet) for pet in pets]
    })


@app.post("/api/pets")
@auth_required
def create_pet():
    data = request.get_json() or {}

    required_fields = ["name", "species", "breed", "age", "weight", "gender"]

    for field in required_fields:
        if data.get(field) in [None, ""]:
            return jsonify({"message": f"缺少欄位：{field}"}), 400

    species = data.get("species", "狗")

    pet = Pet(
        user_id=request.current_user.id,
        name=data["name"],
        species=species,
        breed=data["breed"],
        age=int(data["age"]),
        weight=float(data["weight"]),
        gender=data["gender"],
        notes=data.get("notes", ""),
        image_url=data.get("imageUrl") or default_pet_image(species),
        allergies=data.get("allergies", ""),
        medical_notes=data.get("medicalNotes", ""),
        vaccine_date=data.get("vaccineDate", ""),
        vet_name=data.get("vetName", ""),
        vet_phone=data.get("vetPhone", ""),
        emergency_contact=data.get("emergencyContact", ""),
    )

    db.session.add(pet)
    db.session.commit()

    return jsonify({
        "message": "寵物已新增",
        "pet": pet_to_dict(pet)
    }), 201


@app.put("/api/pets/<int:pet_id>")
@auth_required
def update_pet(pet_id):
    pet = (
        Pet.query
        .filter_by(id=pet_id, user_id=request.current_user.id)
        .first()
    )

    if not pet:
        return jsonify({"message": "找不到寵物資料"}), 404

    data = request.get_json() or {}

    next_species = data.get("species", pet.species)

    pet.name = data.get("name", pet.name)
    pet.species = next_species
    pet.breed = data.get("breed", pet.breed)
    pet.age = int(data.get("age", pet.age))
    pet.weight = float(data.get("weight", pet.weight))
    pet.gender = data.get("gender", pet.gender)
    pet.notes = data.get("notes", pet.notes)
    pet.image_url = data.get("imageUrl") or pet.image_url or default_pet_image(next_species)
    pet.allergies = data.get("allergies", pet.allergies)
    pet.medical_notes = data.get("medicalNotes", pet.medical_notes)
    pet.vaccine_date = data.get("vaccineDate", pet.vaccine_date)
    pet.vet_name = data.get("vetName", pet.vet_name)
    pet.vet_phone = data.get("vetPhone", pet.vet_phone)
    pet.emergency_contact = data.get("emergencyContact", pet.emergency_contact)

    db.session.commit()

    return jsonify({
        "message": "寵物資料已更新",
        "pet": pet_to_dict(pet)
    })


@app.delete("/api/pets/<int:pet_id>")
@auth_required
def delete_pet(pet_id):
    pet = (
        Pet.query
        .filter_by(id=pet_id, user_id=request.current_user.id)
        .first()
    )

    if not pet:
        return jsonify({"message": "找不到寵物資料"}), 404

    db.session.delete(pet)
    db.session.commit()

    return jsonify({"message": "寵物已刪除"})


# =========================
# Order APIs
# =========================

@app.get("/api/orders")
@auth_required
def get_orders():
    auto_cancel_expired_orders()
    create_upcoming_booking_reminders(request.current_user)
    orders = (
        Order.query
        .filter_by(user_id=request.current_user.id)
        .order_by(Order.created_at.desc())
        .all()
    )

    return jsonify({
        "orders": [order_to_dict(order) for order in orders]
    })


@app.get("/api/orders/<int:order_id>")
@auth_required
def get_order(order_id):
    order = (
        Order.query
        .filter_by(id=order_id, user_id=request.current_user.id)
        .first()
    )

    if not order:
        return jsonify({"message": "找不到訂單"}), 404

    return jsonify({"order": order_to_dict(order)})


@app.post("/api/orders")
@auth_required
def create_order():
    data = request.get_json() or {}

    pet_id = data.get("petId")

    if not pet_id:
        return jsonify({"message": "請選擇寵物"}), 400

    pet = (
        Pet.query
        .filter_by(id=int(pet_id), user_id=request.current_user.id)
        .first()
    )

    if not pet:
        return jsonify({"message": "找不到寵物資料"}), 404

    try:
        total = calculate_total(data)
    except ValueError as exc:
        return jsonify({"message": str(exc)}), 400

    add_on_items = serialize_add_on_items(data.get("addOnItems"))
    add_on_items_total = sum(item["price"] for item in add_on_items)

    if data.get("serviceType") == "accommodation":
        room_type = data.get("roomType", "standard")
        start_date = data.get("startDate")
        end_date = data.get("endDate")

        is_available, full_date = check_room_available_for_range(
            room_type,
            start_date,
            end_date,
        )

        if not is_available:
            return jsonify({
                "message": f"{full_date} 此房型已額滿，請選擇其他日期或房型"
            }), 400
    elif data.get("serviceType") == "grooming":
        start_date = data.get("startDate")
        scheduled_time = str(data.get("scheduledTime", "")).strip()

        if not scheduled_time:
            return jsonify({"message": "請選擇美容預約時段"}), 400

        is_available, message = check_grooming_time_available(
            start_date,
            scheduled_time,
        )

        if not is_available:
            return jsonify({"message": message}), 400
    else:
        return jsonify({"message": "服務類型不存在"}), 400

    order = Order(
        user_id=request.current_user.id,
        pet_id=pet.id,
        service_type=data.get("serviceType"),
        room_type=data.get("roomType"),
        grooming_service=data.get("groomingService"),
        start_date=data.get("startDate"),
        end_date=data.get("endDate")
        if data.get("serviceType") == "accommodation"
        else None,
        scheduled_time=data.get("scheduledTime")
        if data.get("serviceType") == "grooming"
        else None,
        total=total,
        add_on_items=json.dumps(add_on_items, ensure_ascii=False),
        add_on_total=add_on_items_total,
        status="待確認",
        payment_status="未付款",
        payment_method="",
        paid_amount=0,
        notes=data.get("notes", ""),
    )

    db.session.add(order)
    db.session.commit()

    return jsonify({
        "message": "預約成功",
        "order": order_to_dict(order),
    }), 201


@app.patch("/api/orders/<int:order_id>/cancel")
@auth_required
def cancel_order(order_id):
    order = (
        Order.query
        .filter_by(id=order_id, user_id=request.current_user.id)
        .first()
    )

    if not order:
        return jsonify({"message": "找不到訂單"}), 404

    can_cancel, message = can_customer_cancel(order)

    if not can_cancel:
        return jsonify({"message": message}), 400

    data = request.get_json() or {}
    cancel_reason = str(data.get("cancelReason", "") or "").strip()
    order.status = "已取消"
    order.cancel_reason = cancel_reason
    order.assigned_spot = None
    order.assignment_note = (
        f"{order.assignment_note or ''}\n客戶取消預約，原安排位置已釋出。"
    ).strip()
    create_audit_log(
        "客戶取消預約",
        f"客戶自行取消預約"
        + (f"，原因：{cancel_reason}" if cancel_reason else ""),
        order,
    )
    db.session.commit()

    return jsonify({
        "message": "預約已取消",
        "order": order_to_dict(order)
    })


@app.patch("/api/orders/<int:order_id>/reconfirm")
@auth_required
def reconfirm_order(order_id):
    order = (
        Order.query
        .filter_by(id=order_id, user_id=request.current_user.id)
        .first()
    )

    if not order:
        return jsonify({"message": "找不到訂單"}), 404

    data = request.get_json() or {}
    confirmed = bool(data.get("confirmed"))

    if order.status not in ["待會員確認", "已確認"]:
        return jsonify({"message": "此訂單目前不需要再次確認"}), 400

    now = now_local()

    if confirmed:
        order.status = "已確認"
        db.session.add(AuditLog(
            order_id=order.id,
            actor_id=request.current_user.id,
            action="會員確認預約",
            detail="會員於預約前再次確認仍要前往，預約成立。",
        ))
        response_message = "已確認預約，店家會保留原本安排的位置。"
    else:
        order.status = "已取消"
        order.cancel_reason = "會員於預約前確認不前往"
        order.assigned_spot = None
        order.assignment_note = (
            f"{order.assignment_note or ''}\n會員取消預約，原安排位置已釋出。"
        ).strip()
        db.session.add(AuditLog(
            order_id=order.id,
            actor_id=request.current_user.id,
            action="會員取消預約確認",
            detail="會員於預約前確認不前往，系統取消訂單並釋出原本安排的位置。",
        ))
        response_message = "已取消預約，原本安排的位置已釋出。"

    notifications = (
        Notification.query
        .filter_by(
            user_id=request.current_user.id,
            order_id=order.id,
            type="booking_reconfirm",
        )
        .all()
    )

    for notification in notifications:
        notification.read_at = notification.read_at or now

    db.session.commit()

    return jsonify({
        "message": response_message,
        "order": order_to_dict(order),
    })


@app.patch("/api/orders/<int:order_id>/pay")
@auth_required
def pay_order(order_id):
    order = (
        Order.query
        .filter_by(id=order_id, user_id=request.current_user.id)
        .first()
    )

    if not order:
        return jsonify({"message": "找不到訂單"}), 404

    if order.status == "已取消":
        return jsonify({"message": "已取消的訂單不可付款"}), 400

    if order.status == "待會員確認":
        return jsonify({"message": "請先確認是否保留預約，再進行付款"}), 400

    data = request.get_json() or {}
    payment_method = str(data.get("paymentMethod", "線上付款") or "線上付款").strip()
    allowed_methods = ["現金", "轉帳", "信用卡", "線上付款", "現場付款", "其他"]

    if payment_method not in allowed_methods:
        return jsonify({"message": "付款方式不正確"}), 400

    order.payment_status = "已付款"
    order.payment_method = payment_method
    order.paid_amount = order.total
    order.receipt_no = generate_receipt_no(order)
    order.paid_at = now_local()
    create_customer_notification(
        order,
        "付款成功",
        f"{payment_method} NT$ {order.total}，收據編號 {order.receipt_no}",
        "payment",
    )
    create_audit_log(
        "客戶付款",
        f"{payment_method} NT$ {order.total} / 收據 {order.receipt_no}",
        order,
    )
    db.session.commit()

    return jsonify({
        "message": "付款成功",
        "order": order_to_dict(order)
    })


@app.patch("/api/orders/<int:order_id>/status")
@admin_required
def update_order_status(order_id):
    order = db.session.get(Order, order_id)

    if not order:
        return jsonify({"message": "找不到訂單"}), 404

    data = request.get_json() or {}
    next_status = data.get("status")

    allowed_status = ["待確認", "已確認", "待會員確認", "已入住", "進行中", "已完成", "已取消"]

    if next_status not in allowed_status:
        return jsonify({"message": "狀態不正確"}), 400

    previous_status = order.status
    order.status = next_status
    if previous_status != next_status:
        create_customer_notification(
            order,
            "預約狀態更新",
            f"訂單 #{order.id} 狀態已由「{previous_status}」更新為「{next_status}」。",
            "status",
        )
    create_audit_log(
        "更新狀態",
        f"狀態由「{previous_status}」改為「{next_status}」",
        order,
    )
    db.session.commit()

    return jsonify({
        "message": "訂單狀態已更新",
        "order": order_to_dict(order, include_internal_logs=True)
    })


@app.post("/api/orders/<int:order_id>/review")
@auth_required
def review_order(order_id):
    order = (
        Order.query
        .filter_by(id=order_id, user_id=request.current_user.id)
        .first()
    )

    if not order:
        return jsonify({"message": "找不到訂單"}), 404

    data = request.get_json() or {}

    rating = int(data.get("rating", 5))
    review = data.get("review", "")

    if rating < 1 or rating > 5:
        return jsonify({"message": "評分需為 1 到 5 分"}), 400

    order.rating = rating
    order.review = review

    db.session.commit()

    return jsonify({
        "message": "感謝您的評價",
        "order": order_to_dict(order)
    })


@app.get("/api/notifications")
@auth_required
def get_notifications():
    create_upcoming_booking_reminders(request.current_user)
    include_read = request.args.get("includeRead") in ["1", "true", "yes"]
    query = Notification.query.filter_by(user_id=request.current_user.id)

    if not include_read:
        query = query.filter_by(read_at=None)

    notifications = (
        query
        .order_by(Notification.created_at.desc())
        .limit(30)
        .all()
    )
    unread_count = (
        Notification.query
        .filter_by(user_id=request.current_user.id, read_at=None)
        .count()
    )

    return jsonify({
        "notifications": [
            notification_to_dict(notification)
            for notification in notifications
        ],
        "unreadCount": unread_count,
    })


@app.patch("/api/notifications/<int:notification_id>/read")
@auth_required
def mark_notification_read(notification_id):
    notification = (
        Notification.query
        .filter_by(id=notification_id, user_id=request.current_user.id)
        .first()
    )

    if not notification:
        return jsonify({"message": "找不到通知"}), 404

    if not notification.read_at:
        notification.read_at = now_local()
        db.session.commit()

    return jsonify({
        "message": "通知已讀",
        "notification": notification_to_dict(notification),
    })


@app.patch("/api/notifications/read-all")
@auth_required
def mark_all_notifications_read():
    notifications = (
        Notification.query
        .filter_by(user_id=request.current_user.id, read_at=None)
        .all()
    )
    now = now_local()

    for notification in notifications:
        notification.read_at = now

    db.session.commit()

    return jsonify({
        "message": "通知已全部標記已讀",
        "updated": len(notifications),
    })


def csv_download(filename: str, rows: list[dict]):
    output = io.StringIO()
    fieldnames = list(rows[0].keys()) if rows else ["message"]
    writer = csv.DictWriter(output, fieldnames=fieldnames)
    writer.writeheader()

    if rows:
        writer.writerows(rows)
    else:
        writer.writerow({"message": "沒有資料"})

    return Response(
        output.getvalue(),
        mimetype="text/csv; charset=utf-8",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


# =========================
# Admin APIs
# =========================

@app.get("/api/admin/stats")
@admin_required
def admin_stats():
    auto_cancel_expired_orders()
    today = now_local().date().isoformat()

    all_orders = Order.query.all()
    valid_orders = [order for order in all_orders if order.status != "已取消"]
    active_status = {"待確認", "已確認", "待會員確認", "已入住", "進行中"}

    revenue = sum(
        order.paid_amount or (
            order.total if order.payment_status == "已付款" else 0
        )
        for order in valid_orders
    )

    return jsonify({
        "stats": {
            "totalOrders": len(all_orders),
            "todayOrders": sum(
                1 for order in all_orders if order.start_date == today
            ),
            "pendingOrders": sum(
                1 for order in all_orders if order.status == "待確認"
            ),
            "activeOrders": sum(
                1 for order in all_orders if order.status in active_status
            ),
            "completedOrders": sum(
                1 for order in all_orders if order.status == "已完成"
            ),
            "revenue": revenue,
            "members": User.query.filter_by(role="member").count(),
            "pets": Pet.query.count(),
            "unassignedOrders": sum(
                1
                for order in all_orders
                if order.status != "已取消" and not order.assigned_spot
            ),
        },
        "rooms": get_room_availability_by_date(today),
        "date": today,
    })


@app.get("/api/admin/export/orders.csv")
@admin_required
def admin_export_orders_csv():
    orders = Order.query.order_by(Order.created_at.desc()).all()
    rows = [
        {
            "訂單編號": order.id,
            "會員": order.user.name if order.user else "",
            "Email": order.user.email if order.user else "",
            "電話": order.user.phone if order.user else "",
            "寵物": order.pet.name if order.pet else "",
            "服務類型": "住宿" if order.service_type == "accommodation" else "美容",
            "服務項目": (
                order.room_type if order.service_type == "accommodation"
                else order.grooming_service
            ),
            "日期": f"{order.start_date} - {order.end_date or order.start_date}",
            "位置": order.assigned_spot or "",
            "時段": order.scheduled_time or "",
            "狀態": order.status,
            "取消原因": order.cancel_reason or "",
            "付款狀態": order.payment_status,
            "付款方式": order.payment_method or "",
            "已收金額": order.paid_amount or 0,
            "收據編號": order.receipt_no or "",
            "付款時間": order.paid_at.isoformat() if order.paid_at else "",
            "總金額": order.total,
            "建立時間": order.created_at.isoformat(),
        }
        for order in orders
    ]

    return csv_download("pet-care-orders.csv", rows)


@app.get("/api/admin/export/members.csv")
@admin_required
def admin_export_members_csv():
    users = User.query.order_by(User.created_at.desc()).all()
    rows = [
        {
            "會員編號": user.id,
            "姓名": user.name,
            "Email": user.email,
            "電話": user.phone,
            "角色": role_label(user.role),
            "寵物數": len(user.pets),
            "訂單數": len(user.orders),
            "建立時間": user.created_at.isoformat(),
        }
        for user in users
    ]

    return csv_download("pet-care-members.csv", rows)


@app.get("/api/admin/export/revenue.csv")
@admin_required
def admin_export_revenue_csv():
    paid_orders = (
        Order.query
        .filter(Order.status != "已取消")
        .filter(Order.paid_amount > 0)
        .order_by(Order.created_at.desc())
        .all()
    )
    rows = [
        {
            "訂單編號": order.id,
            "付款狀態": order.payment_status,
            "付款方式": order.payment_method or "",
            "已收金額": order.paid_amount or 0,
            "收據編號": order.receipt_no or "",
            "總金額": order.total,
            "服務類型": "住宿" if order.service_type == "accommodation" else "美容",
            "會員": order.user.name if order.user else "",
            "付款日期": (order.paid_at or order.created_at).isoformat(),
        }
        for order in paid_orders
    ]

    return csv_download("pet-care-revenue.csv", rows)


@app.get("/api/admin/orders")
@admin_required
def admin_get_orders():
    auto_cancel_expired_orders()
    orders = (
        Order.query
        .order_by(Order.created_at.desc())
        .all()
    )

    return jsonify({
        "orders": [
            order_to_dict(order, include_internal_logs=True)
            for order in orders
        ]
    })


@app.get("/api/admin/members")
@admin_required
def admin_get_members():
    keyword = str(request.args.get("query", "") or "").strip().lower()
    members = (
        User.query
        .filter_by(role="member")
        .order_by(User.created_at.desc())
        .all()
    )

    if keyword:
        members = [
            member for member in members
            if keyword in " ".join([
                member.name,
                member.email,
                member.phone,
                " ".join(pet.name for pet in member.pets),
            ]).lower()
        ]

    return jsonify({
        "members": [member_to_dict(member) for member in members[:80]]
    })


@app.post("/api/admin/orders")
@admin_required
def admin_create_order():
    data = request.get_json() or {}
    member_data = data.get("member") or {}
    pet_data = data.get("pet") or {}
    user_id = data.get("userId")
    pet_id = data.get("petId")

    if user_id:
        user = db.session.get(User, int(user_id))
        if not user or user.role != "member":
            return jsonify({"message": "找不到會員資料"}), 404
    else:
        name = str(member_data.get("name", "") or "").strip()
        phone = str(member_data.get("phone", "") or "").strip()
        email = str(member_data.get("email", "") or "").strip().lower()

        if not name or not phone:
            return jsonify({"message": "請填寫會員姓名與電話"}), 400

        if not email:
            digits = "".join(ch for ch in phone if ch.isdigit()) or str(int(now_local().timestamp()))
            email = f"walkin-{digits}@petcare.local"

        user = User.query.filter_by(email=email).first()
        if user and user.role != "member":
            return jsonify({"message": "此 Email 已被員工帳號使用"}), 409

        if not user:
            user = User(
                email=email,
                password_hash=generate_password_hash("petcare123"),
                name=name,
                phone=phone,
                role="member",
            )
            db.session.add(user)
            db.session.flush()
            create_audit_log("櫃檯建立會員", f"建立現場會員 {name}")

    if pet_id:
        pet = Pet.query.filter_by(id=int(pet_id), user_id=user.id).first()
        if not pet:
            return jsonify({"message": "找不到寵物資料"}), 404
    else:
        pet_name = str(pet_data.get("name", "") or "").strip()
        species = str(pet_data.get("species", "") or "").strip()
        breed = str(pet_data.get("breed", "") or "").strip() or "未提供"
        gender = str(pet_data.get("gender", "") or "").strip() or "未提供"

        if not pet_name or not species:
            return jsonify({"message": "請填寫寵物姓名與種類"}), 400

        try:
            age = int(pet_data.get("age", 0) or 0)
            weight = float(pet_data.get("weight", 0) or 0)
        except (TypeError, ValueError):
            return jsonify({"message": "寵物年齡與體重格式不正確"}), 400

        pet = Pet(
            user_id=user.id,
            name=pet_name,
            species=species,
            breed=breed,
            age=max(0, age),
            weight=max(0, weight),
            gender=gender,
            notes=str(pet_data.get("notes", "") or "").strip(),
            image_url=pet_data.get("imageUrl") or default_pet_image(species),
            allergies=str(pet_data.get("allergies", "") or "").strip(),
            medical_notes=str(pet_data.get("medicalNotes", "") or "").strip(),
            vaccine_date=str(pet_data.get("vaccineDate", "") or "").strip(),
            vet_name=str(pet_data.get("vetName", "") or "").strip(),
            vet_phone=str(pet_data.get("vetPhone", "") or "").strip(),
            emergency_contact=str(pet_data.get("emergencyContact", "") or "").strip(),
        )
        db.session.add(pet)
        db.session.flush()
        create_audit_log("櫃檯建立寵物", f"替 {user.name} 建立寵物資料 {pet.name}")

    try:
        total = calculate_total(data)
    except ValueError as exc:
        return jsonify({"message": str(exc)}), 400

    service_type = data.get("serviceType")
    add_on_items = serialize_add_on_items(data.get("addOnItems"))
    add_on_items_total = sum(item["price"] for item in add_on_items)

    if service_type == "accommodation":
        is_available, full_date = check_room_available_for_range(
            data.get("roomType", "standard"),
            data.get("startDate"),
            data.get("endDate"),
        )
        if not is_available:
            return jsonify({"message": f"{full_date} 此房型已額滿"}), 400
    elif service_type == "grooming":
        is_available, message = check_grooming_time_available(
            data.get("startDate"),
            str(data.get("scheduledTime", "") or "").strip(),
        )
        if not is_available:
            return jsonify({"message": message}), 400
    else:
        return jsonify({"message": "服務類型不存在"}), 400

    order = Order(
        user_id=user.id,
        pet_id=pet.id,
        service_type=service_type,
        room_type=data.get("roomType"),
        grooming_service=data.get("groomingService"),
        start_date=data.get("startDate"),
        end_date=data.get("endDate") if service_type == "accommodation" else None,
        scheduled_time=data.get("scheduledTime") if service_type == "grooming" else None,
        total=total,
        add_on_items=json.dumps(add_on_items, ensure_ascii=False),
        add_on_total=add_on_items_total,
        status=data.get("status") if data.get("status") in ["待確認", "已確認"] else "已確認",
        payment_status="未付款",
        payment_method="",
        paid_amount=0,
        notes=str(data.get("notes", "") or "").strip(),
    )

    db.session.add(order)
    db.session.flush()

    assigned_spot = str(data.get("assignedSpot", "") or "").strip()
    if assigned_spot:
        try:
            assigned_spot, scheduled_time = validate_order_assignment(
                order,
                assigned_spot,
                data.get("scheduledTime", "") if service_type == "grooming" else "",
            )
        except ValueError as exc:
            db.session.rollback()
            return jsonify({"message": str(exc)}), 400

        order.assigned_spot = assigned_spot or None
        order.scheduled_time = scheduled_time or order.scheduled_time

    order.assignment_note = str(data.get("assignmentNote", "") or "").strip()
    create_audit_log("櫃檯建立預約", f"替 {user.name} 建立預約", order)
    db.session.commit()

    return jsonify({
        "message": "櫃檯預約已建立",
        "order": order_to_dict(order, include_internal_logs=True),
        "member": member_to_dict(user),
    }), 201


@app.get("/api/admin/system/users")
@system_admin_required
def admin_system_users():
    users = (
        User.query
        .filter(User.role.in_(SYSTEM_USER_ROLES))
        .order_by(User.created_at.desc())
        .all()
    )

    return jsonify({"users": [user_to_dict(user) for user in users]})


@app.post("/api/admin/system/users")
@system_admin_required
def admin_create_system_user():
    data = request.get_json() or {}
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")
    name = data.get("name", "").strip()
    phone = data.get("phone", "").strip()
    role = data.get("role", "staff")

    if role not in SYSTEM_USER_ROLES:
        return jsonify({"message": "角色不正確"}), 400

    if not email or not password or not name or not phone:
        return jsonify({"message": "請填寫帳號、密碼、姓名與電話"}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({"message": "此電子郵件已被使用"}), 409

    user = User(
        email=email,
        password_hash=generate_password_hash(password),
        name=name,
        phone=phone,
        role=role,
    )

    db.session.add(user)
    create_audit_log("新增員工帳號", f"新增 {name}（{role_label(role)}）")
    db.session.commit()

    return jsonify({
        "message": "員工帳號已新增",
        "user": user_to_dict(user),
    }), 201


@app.patch("/api/admin/system/users/<int:user_id>")
@system_admin_required
def admin_update_system_user(user_id):
    user = db.session.get(User, user_id)

    if not user or user.role not in SYSTEM_USER_ROLES:
        return jsonify({"message": "找不到員工帳號"}), 404

    data = request.get_json() or {}
    role = data.get("role", user.role)

    if role not in SYSTEM_USER_ROLES:
        return jsonify({"message": "角色不正確"}), 400

    user.name = data.get("name", user.name).strip() or user.name
    user.phone = data.get("phone", user.phone).strip() or user.phone
    user.role = role

    password = data.get("password", "")
    if password:
        user.password_hash = generate_password_hash(password)

    create_audit_log("更新員工帳號", f"更新 {user.name}（{role_label(user.role)}）")
    db.session.commit()

    return jsonify({
        "message": "員工帳號已更新",
        "user": user_to_dict(user),
    })


@app.delete("/api/admin/system/users/<int:user_id>")
@system_admin_required
def admin_delete_system_user(user_id):
    user = db.session.get(User, user_id)

    if not user or user.role not in SYSTEM_USER_ROLES:
        return jsonify({"message": "找不到員工帳號"}), 404

    if user.id == request.current_user.id:
        return jsonify({"message": "不可刪除目前登入的帳號"}), 400

    label = f"{user.name}（{user.email}）"
    db.session.delete(user)
    create_audit_log("刪除員工帳號", f"刪除 {label}")
    db.session.commit()

    return jsonify({"message": "員工帳號已刪除"})


@app.get("/api/admin/staff-shifts")
@admin_required
def admin_staff_shifts():
    today = now_local().date()
    start_date = request.args.get("startDate") or today.isoformat()
    end_date = request.args.get("endDate") or (today + timedelta(days=14)).isoformat()

    shifts = (
        StaffShift.query
        .filter(StaffShift.work_date >= start_date)
        .filter(StaffShift.work_date <= end_date)
        .order_by(StaffShift.work_date.asc(), StaffShift.shift_label.asc())
        .all()
    )

    staff_users = (
        User.query
        .filter(User.role.in_(SYSTEM_USER_ROLES))
        .order_by(User.role.asc(), User.name.asc())
        .all()
    )

    return jsonify({
        "shifts": [staff_shift_to_dict(shift) for shift in shifts],
        "users": [user_to_dict(user) for user in staff_users],
    })


@app.post("/api/admin/staff-shifts")
@system_admin_required
def admin_create_staff_shift():
    data = request.get_json() or {}

    try:
        user_id = int(data.get("userId"))
    except (TypeError, ValueError):
        return jsonify({"message": "請選擇員工"}), 400

    user = db.session.get(User, user_id)
    if not user or user.role not in SYSTEM_USER_ROLES:
        return jsonify({"message": "找不到員工帳號"}), 404

    work_date = str(data.get("workDate", "") or "").strip()
    shift_label = str(data.get("shiftLabel", "") or "").strip()
    note = str(data.get("note", "") or "").strip()

    if not work_date or not shift_label:
        return jsonify({"message": "請填寫排班日期與班別"}), 400

    try:
        datetime.fromisoformat(work_date)
    except ValueError:
        return jsonify({"message": "排班日期格式不正確"}), 400

    duplicate = (
        StaffShift.query
        .filter_by(user_id=user.id, work_date=work_date, shift_label=shift_label)
        .first()
    )
    if duplicate:
        return jsonify({"message": "此員工該班別已排班"}), 409

    shift = StaffShift(
        user_id=user.id,
        work_date=work_date,
        shift_label=shift_label,
        role=user.role,
        note=note,
    )
    db.session.add(shift)
    create_audit_log("新增員工排班", f"{work_date} {shift_label}：{user.name}")
    db.session.commit()

    return jsonify({
        "message": "排班已新增",
        "shift": staff_shift_to_dict(shift),
    }), 201


@app.delete("/api/admin/staff-shifts/<int:shift_id>")
@system_admin_required
def admin_delete_staff_shift(shift_id):
    shift = db.session.get(StaffShift, shift_id)

    if not shift:
        return jsonify({"message": "找不到排班"}), 404

    label = f"{shift.work_date} {shift.shift_label}：{shift.user.name if shift.user else ''}"
    db.session.delete(shift)
    create_audit_log("刪除員工排班", label)
    db.session.commit()

    return jsonify({"message": "排班已刪除"})


@app.get("/api/admin/system/service-catalog")
@admin_required
def admin_get_service_catalog():
    return jsonify(get_service_catalog())


@app.patch("/api/admin/system/service-catalog")
@system_admin_required
def admin_update_service_catalog():
    catalog = save_service_catalog(request.get_json() or {})
    create_audit_log("更新服務價格", "更新住宿房型與美容服務價格")
    db.session.commit()

    return jsonify({
        "message": "服務價格已更新",
        **catalog,
    })


@app.get("/api/admin/system/business-settings")
@admin_required
def admin_get_business_settings():
    return jsonify(get_business_settings())


@app.patch("/api/admin/system/business-settings")
@system_admin_required
def admin_update_business_settings():
    settings = save_business_settings(request.get_json() or {})
    create_audit_log("更新營業設定", "更新營業時間、班表與休假日")
    db.session.commit()

    return jsonify({
        "message": "營業設定已更新",
        **settings,
    })


@app.get("/api/admin/system/notification-settings")
@admin_required
def admin_get_notification_settings():
    return jsonify(get_notification_settings())


@app.patch("/api/admin/system/notification-settings")
@system_admin_required
def admin_update_notification_settings():
    try:
        settings = save_notification_settings(request.get_json() or {})
    except (TypeError, ValueError):
        return jsonify({"message": "通知設定格式不正確"}), 400

    create_audit_log("更新通知設定", "更新顧客與店務提醒規則")
    db.session.commit()

    return jsonify({
        "message": "通知設定已更新",
        **settings,
    })


@app.get("/api/admin/system/backup")
@system_admin_required
def admin_system_backup():
    return jsonify({
        "generatedAt": now_local().isoformat(),
        "users": [user_to_dict(user) for user in User.query.all()],
        "pets": [pet_to_dict(pet) for pet in Pet.query.all()],
        "orders": [
            order_to_dict(order, include_internal_logs=True)
            for order in Order.query.all()
        ],
        "staffShifts": [
            staff_shift_to_dict(shift)
            for shift in StaffShift.query.order_by(StaffShift.work_date.desc()).all()
        ],
        "staffAttendances": [
            staff_attendance_to_dict(attendance)
            for attendance in StaffAttendance.query.order_by(StaffAttendance.work_date.desc()).all()
        ],
        "settings": {
            "assignmentOptions": get_assignment_options(),
            "serviceCatalog": get_service_catalog(),
            "businessSettings": get_business_settings(),
            "notificationSettings": get_notification_settings(),
        },
    })


@app.get("/api/public/system-settings")
def public_system_settings():
    return jsonify({
        "serviceCatalog": get_service_catalog(),
        "businessSettings": get_business_settings(),
        "notificationSettings": get_notification_settings(),
    })


@app.get("/api/staff/attendance/today")
@staff_user_required
def staff_today_attendance():
    attendance = get_today_attendance(request.current_user)

    return jsonify({
        "date": now_local().date().isoformat(),
        "attendance": staff_attendance_to_dict(attendance),
    })


@app.post("/api/staff/attendance/clock-in")
@staff_user_required
def staff_clock_in():
    user = request.current_user
    attendance = get_today_attendance(user)

    if attendance and attendance.clock_in_at:
        return jsonify({
            "message": "今天已經上班打卡",
            "attendance": staff_attendance_to_dict(attendance),
        }), 400

    if not attendance:
        attendance = StaffAttendance(
            user_id=user.id,
            work_date=now_local().date().isoformat(),
            role=user.role,
        )
        db.session.add(attendance)

    data = request.get_json() or {}
    attendance.clock_in_at = now_local()
    attendance.note = str(data.get("note", attendance.note or "") or "").strip()
    create_audit_log(
        "員工上班打卡",
        f"{user.name}（{role_label(user.role)}）上班打卡",
    )
    db.session.commit()

    return jsonify({
        "message": "上班打卡成功",
        "attendance": staff_attendance_to_dict(attendance),
    })


@app.post("/api/staff/attendance/clock-out")
@staff_user_required
def staff_clock_out():
    user = request.current_user
    attendance = get_today_attendance(user)

    if not attendance or not attendance.clock_in_at:
        return jsonify({"message": "請先完成上班打卡"}), 400

    if attendance.clock_out_at:
        return jsonify({
            "message": "今天已經下班打卡",
            "attendance": staff_attendance_to_dict(attendance),
        }), 400

    data = request.get_json() or {}
    attendance.clock_out_at = now_local()
    attendance.note = str(data.get("note", attendance.note or "") or "").strip()
    create_audit_log(
        "員工下班打卡",
        f"{user.name}（{role_label(user.role)}）下班打卡",
    )
    db.session.commit()

    return jsonify({
        "message": "下班打卡成功",
        "attendance": staff_attendance_to_dict(attendance),
    })


@app.get("/api/admin/assignments/options")
@admin_required
def admin_assignment_options():
    return jsonify(get_assignment_options())


@app.patch("/api/admin/assignments/options")
@system_admin_required
def admin_update_assignment_options():
    options = save_assignment_options(request.get_json() or {})
    create_audit_log("更新營運設定", "更新房位、美容台與美容時段設定")
    db.session.commit()

    return jsonify({
        "message": "營運設定已更新",
        **options,
    })


@app.patch("/api/admin/orders/<int:order_id>/status")
@admin_required
def admin_update_order_status(order_id):
    order = db.session.get(Order, order_id)

    if not order:
        return jsonify({"message": "找不到訂單"}), 404

    data = request.get_json() or {}
    next_status = data.get("status")
    allowed_status = ["待確認", "已確認", "待會員確認", "已入住", "進行中", "已完成", "已取消"]

    if next_status not in allowed_status:
        return jsonify({"message": "狀態不正確"}), 400

    previous_status = order.status
    order.status = next_status
    if previous_status != next_status:
        create_customer_notification(
            order,
            "預約狀態更新",
            f"訂單 #{order.id} 狀態已由「{previous_status}」更新為「{next_status}」。",
            "status",
        )
    create_audit_log(
        "更新狀態",
        f"狀態由「{previous_status}」改為「{next_status}」",
        order,
    )
    db.session.commit()

    return jsonify({
        "message": "訂單狀態已更新",
        "order": order_to_dict(order, include_internal_logs=True)
    })


@app.patch("/api/admin/orders/<int:order_id>/assignment")
@admin_required
def admin_update_order_assignment(order_id):
    order = db.session.get(Order, order_id)

    if not order:
        return jsonify({"message": "找不到訂單"}), 404

    data = request.get_json() or {}

    try:
        assigned_spot, scheduled_time = validate_order_assignment(
            order,
            data.get("assignedSpot", ""),
            data.get("scheduledTime", ""),
        )
    except ValueError as exc:
        return jsonify({"message": str(exc)}), 400

    previous_assignment = (
        f"{order.assigned_spot or '未安排'}"
        + (f" / {order.scheduled_time}" if order.scheduled_time else "")
    )
    order.assigned_spot = assigned_spot or None
    order.scheduled_time = scheduled_time or None
    order.assignment_note = data.get("assignmentNote", "").strip()
    next_assignment = (
        f"{order.assigned_spot or '未安排'}"
        + (f" / {order.scheduled_time}" if order.scheduled_time else "")
    )
    create_audit_log(
        "更新安排",
        f"安排由「{previous_assignment}」改為「{next_assignment}」",
        order,
    )

    db.session.commit()

    return jsonify({
        "message": "安排已更新",
        "order": order_to_dict(order, include_internal_logs=True)
    })


@app.patch("/api/admin/orders/<int:order_id>/payment")
@admin_required
def admin_update_order_payment(order_id):
    order = db.session.get(Order, order_id)

    if not order:
        return jsonify({"message": "找不到訂單"}), 404

    data = request.get_json() or {}
    payment_status = data.get("paymentStatus", order.payment_status)
    payment_method = str(
        data.get("paymentMethod", order.payment_method or "") or ""
    ).strip()
    allowed_status = ["未付款", "已付訂金", "已付款"]
    allowed_methods = ["", "未設定", "現金", "轉帳", "信用卡", "線上付款", "現場付款", "其他"]

    if payment_status not in allowed_status:
        return jsonify({"message": "付款狀態不正確"}), 400

    if payment_method not in allowed_methods:
        return jsonify({"message": "付款方式不正確"}), 400

    raw_paid_amount = data.get("paidAmount")

    if raw_paid_amount in [None, ""]:
        paid_amount = order.total if payment_status == "已付款" else order.paid_amount or 0
    else:
        try:
            paid_amount = int(raw_paid_amount)
        except (TypeError, ValueError):
            return jsonify({"message": "已收金額需為數字"}), 400

    paid_amount = max(0, min(order.total, paid_amount))

    if payment_status == "未付款":
        paid_amount = 0
        payment_method = ""
    elif payment_status == "已付款":
        paid_amount = order.total
        if not payment_method or payment_method == "未設定":
            payment_method = "現金"
    elif payment_status == "已付訂金" and paid_amount <= 0:
        return jsonify({"message": "訂金金額需大於 0"}), 400

    previous_payment = (
        f"{order.payment_status} / {order.payment_method or '未設定'} / "
        f"NT$ {order.paid_amount or 0}"
    )
    order.payment_status = payment_status
    order.payment_method = "" if payment_method == "未設定" else payment_method
    order.paid_amount = paid_amount

    if paid_amount > 0:
        order.receipt_no = generate_receipt_no(order)
        order.paid_at = now_local()
    else:
        order.receipt_no = ""
        order.paid_at = None

    next_payment = (
        f"{order.payment_status} / {order.payment_method or '未設定'} / "
        f"NT$ {order.paid_amount or 0}"
    )
    create_audit_log(
        "更新付款",
        f"付款由「{previous_payment}」改為「{next_payment}」"
        + (f" / 收據 {order.receipt_no}" if order.receipt_no else ""),
        order,
    )

    if paid_amount > 0:
        create_customer_notification(
            order,
            "付款資料已更新",
            f"訂單 #{order.id} 已收 NT$ {paid_amount}，收據編號 {order.receipt_no}",
            "payment",
        )

    db.session.commit()

    return jsonify({
        "message": "付款資料已更新",
        "order": order_to_dict(order, include_internal_logs=True)
    })


@app.patch("/api/admin/orders/<int:order_id>/check-in")
@admin_required
def admin_check_in_order(order_id):
    order = db.session.get(Order, order_id)

    if not order:
        return jsonify({"message": "找不到訂單"}), 404

    if order.service_type != "accommodation":
        return jsonify({"message": "只有住宿訂單可以辦理入住"}), 400

    if not order.assigned_spot:
        return jsonify({"message": "請先安排房位再辦理入住"}), 400

    previous_status = order.status
    order.status = "已入住"
    create_customer_notification(
        order,
        "毛孩已入住",
        f"訂單 #{order.id} 已完成入住，房位 {order.assigned_spot}。",
        "status",
    )
    create_audit_log(
        "辦理入住",
        f"櫃檯辦理入住，狀態由「{previous_status}」改為「已入住」",
        order,
    )
    db.session.commit()

    return jsonify({
        "message": "入住已辦理",
        "order": order_to_dict(order, include_internal_logs=True)
    })


@app.patch("/api/admin/orders/<int:order_id>/check-out")
@admin_required
def admin_check_out_order(order_id):
    order = db.session.get(Order, order_id)

    if not order:
        return jsonify({"message": "找不到訂單"}), 404

    if order.service_type != "accommodation":
        return jsonify({"message": "只有住宿訂單可以辦理退房"}), 400

    if order.payment_status != "已付款":
        return jsonify({"message": "請先確認尾款已結清"}), 400

    previous_status = order.status
    order.status = "已完成"
    create_customer_notification(
        order,
        "訂單已完成",
        f"訂單 #{order.id} 已完成退房，感謝您的使用。",
        "status",
    )
    create_audit_log(
        "辦理退房",
        f"櫃檯辦理退房，狀態由「{previous_status}」改為「已完成」",
        order,
    )
    db.session.commit()

    return jsonify({
        "message": "退房已辦理",
        "order": order_to_dict(order, include_internal_logs=True)
    })


@app.post("/api/admin/orders/<int:order_id>/contact-logs")
@admin_required
def admin_create_contact_log(order_id):
    order = db.session.get(Order, order_id)

    if not order:
        return jsonify({"message": "找不到訂單"}), 404

    data = request.get_json() or {}
    channel = str(data.get("channel", "電話") or "電話").strip()
    result = str(data.get("result", "已聯絡") or "已聯絡").strip()
    note = str(data.get("note", "") or "").strip()

    if not note:
        return jsonify({"message": "請輸入聯絡內容"}), 400

    create_audit_log(
        "聯絡紀錄",
        f"{channel} / {result}：{note}",
        order,
    )
    db.session.commit()

    return jsonify({
        "message": "聯絡紀錄已新增",
        "order": order_to_dict(order, include_internal_logs=True)
    })


@app.post("/api/admin/orders/<int:order_id>/handover-notes")
@admin_required
def admin_create_handover_note(order_id):
    order = db.session.get(Order, order_id)

    if not order:
        return jsonify({"message": "找不到訂單"}), 404

    data = request.get_json() or {}
    note = str(data.get("note", "") or "").strip()

    if not note:
        return jsonify({"message": "請輸入交班備註"}), 400

    create_audit_log("交班備註", note, order)
    db.session.commit()

    return jsonify({
        "message": "交班備註已新增",
        "order": order_to_dict(order, include_internal_logs=True)
    })


@app.get("/api/admin/orders/<int:order_id>/audit-logs")
@admin_required
def admin_get_audit_logs(order_id):
    order = db.session.get(Order, order_id)

    if not order:
        return jsonify({"message": "找不到訂單"}), 404

    logs = (
        AuditLog.query
        .filter_by(order_id=order.id)
        .order_by(AuditLog.created_at.desc())
        .all()
    )

    return jsonify({
        "auditLogs": [audit_log_to_dict(log) for log in logs]
    })


@app.get("/api/admin/orders/<int:order_id>/care-logs")
@admin_required
def admin_get_care_logs(order_id):
    order = db.session.get(Order, order_id)

    if not order:
        return jsonify({"message": "找不到訂單"}), 404

    logs = (
        CareLog.query
        .filter_by(order_id=order.id)
        .order_by(CareLog.created_at.desc())
        .all()
    )

    return jsonify({
        "careLogs": [care_log_to_dict(log) for log in logs]
    })


@app.post("/api/admin/orders/<int:order_id>/care-logs")
@admin_required
def admin_create_care_log(order_id):
    order = db.session.get(Order, order_id)

    if not order:
        return jsonify({"message": "找不到訂單"}), 404

    data = request.get_json() or {}
    log_type = str(data.get("logType", "照護") or "照護").strip()
    message = str(data.get("message", "") or "").strip()
    photo_url = str(data.get("photoUrl", "") or "").strip()
    visible_to_customer = bool(data.get("visibleToCustomer", True))

    if not message:
        return jsonify({"message": "請輸入照護紀錄內容"}), 400

    care_log = CareLog(
        order_id=order.id,
        author_id=request.current_user.id,
        log_type=log_type or "照護",
        message=message,
        photo_url=photo_url,
        visible_to_customer=visible_to_customer,
    )

    db.session.add(care_log)
    if visible_to_customer:
        notify_customer_for_care_log(
            order,
            log_type or "照護",
            message,
        )
    create_audit_log(
        "新增照護紀錄",
        f"新增「{log_type or '照護'}」紀錄"
        + ("（顯示給客戶）" if visible_to_customer else "（內部）"),
        order,
    )
    db.session.commit()

    return jsonify({
        "message": "照護紀錄已新增",
        "careLog": care_log_to_dict(care_log),
        "order": order_to_dict(order, include_internal_logs=True)
    }), 201


@app.get("/api/worker/schedule")
@worker_required
def worker_schedule():
    auto_cancel_expired_orders()
    target_date = request.args.get("date") or now_local().date().isoformat()
    user = request.current_user

    orders = (
        Order.query
        .filter(Order.status != "已取消")
        .order_by(Order.start_date.asc(), Order.scheduled_time.asc(), Order.id.asc())
        .all()
    )

    visible_orders = [
        order_to_dict(order, include_internal_logs=True)
        for order in orders
        if worker_can_access_order(user, order)
        and order_matches_work_date(order, target_date)
    ]
    shifts = (
        StaffShift.query
        .filter_by(user_id=user.id, work_date=target_date)
        .order_by(StaffShift.shift_label.asc())
        .all()
    )

    return jsonify({
        "date": target_date,
        "role": user.role,
        "shifts": [staff_shift_to_dict(shift) for shift in shifts],
        "orders": visible_orders,
    })


@app.patch("/api/worker/orders/<int:order_id>/status")
@worker_required
def worker_update_order_status(order_id):
    order = db.session.get(Order, order_id)

    if not order:
        return jsonify({"message": "找不到訂單"}), 404

    if not worker_can_access_order(request.current_user, order):
        return jsonify({"message": "無法操作此訂單"}), 403

    data = request.get_json() or {}
    next_status = data.get("status")
    allowed_status = ["已確認", "待會員確認", "已入住", "進行中", "已完成"]

    if next_status not in allowed_status:
        return jsonify({"message": "狀態不正確"}), 400

    previous_status = order.status
    order.status = next_status
    if previous_status != next_status:
        create_customer_notification(
            order,
            "服務狀態更新",
            f"訂單 #{order.id} 服務狀態已由「{previous_status}」更新為「{next_status}」。",
            "status",
        )
    create_audit_log(
        "工作人員更新狀態",
        f"{role_label(request.current_user.role)}將狀態由「{previous_status}」改為「{next_status}」",
        order,
    )
    db.session.commit()

    return jsonify({
        "message": "訂單狀態已更新",
        "order": order_to_dict(order, include_internal_logs=True),
    })


@app.post("/api/worker/orders/<int:order_id>/care-logs")
@worker_required
def worker_create_care_log(order_id):
    order = db.session.get(Order, order_id)

    if not order:
        return jsonify({"message": "找不到訂單"}), 404

    if not worker_can_access_order(request.current_user, order):
        return jsonify({"message": "無法操作此訂單"}), 403

    data = request.get_json() or {}
    log_type = str(data.get("logType", "照護") or "照護").strip() or "照護"
    message = str(data.get("message", "") or "").strip()
    photo_url = str(data.get("photoUrl", "") or "").strip()
    is_abnormal = log_type == "異常"
    visible_to_customer = True if is_abnormal else bool(
        data.get("visibleToCustomer", True)
    )

    if not message:
        return jsonify({"message": "請輸入照護紀錄內容"}), 400

    care_log = CareLog(
        order_id=order.id,
        author_id=request.current_user.id,
        log_type=log_type,
        message=message,
        photo_url=photo_url,
        visible_to_customer=visible_to_customer,
    )

    db.session.add(care_log)
    if visible_to_customer:
        notify_customer_for_care_log(order, log_type, message)
    create_audit_log(
        "異常通知家長" if is_abnormal else "工作人員新增照護紀錄",
        f"{role_label(request.current_user.role)}新增「{log_type}」紀錄"
        + ("（顯示給客戶）" if visible_to_customer else "（內部）"),
        order,
    )
    db.session.commit()

    return jsonify({
        "message": "已通知家長" if is_abnormal else "照護紀錄已新增",
        "careLog": care_log_to_dict(care_log),
        "order": order_to_dict(order, include_internal_logs=True),
    }), 201


@app.get("/api/orders/<int:order_id>/care-logs")
@auth_required
def get_customer_care_logs(order_id):
    order = (
        Order.query
        .filter_by(id=order_id, user_id=request.current_user.id)
        .first()
    )

    if not order:
        return jsonify({"message": "找不到訂單"}), 404

    logs = (
        CareLog.query
        .filter_by(order_id=order.id, visible_to_customer=True)
        .order_by(CareLog.created_at.desc())
        .all()
    )

    return jsonify({
        "careLogs": [care_log_to_dict(log) for log in logs]
    })


# =========================
# Availability APIs
# =========================

@app.get("/api/availability/rooms")
def get_room_availability():
    target_date = request.args.get("date")

    if not target_date:
        target_date = now_local().date().isoformat()

    stats = get_room_availability_by_date(target_date)

    return jsonify({
        "date": target_date,
        "rooms": stats,
    })


@app.get("/api/availability/grooming")
def get_grooming_availability():
    target_date = request.args.get("date")

    if not target_date:
        target_date = now_local().date().isoformat()

    return jsonify({
        "date": target_date,
        "slots": get_grooming_availability_by_date(target_date),
    })


# =========================
# System
# =========================

@app.get("/api/health")
def health():
    return jsonify({
        "status": "ok",
        "message": "Pet Care API is running"
    })


def seed_demo_user():
    demo = User.query.filter_by(email="demo@test.com").first()

    if demo:
        return

    demo = User(
        email="demo@test.com",
        password_hash=generate_password_hash("demo123"),
        name="Demo 使用者",
        phone="0912-345-678",
    )

    db.session.add(demo)
    db.session.commit()

    pet = Pet(
        user_id=demo.id,
        name="小Q",
        species="狗",
        breed="柴犬",
        age=3,
        weight=9.5,
        gender="公",
        notes="比較怕打雷，住宿時需要安撫。",
        image_url="/images/pets/dog-1.jpg",
    )

    db.session.add(pet)
    db.session.commit()


def seed_admin_user():
    admin = User.query.filter_by(email="admin@test.com").first()

    if admin:
        admin.role = "admin"
        admin.name = "系統管理員"
        db.session.commit()
        return

    admin = User(
        email="admin@test.com",
        password_hash=generate_password_hash("admin123"),
        name="系統管理員",
        phone="0900-000-000",
        role="admin",
    )

    db.session.add(admin)
    db.session.commit()


def seed_staff_user():
    staff = User.query.filter_by(email="staff@test.com").first()

    if staff:
        staff.role = "staff"
        staff.name = "店務人員"
        db.session.commit()
        return

    staff = User(
        email="staff@test.com",
        password_hash=generate_password_hash("staff123"),
        name="店務人員",
        phone="0900-111-111",
        role="staff",
    )

    db.session.add(staff)
    db.session.commit()


def seed_worker_user(email: str, password: str, name: str, phone: str, role: str):
    worker = User.query.filter_by(email=email).first()

    if worker:
        worker.role = role
        worker.name = name
        db.session.commit()
        return

    worker = User(
        email=email,
        password_hash=generate_password_hash(password),
        name=name,
        phone=phone,
        role=role,
    )

    db.session.add(worker)
    db.session.commit()


def ensure_demo_member(email: str, name: str, phone: str, pet_data: dict):
    member = User.query.filter_by(email=email).first()

    if not member:
        member = User(
            email=email,
            password_hash=generate_password_hash("member123"),
            name=name,
            phone=phone,
            role="member",
        )
        db.session.add(member)
        db.session.flush()

    pet = next((item for item in member.pets if item.name == pet_data["name"]), None)
    if not pet:
        pet = Pet(
            user_id=member.id,
            name=pet_data["name"],
            species=pet_data["species"],
            breed=pet_data["breed"],
            age=pet_data["age"],
            weight=pet_data["weight"],
            gender=pet_data["gender"],
            notes=pet_data.get("notes", ""),
            image_url=pet_data.get("image_url", default_pet_image(pet_data["species"])),
        )
        db.session.add(pet)
        db.session.flush()

    return member, pet


def ensure_demo_order(member: User, pet: Pet, data: dict):
    existing = (
        Order.query
        .filter_by(user_id=member.id, pet_id=pet.id, start_date=data["start_date"])
        .filter_by(service_type=data["service_type"])
        .first()
    )

    if existing:
        return existing

    order = Order(
        user_id=member.id,
        pet_id=pet.id,
        service_type=data["service_type"],
        room_type=data.get("room_type"),
        grooming_service=data.get("grooming_service"),
        start_date=data["start_date"],
        end_date=data.get("end_date"),
        assigned_spot=data.get("assigned_spot"),
        scheduled_time=data.get("scheduled_time"),
        assignment_note=data.get("assignment_note", ""),
        total=data["total"],
        status=data.get("status", "已確認"),
        payment_status=data.get("payment_status", "未付款"),
        payment_method=data.get("payment_method", ""),
        paid_amount=data.get("paid_amount", 0),
        receipt_no=data.get("receipt_no", ""),
        paid_at=data.get("paid_at"),
        notes=data.get("notes", ""),
    )

    if order.paid_amount > 0:
        db.session.add(order)
        db.session.flush()
        order.receipt_no = order.receipt_no or generate_receipt_no(order)
        order.paid_at = order.paid_at or now_local()
    else:
        db.session.add(order)

    db.session.flush()
    return order


def seed_demo_dataset():
    today = now_local().date()
    members = [
        (
            "tiffany.member@test.com",
            "Tiffany",
            "0912-345-678",
            {
                "name": "Momo",
                "species": "狗",
                "breed": "貴賓",
                "age": 4,
                "weight": 5.2,
                "gender": "母",
                "notes": "腸胃較敏感，晚餐請少量多餐。",
            },
        ),
        (
            "lin.member@test.com",
            "林小姐",
            "0922-111-888",
            {
                "name": "布丁",
                "species": "貓",
                "breed": "英國短毛貓",
                "age": 2,
                "weight": 4.1,
                "gender": "公",
                "notes": "不喜歡陌生人抱，照護時慢慢接近。",
            },
        ),
        (
            "chen.member@test.com",
            "陳先生",
            "0933-222-777",
            {
                "name": "阿福",
                "species": "狗",
                "breed": "柴犬",
                "age": 5,
                "weight": 10.3,
                "gender": "公",
                "notes": "需要每日散步兩次。",
            },
        ),
    ]

    demo_members = [ensure_demo_member(*member) for member in members]
    db.session.commit()

    sample_orders = [
        (0, {
            "service_type": "accommodation",
            "room_type": "standard",
            "start_date": today.isoformat(),
            "end_date": (today + timedelta(days=2)).isoformat(),
            "assigned_spot": "S-01",
            "total": 1600,
            "status": "已確認",
            "payment_status": "已付訂金",
            "payment_method": "轉帳",
            "paid_amount": 800,
            "notes": "晚餐自備飼料，櫃檯已收。",
        }),
        (1, {
            "service_type": "grooming",
            "grooming_service": "styling",
            "start_date": today.isoformat(),
            "scheduled_time": "14:30",
            "assigned_spot": "G-01",
            "total": 1200,
            "status": "待確認",
            "payment_status": "未付款",
            "notes": "第一次到店，需先介紹流程。",
        }),
        (2, {
            "service_type": "accommodation",
            "room_type": "vip",
            "start_date": (today + timedelta(days=1)).isoformat(),
            "end_date": (today + timedelta(days=4)).isoformat(),
            "assigned_spot": "V-01",
            "total": 6000,
            "status": "已確認",
            "payment_status": "已付款",
            "payment_method": "信用卡",
            "paid_amount": 6000,
            "notes": "需要獨立活動時間。",
        }),
        (0, {
            "service_type": "grooming",
            "grooming_service": "spa",
            "start_date": (today + timedelta(days=3)).isoformat(),
            "scheduled_time": "10:30",
            "assigned_spot": "G-02",
            "total": 1800,
            "status": "已確認",
            "payment_status": "未付款",
            "notes": "SPA 後拍照回傳家長。",
        }),
    ]

    for member_index, order_data in sample_orders:
        member, pet = demo_members[member_index]
        ensure_demo_order(member, pet, order_data)

    staff_by_email = {
        user.email: user
        for user in User.query.filter(User.role.in_(SYSTEM_USER_ROLES)).all()
    }
    shift_rows = [
        ("staff@test.com", today.isoformat(), "早班 09:00-15:00", "今日入住與退房櫃檯"),
        ("groomer@test.com", today.isoformat(), "早班 09:00-15:00", "美容台 G-01、G-02"),
        ("caregiver@test.com", today.isoformat(), "晚班 15:00-21:00", "住宿巡房與晚餐照護"),
        ("staff@test.com", (today + timedelta(days=1)).isoformat(), "晚班 15:00-21:00", "電話確認隔日預約"),
    ]

    for email, work_date, shift_label, note in shift_rows:
        staff = staff_by_email.get(email)
        if not staff:
            continue

        exists = (
            StaffShift.query
            .filter_by(user_id=staff.id, work_date=work_date, shift_label=shift_label)
            .first()
        )
        if exists:
            continue

        db.session.add(StaffShift(
            user_id=staff.id,
            work_date=work_date,
            shift_label=shift_label,
            role=staff.role,
            note=note,
        ))

    db.session.commit()


def ensure_order_assignment_columns():
    existing_columns = {
        row[1]
        for row in db.session.execute(db.text('PRAGMA table_info("order")'))
    }

    migrations = {
        "assigned_spot": 'ALTER TABLE "order" ADD COLUMN assigned_spot VARCHAR(40)',
        "scheduled_time": 'ALTER TABLE "order" ADD COLUMN scheduled_time VARCHAR(20)',
        "assignment_note": 'ALTER TABLE "order" ADD COLUMN assignment_note TEXT DEFAULT ""',
        "cancel_reason": 'ALTER TABLE "order" ADD COLUMN cancel_reason VARCHAR(120) DEFAULT ""',
        "payment_method": 'ALTER TABLE "order" ADD COLUMN payment_method VARCHAR(30) DEFAULT ""',
        "paid_amount": 'ALTER TABLE "order" ADD COLUMN paid_amount INTEGER DEFAULT 0',
        "receipt_no": 'ALTER TABLE "order" ADD COLUMN receipt_no VARCHAR(40) DEFAULT ""',
        "paid_at": 'ALTER TABLE "order" ADD COLUMN paid_at DATETIME',
        "add_on_items": 'ALTER TABLE "order" ADD COLUMN add_on_items TEXT DEFAULT "[]"',
        "add_on_total": 'ALTER TABLE "order" ADD COLUMN add_on_total INTEGER DEFAULT 0',
    }

    for column, statement in migrations.items():
        if column not in existing_columns:
            db.session.execute(db.text(statement))

    db.session.execute(db.text(
        'UPDATE "order" '
        'SET paid_amount = total '
        'WHERE payment_status = "已付款" '
        'AND (paid_amount IS NULL OR paid_amount = 0)'
    ))

    db.session.execute(db.text(
        'UPDATE "order" '
        'SET payment_method = "線上付款" '
        'WHERE payment_status = "已付款" '
        'AND (payment_method IS NULL OR payment_method = "")'
    ))

    db.session.execute(db.text(
        'UPDATE "order" '
        'SET receipt_no = "RC-" || replace(start_date, "-", "") || "-" || printf("%04d", id) '
        'WHERE paid_amount > 0 '
        'AND (receipt_no IS NULL OR receipt_no = "")'
    ))

    db.session.commit()


def ensure_pet_health_columns():
    existing_columns = {
        row[1]
        for row in db.session.execute(db.text('PRAGMA table_info("pet")'))
    }

    migrations = {
        "allergies": 'ALTER TABLE "pet" ADD COLUMN allergies TEXT DEFAULT ""',
        "medical_notes": 'ALTER TABLE "pet" ADD COLUMN medical_notes TEXT DEFAULT ""',
        "vaccine_date": 'ALTER TABLE "pet" ADD COLUMN vaccine_date VARCHAR(20) DEFAULT ""',
        "vet_name": 'ALTER TABLE "pet" ADD COLUMN vet_name VARCHAR(120) DEFAULT ""',
        "vet_phone": 'ALTER TABLE "pet" ADD COLUMN vet_phone VARCHAR(30) DEFAULT ""',
        "emergency_contact": 'ALTER TABLE "pet" ADD COLUMN emergency_contact VARCHAR(120) DEFAULT ""',
    }

    for column, statement in migrations.items():
        if column not in existing_columns:
            db.session.execute(db.text(statement))

    db.session.commit()


def ensure_care_log_photo_column():
    existing_columns = {
        row[1]
        for row in db.session.execute(db.text('PRAGMA table_info("care_log")'))
    }

    if "photo_url" not in existing_columns:
        db.session.execute(
            db.text('ALTER TABLE "care_log" ADD COLUMN photo_url VARCHAR(255) DEFAULT ""')
        )
        db.session.commit()


with app.app_context():
    db.create_all()
    ensure_order_assignment_columns()
    ensure_pet_health_columns()
    ensure_care_log_photo_column()
    seed_demo_user()
    seed_staff_user()
    seed_worker_user(
        "groomer@test.com",
        "groomer123",
        "美容師",
        "0900-222-222",
        "groomer",
    )
    seed_worker_user(
        "caregiver@test.com",
        "care123",
        "寵物照護師",
        "0900-333-333",
        "caregiver",
    )
    seed_admin_user()
    seed_demo_dataset()


if __name__ == "__main__":
    port = int(os.environ.get("PORT", "5050"))
    app.run(debug=os.environ.get("FLASK_DEBUG") == "1", host="0.0.0.0", port=port)
