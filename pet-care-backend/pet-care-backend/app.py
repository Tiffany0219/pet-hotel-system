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
app.config["SECRET_KEY"] = "change-this-secret-key-for-production"

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

    total = db.Column(db.Integer, nullable=False)

    status = db.Column(db.String(20), default="待確認")
    payment_status = db.Column(db.String(20), default="未付款")

    notes = db.Column(db.Text, default="")
    rating = db.Column(db.Integer, nullable=True)
    review = db.Column(db.Text, nullable=True)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)


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

GROOMING_PRICES = {
    "basic": 600,
    "styling": 1200,
    "spa": 1800,
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


def order_to_dict(order: Order):
    return {
        "id": str(order.id),
        "userId": str(order.user_id),
        "petId": str(order.pet_id),
        "petName": order.pet.name if order.pet else "",
        "petImageUrl": order.pet.image_url if order.pet else "",
        "serviceType": order.service_type,
        "roomType": order.room_type,
        "groomingService": order.grooming_service,
        "startDate": order.start_date,
        "endDate": order.end_date,
        "total": order.total,
        "status": order.status,
        "paymentStatus": order.payment_status,
        "notes": order.notes or "",
        "rating": order.rating,
        "review": order.review,
        "createdAt": order.created_at.isoformat(),
    }


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


def get_room_availability_by_date(target_date: str):
    stats = {}

    for room_type, capacity in ROOM_CAPACITY.items():
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
    db.session.commit()

    return jsonify({
        "message": "付款成功",
        "order": order_to_dict(order)
    })


@app.patch("/api/orders/<int:order_id>/status")
@auth_required
def update_order_status(order_id):
    order = (
        Order.query
        .filter_by(id=order_id, user_id=request.current_user.id)
        .first()
    )

    if not order:
        return jsonify({"message": "找不到訂單"}), 404

    data = request.get_json() or {}
    next_status = data.get("status")

    allowed_status = ["待確認", "已確認", "進行中", "已完成", "已取消"]

    if next_status not in allowed_status:
        return jsonify({"message": "狀態不正確"}), 400

    order.status = next_status
    db.session.commit()

    return jsonify({
        "message": "訂單狀態已更新",
        "order": order_to_dict(order)
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


with app.app_context():
    db.create_all()
    seed_demo_user()


if __name__ == "__main__":
    app.run(debug=True, port=5000)