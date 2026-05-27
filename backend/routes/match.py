from flask import Blueprint, request
from flask_socketio import emit
from extensions import socketio, db
from models import User
from routes.game import connected_users

import uuid

match_bp = Blueprint("match", __name__)

match_queue = []

rooms = {}


@socketio.on("request_match")
def handle_request_match():
    current_sid = request.sid

    userid = connected_users.get(current_sid)

    if not userid:
        emit("error", "인증 정보가 없습니다.")
        return

    try:
        userid = int(userid)

    except (ValueError, TypeError):
        emit("error", "유저 ID 형식이 올바르지 않습니다.")
        return

    if any(player["userid"] == userid for player in match_queue):
        emit("message", "이미 대기열에 있습니다.")
        return

    match_queue.append({
        "userid": userid,
        "sid": current_sid
    })

    print(
        f"[소켓 대기열 진입] "
        f"유저: {userid} | "
        f"소켓ID: {current_sid} | "
        f"현재 큐 인원: {len(match_queue)}명"
    )

    if len(match_queue) >= 2:

        player1 = match_queue.pop(0)
        player2 = match_queue.pop(0)

        p1_user = db.session.get(User, player1["userid"])
        p2_user = db.session.get(User, player2["userid"])

        if not p1_user or not p2_user:

            emit(
                "error",
                "유저 정보를 조회할 수 없습니다.",
                to=player1["sid"]
            )

            emit(
                "error",
                "유저 정보를 조회할 수 없습니다.",
                to=player2["sid"]
            )

            return

        roomid = str(uuid.uuid4())

        rooms[roomid] = {
            "player1name": p1_user.username,
            "player2name": p2_user.username,
            "player1id": int(p1_user.id),
            "player2id": int(p2_user.id),
        }

        match_data = {
            "roomid": roomid,

            "player1id": int(p1_user.id),
            "player2id": int(p2_user.id),

            "player1name": p1_user.username,
            "player2name": p2_user.username,
        }

        socketio.emit(
            "match_complete",
            match_data,
            to=player1["sid"]
        )

        socketio.emit(
            "match_complete",
            match_data,
            to=player2["sid"]
        )


@match_bp.route("/room/<room_id>", methods=["GET"], strict_slashes=False)
def get_room(room_id):

    room = rooms.get(room_id)

    if not room:
        return {
            "message": "방 없음"
        }, 404

    return room, 200