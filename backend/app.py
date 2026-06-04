from flask import Flask
from flask_cors import CORS
from extensions import db, jwt, socketio

from routes.auth import auth_bp
from routes.profile import profile_bp
from routes.match import match_bp
from routes.game import game_bp

def create_app():
    app = Flask(__name__)

    app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///users.db"
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    app.config["JWT_SECRET_KEY"] = "change later"

    db.init_app(app)
    jwt.init_app(app)
    socketio.init_app(app, cors_allowed_origins="*")

    app.register_blueprint(auth_bp)
    app.register_blueprint(profile_bp)
    app.register_blueprint(match_bp)
    app.register_blueprint(game_bp)
    CORS(app, resources={r"/*": {"origins": "*"}}, supports_credentials=True)

    with app.app_context():
        db.create_all()

    @app.route("/")
    def home(): 
        return {"status": "alive"}

    return app


if __name__ == "__main__":
    app = create_app()
    print(app.url_map)
    # socketio.run(app, debug=True, port=5000)
    socketio.run(app, host="0.0.0.0", port=5000)