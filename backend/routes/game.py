from flask_socketio import emit, join_room, leave_room
from flask_jwt_extended import decode_token
from flask import Blueprint, request
from extensions import socketio, db
from models import User

game_bp = Blueprint("game", __name__)

games = {}
connected_users = {}

BOARD_SIZE = 9


@socketio.on("connect")
def handle_connect(auth):
    if not auth:
        print("No auth")
        return False

    token = auth.get("token")

    try:
        decoded = decode_token(token)

        user_id = int(decoded["sub"])

        connected_users[request.sid] = user_id

        print(f"Connected: {user_id}")

    except Exception as e:
        print(f"Connect rejected: {e}")
        return False


@socketio.on("disconnect")
def handle_disconnect():
    connected_users.pop(request.sid, None)

    print(f"Disconnected: {request.sid}")


def create_room(room_id):
    games[room_id] = {
        "players": {
            "black": None,
            "white": None
        },

        "user_ids": {
            "black": None,
            "white": None
        },

        "board": [[None] * BOARD_SIZE for _ in range(BOARD_SIZE)],

        "turn": "black"
    }


def isFull(room_id):
    players = games[room_id]["players"]

    return (
        players["black"] is not None and
        players["white"] is not None
    )


def isPlayerAgain(room_id, sid):
    players = games[room_id]["players"]

    return sid in players.values()


@socketio.on("join")
def handle_join(data):
    room_id = data.get("roomid")

    if not room_id:
        emit("error", "Room_id Is Not Exist")
        return

    if room_id not in games:
        create_room(room_id)

    if isPlayerAgain(room_id, request.sid):
        emit("error", "Already Joined")
        return

    if isFull(room_id):
        emit("error", "Already Full")
        return

    players = games[room_id]["players"]
    user_ids = games[room_id]["user_ids"]

    user_id = connected_users.get(request.sid)

    if user_id is None:
        emit("error", "User Not Found")
        return

    if players["black"] is None:
        players["black"] = request.sid
        user_ids["black"] = user_id
        color = "black"

    else:
        players["white"] = request.sid
        user_ids["white"] = user_id
        color = "white"

    join_room(room_id)

    emit("joined", {
        "color": color
    })

    emit("message", f"{color} joined", room=room_id)


def isPosAgain(x, y, room_id):
    return games[room_id]["board"][y][x] is not None


def isYourTurn(color, room_id):
    return games[room_id]["turn"] == color


def isInBoard(x, y):
    return 0 <= x < BOARD_SIZE and 0 <= y < BOARD_SIZE


def check_winner(board, x, y, color):
    directions = [
        (1, 0),
        (0, 1),
        (1, 1),
        (1, -1)
    ]

    for dx, dy in directions:
        count = 1

        nx, ny = x + dx, y + dy

        while isInBoard(nx, ny) and board[ny][nx] == color:
            count += 1
            nx += dx
            ny += dy

        nx, ny = x - dx, y - dy

        while isInBoard(nx, ny) and board[ny][nx] == color:
            count += 1
            nx -= dx
            ny -= dy

        if count >= 5:
            return True

    return False


def addWin(user_id):
    user = db.session.get(User, user_id)

    if user:
        user.wins += 1
        db.session.commit()


def addLoss(user_id):
    user = db.session.get(User, user_id)

    if user:
        user.losses += 1
        db.session.commit()


@socketio.on("chaksoo")
def handle_chaksoo(data):
    room_id = data.get("roomid")

    if room_id not in games:
        return

    x = int(data.get("x"))
    y = int(data.get("y"))
    color = data.get("color")

    if not isInBoard(x, y):
        emit("error", "Is not In Board")
        return

    if not isYourTurn(color, room_id):
        emit("error", "Is Not Your Turn")
        return

    if isPosAgain(x, y, room_id):
        emit("error", "Pos Is Already Done")
        return

    board = games[room_id]["board"]

    board[y][x] = color

    emit(
        "chaksooed",
        {
            "x": x,
            "y": y,
            "color": color
        },
        room=room_id
    )

    if check_winner(board, x, y, color):

        user_ids = games[room_id]["user_ids"]

        winner_id = user_ids[color]

        loser_color = "white" if color == "black" else "black"
        loser_id = user_ids[loser_color]

        addWin(winner_id)
        addLoss(loser_id)

        emit(
            "game_over",
            {
                "winner": color
            },
            room=room_id
        )

        del games[room_id]

        return

    games[room_id]["turn"] = (
        "white" if color == "black" else "black"
    )


@socketio.on("resign")
def handle_resign(data):
    room_id = data.get("roomid")
    color = data.get("color")

    if room_id not in games:
        return

    loser_color = color
    winner_color = "white" if color == "black" else "black"

    user_ids = games[room_id]["user_ids"]

    loser_id = user_ids[loser_color]
    winner_id = user_ids[winner_color]

    addLoss(loser_id)
    addWin(winner_id)

    players = games[room_id]["players"]

    loser_sid = players[loser_color]
    winner_sid = players[winner_color]

    emit(
        "resigned",
        {
            "result": "lose"
        },
        to=loser_sid
    )

    emit(
        "resigned",
        {
            "result": "win"
        },
        to=winner_sid
    )

    del games[room_id]

    print(f"Room {room_id} deleted")