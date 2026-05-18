from extensions import db

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)

    username = db.Column(db.String(80), unique=True, nullable=False)
    password = db.Column(db.String(300), nullable=False)

    wins = db.Column(db.Integer, default=0)
    losses = db.Column(db.Integer, default=0)