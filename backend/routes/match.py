from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
import uuid
from models import User

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
        player1id = match_queue.pop(0)
        player2id = match_queue.pop(0)
        player1 = User.query.get(player1id)
        player2 = User.query.get(player2id)

        roomid = str(uuid.uuid4())

        rooms[roomid] = {
            "player1name": player1.username,
            "player2name": player2.username,
            "player1id": player1.id, # player1id도 괜찮
            "player2id": player2.id,
        }
        print(rooms[roomid])
        return jsonify({
            "message": "매칭 완료",
            "roomid": roomid,
            "opponent": player2.id if userid == player1.id else player1.id
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