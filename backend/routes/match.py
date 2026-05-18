from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
import uuid

match_bp = Blueprint("match", __name__)

match_queue = []
rooms = {}

@match_bp.route("/match", methods=["POST"])
@jwt_required()
def match() :
    userid = get_jwt_identity()

    if userid in match_queue:
        return jsonify({"message": "이미 대기 중"}), 200
    
    match_queue.append(userid)

    if len(match_queue) >= 2 :
        player1 = match_queue.pop(0)
        player2 = match_queue.pop(0)

        roomid = str(uuid.uuid4())

        rooms[roomid] = {
            "player1": player1,
            "player2": player2,
        }

        return jsonify({
            "message": "매칭 완료",
            "roomid": roomid,
            "opponent": player2 if userid == player1 else player1
        }), 200
    
    return jsonify({
        "message": "대기 중",
        "queue_len": len(match_queue)
    }), 202

@match_bp.route("/room/<room_id>", methods=["GET"])
@jwt_required()
def get_room(room_id):
    room = rooms.get(room_id)

    if not room:
        return jsonify({"message": "방 없음"}), 404

    return jsonify(room), 200