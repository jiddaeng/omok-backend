from flask import Blueprint, request, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
from flask_jwt_extended import create_access_token

from models import User
from extensions import db

auth_bp = Blueprint("auth", __name__)


@auth_bp.route("/register", methods=["POST"])
def register():
    data = request.get_json()

    username = data.get("username")
    password = data.get("password")

    if not username or not password:
        return jsonify({"message": "아이디와 비밀번호를 입력하세요."}), 400

    existing = User.query.filter_by(username=username).first()
    if existing:
        return jsonify({"message": "이미 존재하는 아이디입니다."}), 409

    # wins, losses는 기본값 0, id는 primary key
    user = User(
        username=username,
        password=generate_password_hash(password)
    )

    db.session.add(user)
    db.session.commit()

    return jsonify({"message": "회원가입 성공"}), 201


@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json()

    username = data.get("username")
    password = data.get("password")

    user = User.query.filter_by(username=username).first()

    if not user:
        return jsonify({"message": "아이디가 존재하지 않습니다."}), 401

    if not check_password_hash(user.password, password):
        return jsonify({"message": "비밀번호가 틀렸습니다."}), 401

    token = create_access_token(identity=str(user.id))
    
    return jsonify({
        "accessToken": token
    }), 200