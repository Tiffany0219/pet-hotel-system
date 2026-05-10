import json
import os
from datetime import datetime, timedelta, timezone
from functools import wraps

import jwt
from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash


app = Flask(__name__)

CORS(
    app,
    resources={
        r"/api/*": {
            "origins": [
                "http://localhost:5173",
                "http://127.0.0.1:5173",
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
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

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

    created_at = db.Column(db.DateTime, default=datetime.utcnow)

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

    total = db.Column(db.Integer, nullable=False)

    status = db.Column(db.String(20), default="待確認")
    payment_status = db.Column(db.String(20), default="未付款")
    payment_method = db.Column(db.String(30), default="")
    paid_amount = db.Column(db.Integer, default=0)

    notes = db.Column(db.Text, default="")
    rating = db.Column(db.Integer, nullable=True)
    review = db.Column(db.Text, nullable=True)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)

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
    visible_to_customer = db.Column(db.Boolean, default=True)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    author = db.relationship("User", lazy=True)


class AuditLog(db.Model):
    id = db.Column(db.Integer, primary_key=True)

    order_id = db.Column(db.Integer, db.ForeignKey("order.id"), nullable=True)
    actor_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=True)

    action = db.Column(db.String(60), nullable=False)
    detail = db.Column(db.Text, default="")

    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    actor = db.relationship("User", lazy=True)


class AppSetting(db.Model):
    key = db.Column(db.String(80), primary_key=True)
    value = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(
        db.DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )


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

DEFAULT_ASSIGNMENT_OPTIONS = {
    "roomSpots": ROOM_SPOTS,
    "groomingStations": GROOMING_STATIONS,
    "groomingTimes": GROOMING_TIMES,
}


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
        "createdAt": pet.created_at.isoformat(),
    }


def care_log_to_dict(log: CareLog):
    return {
        "id": str(log.id),
        "orderId": str(log.order_id),
        "authorName": log.author.name if log.author else "系統",
        "logType": log.log_type,
        "message": log.message,
        "visibleToCustomer": log.visible_to_customer,
        "createdAt": log.created_at.isoformat(),
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
        "total": order.total,
        "status": order.status,
        "paymentStatus": order.payment_status,
        "paymentMethod": order.payment_method or "",
        "paidAmount": paid_amount,
        "balanceDue": balance_due,
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
        if request.current_user.role != "admin":
            return jsonify({"message": "需要管理員權限"}), 403

        return fn(*args, **kwargs)

    return wrapper


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

    if service_type == "accommodation":
        room_type = data.get("roomType", "standard")
        start_date = data.get("startDate")
        end_date = data.get("endDate")

        if room_type not in ROOM_PRICES:
            raise ValueError("房型不存在")

        if not start_date or not end_date:
            raise ValueError("請選擇入住與退房日期")

        start = datetime.fromisoformat(start_date)
        end = datetime.fromisoformat(end_date)

        if end <= start:
            raise ValueError("退房日期必須晚於入住日期")

        days = max(1, (end - start).days)

        return ROOM_PRICES[room_type] * days

    if service_type == "grooming":
        grooming_service = data.get("groomingService", "basic")

        if grooming_service not in GROOMING_PRICES:
            raise ValueError("美容服務不存在")

        return GROOMING_PRICES[grooming_service]

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
    orders = (
        Order.query
        .filter_by(user_id=request.current_user.id)
        .order_by(Order.created_at.desc())
        .all()
    )

    return jsonify({
        "orders": [order_to_dict(order) for order in orders]
    })


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
        total=total,
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

    if order.status not in ["待確認", "已確認"]:
        return jsonify({"message": "此訂單目前不可取消"}), 400

    order.status = "已取消"
    create_audit_log("客戶取消預約", "客戶自行取消預約", order)
    db.session.commit()

    return jsonify({
        "message": "預約已取消",
        "order": order_to_dict(order)
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

    order.payment_status = "已付款"
    order.payment_method = "線上付款"
    order.paid_amount = order.total
    create_audit_log("客戶付款", f"線上付款 NT$ {order.total}", order)
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

    allowed_status = ["待確認", "已確認", "進行中", "已完成", "已取消"]

    if next_status not in allowed_status:
        return jsonify({"message": "狀態不正確"}), 400

    previous_status = order.status
    order.status = next_status
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


# =========================
# Admin APIs
# =========================

@app.get("/api/admin/stats")
@admin_required
def admin_stats():
    today = datetime.now().strftime("%Y-%m-%d")

    all_orders = Order.query.all()
    valid_orders = [order for order in all_orders if order.status != "已取消"]
    active_status = {"待確認", "已確認", "進行中"}

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


@app.get("/api/admin/orders")
@admin_required
def admin_get_orders():
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


@app.get("/api/admin/assignments/options")
@admin_required
def admin_assignment_options():
    return jsonify(get_assignment_options())


@app.patch("/api/admin/assignments/options")
@admin_required
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
    allowed_status = ["待確認", "已確認", "進行中", "已完成", "已取消"]

    if next_status not in allowed_status:
        return jsonify({"message": "狀態不正確"}), 400

    previous_status = order.status
    order.status = next_status
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
    allowed_methods = ["", "未設定", "現金", "轉帳", "信用卡", "線上付款", "其他"]

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
    next_payment = (
        f"{order.payment_status} / {order.payment_method or '未設定'} / "
        f"NT$ {order.paid_amount or 0}"
    )
    create_audit_log(
        "更新付款",
        f"付款由「{previous_payment}」改為「{next_payment}」",
        order,
    )
    db.session.commit()

    return jsonify({
        "message": "付款資料已更新",
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
    log_type = data.get("logType", "照護").strip()
    message = data.get("message", "").strip()
    visible_to_customer = bool(data.get("visibleToCustomer", True))

    if not message:
        return jsonify({"message": "請輸入照護紀錄內容"}), 400

    care_log = CareLog(
        order_id=order.id,
        author_id=request.current_user.id,
        log_type=log_type or "照護",
        message=message,
        visible_to_customer=visible_to_customer,
    )

    db.session.add(care_log)
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
        target_date = datetime.now().strftime("%Y-%m-%d")

    stats = get_room_availability_by_date(target_date)

    return jsonify({
        "date": target_date,
        "rooms": stats,
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


def ensure_order_assignment_columns():
    existing_columns = {
        row[1]
        for row in db.session.execute(db.text('PRAGMA table_info("order")'))
    }

    migrations = {
        "assigned_spot": 'ALTER TABLE "order" ADD COLUMN assigned_spot VARCHAR(40)',
        "scheduled_time": 'ALTER TABLE "order" ADD COLUMN scheduled_time VARCHAR(20)',
        "assignment_note": 'ALTER TABLE "order" ADD COLUMN assignment_note TEXT DEFAULT ""',
        "payment_method": 'ALTER TABLE "order" ADD COLUMN payment_method VARCHAR(30) DEFAULT ""',
        "paid_amount": 'ALTER TABLE "order" ADD COLUMN paid_amount INTEGER DEFAULT 0',
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

    db.session.commit()


with app.app_context():
    db.create_all()
    ensure_order_assignment_columns()
    seed_demo_user()
    seed_admin_user()


if __name__ == "__main__":
    app.run(debug=True, port=5050)
