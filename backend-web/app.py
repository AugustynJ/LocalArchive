import enum
import io
import logging
import secrets
import re
import uuid
from functools import wraps

from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import (
    JWTManager, create_access_token, create_refresh_token,
    set_access_cookies, set_refresh_cookies, unset_jwt_cookies,
    jwt_required, get_jwt_identity, get_jti, get_jwt
)
import redis
from argon2 import PasswordHasher
from argon2.exceptions import VerificationError, InvalidHashError
from PIL import Image, UnidentifiedImageError

from datetime import timedelta, datetime, timezone
from dotenv import load_dotenv
import os

from email_utils import send_password_reset_email

load_dotenv()

logging.basicConfig(level=os.getenv("LOG_LEVEL", "INFO").upper(),
                    format="%(asctime)s %(levelname)s %(name)s: %(message)s")
log = logging.getLogger("localarchive")

app = Flask(__name__)

ACCESS_LIFETIME = timedelta(minutes=15)
REFRESH_LIFETIME = timedelta(minutes=60)

UPLOAD_FOLDER = os.getenv("UPLOAD_FOLDER")
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}
YEAR_MIN, YEAR_MAX = 1, 2026  # allowed photo_year range (also enforced by a CHECK in db/schema.sql)
IMAGE_FORMATS = {'png': 'PNG', 'jpg': 'JPEG', 'jpeg': 'JPEG', 'gif': 'GIF'}  # extension -> Pillow format

# Configure app settings BEFORE initializing extensions
app.config["JWT_ACCESS_TOKEN_EXPIRES"] = ACCESS_LIFETIME
app.config["JWT_REFRESH_TOKEN_EXPIRES"] = REFRESH_LIFETIME
app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET_KEY")
app.config["JWT_TOKEN_LOCATION"] = ["cookies"]
app.config["JWT_ACCESS_COOKIE_PATH"] = "/"      
app.config["JWT_REFRESH_COOKIE_PATH"] = "/api/v1/token/refresh"  
app.config["JWT_COOKIE_SECURE"] = os.getenv("JWT_COOKIE_SECURE", "false").lower() == "true"  # true behind HTTPS
app.config["JWT_COOKIE_HTTPONLY"] = True       
app.config["JWT_COOKIE_SAMESITE"] = "Lax"      
app.config["JWT_COOKIE_CSRF_PROTECT"] = False
  
app.config["JWT_CSRF_CHECK_FORM"] = False    
app.config["JWT_CSRF_METHODS"] = ["POST", "PUT", "PATCH", "DELETE"]

app.config['CORS_HEADERS'] = 'Content-Type'

app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DB_URL')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['MAX_CONTENT_LENGTH'] = 1 * 1024 * 1024  # 1 MB hard limit

db = SQLAlchemy(app)
jwt = JWTManager(app)
# In the cloud the frontend and API share one origin (nginx), so CORS is only needed
# for local development; set CORS_ORIGINS to a comma-separated list to enable it.
if os.getenv("CORS_ORIGINS"):
    CORS(app, supports_credentials=True, origins=os.getenv("CORS_ORIGINS").split(","))

# Behind nginx Basic Auth, browsers (Chrome) treat ANY 401 on a request that carried Basic
# credentials as a rejection: they drop the cached credentials and prompt for them again.
# Application-level authentication failures (no/expired session, wrong app password) therefore
# use 419; 401 stays reserved for the Basic Auth layer in nginx.
APP_AUTH_STATUS = 419

@app.after_request
def keep_basic_auth_credentials(response):
    if response.status_code == 401:
        response.status = f"{APP_AUTH_STATUS} AUTHENTICATION REQUIRED"
    return response

# JWT Error Handlers
@jwt.expired_token_loader
def expired_token_callback(jwt_header, jwt_payload):
    return jsonify({"message": "Token has expired"}), 401

@jwt.invalid_token_loader
def invalid_token_callback(error):
    return jsonify({"message": "Invalid token"}), 401

@jwt.unauthorized_loader
def missing_token_callback(error):
    return jsonify({"message": "Missing token"}), 401

@jwt.token_in_blocklist_loader
def check_if_token_revoked(jwt_header, jwt_payload):
    try:
        jti = jwt_payload['jti']
        token_data = jwt_redis_whitelist.get(jti)
        # Return True if token is revoked (NOT in whitelist)
        return token_data is None
    except Exception as e:
        # Fail closed: without Redis revoked tokens can't be told apart from valid ones,
        # so every token is treated as revoked until Redis is reachable again.
        log.error("Error checking token blocklist: %s", e)
        return True

@jwt.revoked_token_loader
def revoked_token_callback(jwt_header, jwt_payload):
    return jsonify({"message": "Token has been revoked"}), 401

# @jwt.csrf_error_loader
# def csrf_error_callback(error):
#     return jsonify({"message": "CSRF token missing or invalid"}), 422

jwt_redis_whitelist = redis.StrictRedis(
    host=os.getenv("REDIS_HOST"),
    port=int(os.getenv("REDIS_PORT")),
    db=int(os.getenv("REDIS_DB")),
    password=os.getenv("REDIS_PASSWORD") or None,
    ssl=os.getenv("REDIS_SSL", "false").lower() == "true",
    ssl_ca_certs=os.getenv("REDIS_CA_CERT") or None,
    decode_responses=True
)

VALID_ROLES = ('admin', 'editor', 'viewer')

def validate_role(role):
    """Validate that role is one of the allowed values"""
    return role in VALID_ROLES

def require_role(required_role):
    """Decorator to check if user has required role (always reads from DB)"""
    def decorator(f):
        @wraps(f)
        def wrapper(*args, **kwargs):
            current_user_id = get_jwt_identity()
            user = db.session.get(User, int(current_user_id))
            if not user:
                return jsonify({"error": "User not found"}), 404
            if user.is_blocked:
                return jsonify({"error": "User is blocked"}), 403

            role_hierarchy = {'admin': 3, 'editor': 2, 'viewer': 1}
            if role_hierarchy.get(user.role, 0) < role_hierarchy.get(required_role, 0):
                return jsonify({"error": "Insufficient permissions"}), 403

            return f(*args, **kwargs)
        return wrapper
    return decorator

class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    first_name = db.Column(db.String(50), nullable=False)
    last_name = db.Column(db.String(50), nullable=False)
    email = db.Column(db.String(50), unique=True, nullable=False)
    is_blocked = db.Column(db.Boolean, default=False, server_default='false', nullable=False)
    role = db.Column(db.String(20), default='viewer', nullable=False)
    password = db.Column(db.String(255), nullable=False)
    last_login_date = db.Column(db.DateTime(timezone=True), nullable=True)
    last_last_login = db.Column(db.DateTime(timezone=True), nullable=True)

    def set_password(self, password):
        self.password = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password, password)
        
    def set_role(self, role):
        """Set user role with validation"""
        if validate_role(role):
            self.role = role
        else:
            raise ValueError(f"Invalid role: {role}. Must be one of {VALID_ROLES}")

class Photo(db.Model):
    __tablename__ = 'photos'
    
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(255), nullable=False)
    filename = db.Column(db.String(500), nullable=False)
    location = db.Column(db.String(255))
    photo_year = db.Column(db.Integer)
    owner_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    is_blocked = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime(timezone=True), server_default=db.func.now())

    # Relacja, by łatwo wyciągnąć dane właściciela: photo.owner.email
    owner = db.relationship('User', backref=db.backref('photos', lazy=True))

# Argon2id, RFC 9106 "second recommended option": 64 MiB memory, 3 passes, 4 lanes.
# A random 16-byte salt is generated per hash and stored in the PHC string
# ($argon2id$v=19$m=65536,t=3,p=4$<salt>$<hash>), ~97 chars.
password_hasher = PasswordHasher(time_cost=3, memory_cost=65536, parallelism=4, hash_len=32, salt_len=16)

# Verified against unknown emails so login timing doesn't reveal which accounts exist.
DUMMY_PASSWORD_HASH = password_hasher.hash(secrets.token_urlsafe(16))

def generate_password_hash(password):
    return password_hasher.hash(password)

def check_password_hash(stored_hash, password):
    try:
        return password_hasher.verify(stored_hash, password)
    except (VerificationError, InvalidHashError):
        return False

def json_body():
    """Request JSON as a dict, or None when the body is missing or not a JSON object."""
    data = request.get_json(silent=True)
    return data if isinstance(data, dict) else None

def str_field(data, key, strip=True):
    """String value of data[key]; null, numbers and other non-strings count as empty."""
    value = data.get(key)
    if not isinstance(value, str):
        return ''
    return value.strip() if strip else value

def is_valid_image(file_data, ext):
    """Check that the bytes really are an image in the format implied by the extension."""
    try:
        with Image.open(io.BytesIO(file_data)) as img:
            img.verify()
            return img.format == IMAGE_FORMATS[ext]
    except (UnidentifiedImageError, Image.DecompressionBombError, OSError, SyntaxError, ValueError):
        return False

def issue_tokens(user, response):
    """Create access + refresh tokens, whitelist them in Redis and set them as cookies.
    Returns False when Redis is unavailable (the tokens would be rejected anyway)."""
    additional_claims = {"role": user.role}
    access_token = create_access_token(
        identity=str(user.id),
        expires_delta=ACCESS_LIFETIME,
        additional_claims=additional_claims
    )
    refresh_token = create_refresh_token(
        identity=str(user.id),
        expires_delta=REFRESH_LIFETIME,
        additional_claims=additional_claims
    )
    access_jti = get_jti(access_token)
    refresh_jti = get_jti(refresh_token)

    try:
        # Store tokens in whitelist with user association
        jwt_redis_whitelist.set(access_jti, f"access:{user.id}", ex=int(ACCESS_LIFETIME.total_seconds()))
        jwt_redis_whitelist.set(refresh_jti, f"refresh:{user.id}", ex=int(REFRESH_LIFETIME.total_seconds()))

        # Store user's active token list for easy cleanup during logout
        user_tokens_key = f"user_tokens:{user.id}"
        jwt_redis_whitelist.sadd(user_tokens_key, access_jti, refresh_jti)
        jwt_redis_whitelist.expire(user_tokens_key, int(REFRESH_LIFETIME.total_seconds()))
    except redis.RedisError as e:
        log.error("Could not store tokens in Redis: %s", e)
        return False

    set_access_cookies(response, access_token)
    set_refresh_cookies(response, refresh_token)
    return True

def revoke_user_tokens(user_id):
    """Remove all whitelisted tokens of a user, ending every session. Returns the number revoked."""
    user_tokens_key = f"user_tokens:{user_id}"
    token_jtis = jwt_redis_whitelist.smembers(user_tokens_key)
    if token_jtis:
        jwt_redis_whitelist.delete(*token_jtis, user_tokens_key)
    return len(token_jtis)

def validate_registration_data(data):
    errors = []
    
    # Get fields
    first_name = str_field(data, 'first_name')
    last_name = str_field(data, 'last_name')
    email = str_field(data, 'email').lower()
    password = str_field(data, 'password', strip=False)
    
    # Validate first_name
    if not first_name:
        errors.append("First name is required")
    elif len(first_name) > 50:
        errors.append("First name must be 50 characters or less")
    
    # Validate last_name
    if not last_name:
        errors.append("Last name is required")
    elif len(last_name) > 50:
        errors.append("Last name must be 50 characters or less")
    
    # Validate email
    if not email:
        errors.append("Email is required")
    elif len(email) > 50:
        errors.append("Email must be 50 characters or less")
    else:
        # Email format validation: text + '@' + text + '.' + text
        email_pattern = r'^[^@\s]+@[^@\s]+\.[^@\s]+$'
        if not re.match(email_pattern, email):
            errors.append("Invalid email format")
    
    # Validate password
    if not password:
        errors.append("Password is required")
    else:
        errors.extend(password_policy(password))
    
    return errors, first_name, last_name, email, password
    
#########################################################################################
################################## ACCOUNT ##############################################
#########################################################################################    

@app.route('/api/v1/register', methods=['POST'])
def register():
    data = json_body()
    if not data:
        return jsonify({"error": "No data provided"}), 400
        
    errors, first_name, last_name, email, password = validate_registration_data(data)
    if errors:
        return jsonify({"errors": errors}), 400
    
    if User.query.filter_by(email=email).first():
        return jsonify({"error": "Email already exists"}), 409
    
    # Create new user
    try:
        password_hash = generate_password_hash(password)
        new_user = User(
            first_name=first_name, 
            last_name=last_name, 
            email=email, 
            password=password_hash, 
            role='viewer', 
            is_blocked=False
        )
        
        db.session.add(new_user)
        db.session.commit()
        return jsonify({"message": "User registered successfully"}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Registration failed"}), 500

@app.route('/api/v1/login', methods=['POST'])
def login():
    data = json_body()
    if not data:
        return jsonify({"error": "No data provided"}), 400
        
    email = str_field(data, 'email').lower()
    password = str_field(data, 'password', strip=False)
    
    # Basic validation
    if not email or not password:
        return jsonify({"message": "Email and password are required"}), 400
    
    # Email format validation
    email_pattern = r'^[^@\s]+@[^@\s]+\.[^@\s]+$'
    if not re.match(email_pattern, email):
        return jsonify({"message": "Invalid email format"}), 400
    
    user = User.query.filter_by(email=email).first()
    
    if not user:
        check_password_hash(DUMMY_PASSWORD_HASH, password)
        return jsonify({"message": "Invalid credentials"}), 401

    if not user.check_password(password):
        return jsonify({"message": "Invalid credentials"}), 401
    
    if user.is_blocked:
        return jsonify({"message": "User is blocked"}), 403

    if password_hasher.check_needs_rehash(user.password):
        user.set_password(password)

    try:
        if user.role == 'admin':
            user.last_last_login = user.last_login_date
        user.last_login_date = datetime.now(timezone.utc)
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        log.warning("Could not update last_login_date: %s", e)

    response = jsonify({"message": "Login successful"})
    if not issue_tokens(user, response):
        return jsonify({"message": "Session service unavailable, try again later"}), 503

    return response, 200

@app.route('/api/v1/logout', methods=['POST'])
@jwt_required()
def logout():
    """Logout user and revoke both access and refresh tokens"""
    user_id = get_jwt_identity()
    try:
        revoked = revoke_user_tokens(user_id)
        if not revoked:
            # Fallback: remove current token
            jwt_redis_whitelist.delete(get_jwt()['jti'])
        log.info("Revoked %d tokens for user %s", revoked, user_id)
    except redis.RedisError as e:
        # Continue with logout even if token revocation fails
        log.error("Error during logout: %s", e)
    
    response = jsonify({"message": "Logout successful"})
    unset_jwt_cookies(response)
    return response, 200

@app.route('/api/v1/token/refresh', methods=['POST'])
@jwt_required(refresh=True)
def refresh_token():
    """Refresh access token using a valid refresh token"""
    current_user_id = get_jwt_identity()
    user = db.session.get(User, int(current_user_id))

    if not user:
        return jsonify({"error": "User not found"}), 404

    if user.is_blocked:
        return jsonify({"error": "User is blocked"}), 403

    user_tokens_key = f"user_tokens:{user.id}"
    try:
        # Remove the user's old access tokens (refresh tokens stay valid)
        for token_jti in jwt_redis_whitelist.smembers(user_tokens_key):
            token_data = jwt_redis_whitelist.get(token_jti)
            if token_data and token_data.startswith('access:'):
                jwt_redis_whitelist.delete(token_jti)
                jwt_redis_whitelist.srem(user_tokens_key, token_jti)

        new_access_token = create_access_token(
            identity=str(user.id),
            expires_delta=ACCESS_LIFETIME,
            additional_claims={"role": user.role}
        )
        new_access_jti = get_jti(new_access_token)

        # Whitelist the new access token and track it in the user's token set
        jwt_redis_whitelist.set(new_access_jti, f"access:{user.id}", ex=int(ACCESS_LIFETIME.total_seconds()))
        jwt_redis_whitelist.sadd(user_tokens_key, new_access_jti)
        jwt_redis_whitelist.expire(user_tokens_key, int(REFRESH_LIFETIME.total_seconds()))
    except redis.RedisError as e:
        log.error("Token refresh failed, Redis unavailable: %s", e)
        return jsonify({"error": "Session service unavailable"}), 503

    log.debug("Refreshed access token for user %s", user.id)
    response = jsonify({"message": "Token refreshed successfully"})
    set_access_cookies(response, new_access_token)
    return response, 200

@app.route('/api/v1/user/info', methods=['GET'])
@jwt_required()
def get_user_info():
    """Get current user information"""
    current_user_id = get_jwt_identity()
    
    # You can also get the role directly from the JWT token
    claims = get_jwt()
    role_from_token = claims.get('role', None)
    
    user = db.session.get(User, int(current_user_id))

    if not user:
        return jsonify({"error": "User not found"}), 404

    if user.is_blocked:
        return jsonify({"error": "User is blocked"}), 403

    return jsonify({
        "id": user.id,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "email": user.email,
        "role": user.role,
        "role_from_token": role_from_token,
        "is_blocked": user.is_blocked,
        "last_login_date": user.last_login_date.isoformat() if user.last_login_date else None,
        "last_last_login": user.last_last_login.isoformat() if user.last_last_login else None
    }), 200

def password_policy(password):
    """Returns a list of policy violation messages, empty if password is valid."""
    errors = []
    if len(password) < 8:
        errors.append("Password must be at least 8 characters long")
    if len(password) > 127:
        errors.append("Password must be 127 characters or less")
    if not re.search(r'[a-z]', password):
        errors.append("Password must contain at least one lowercase letter")
    if not re.search(r'[A-Z]', password):
        errors.append("Password must contain at least one uppercase letter")
    if not re.search(r'\d', password):
        errors.append("Password must contain at least one digit")
    if not re.search(r'[^a-zA-Z0-9]', password):
        errors.append("Password must contain at least one special character")
    return errors


@app.route('/api/v1/user/update_password', methods=['POST'])
@jwt_required()
def update_password():
    current_user_id = get_jwt_identity()
    user = db.session.get(User, int(current_user_id))
    if not user:
        return jsonify({"error": "User not found"}), 404
    if user.is_blocked:
        return jsonify({"error": "User is blocked"}), 403

    data = json_body()
    if not data:
        return jsonify({"error": "No data provided"}), 400

    current_password = str_field(data, 'current_password', strip=False)
    new_password = str_field(data, 'new_password', strip=False)

    if not current_password or not new_password:
        return jsonify({"error": "current_password and new_password are required"}), 400

    if not user.check_password(current_password):
        return jsonify({"error": "Current password is incorrect"}), 401

    policy_errors = password_policy(new_password)
    if policy_errors:
        return jsonify({"errors": policy_errors}), 400

    try:
        user.password = generate_password_hash(new_password)
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Failed to update password"}), 500

    # End all other sessions; this one gets fresh tokens so the user stays signed in
    response = jsonify({"message": "Password updated successfully"})
    try:
        revoke_user_tokens(user.id)
    except redis.RedisError as e:
        log.error("Could not revoke sessions after password change: %s", e)
    issue_tokens(user, response)
    return response, 200

#########################################################################################
################################## PHOTOS ###############################################
#########################################################################################
@app.route('/api/v1/media/<path:filename>', methods=['GET'])
@jwt_required()
def serve_media(filename):
    """Serve uploaded media files — only authenticated users"""
    # Prevent path traversal: send_from_directory already resolves safely,
    # but we also reject any path separators in the filename.
    if '/' in filename or '\\' in filename or '..' in filename:
        return jsonify({"error": "Invalid filename"}), 400

    photo = Photo.query.filter_by(filename=filename).first()
    if not photo:
        return jsonify({"error": "Photo not found"}), 404
    if photo.is_blocked:
        # Blocked photos stay visible only to their owner and admins
        user = db.session.get(User, int(get_jwt_identity()))
        if not user or (user.role != 'admin' and photo.owner_id != user.id):
            return jsonify({"error": "Photo not found"}), 404
    return send_from_directory(UPLOAD_FOLDER, filename)

@app.route('/api/v1/photos', methods=['GET'])
@jwt_required()
def list_photos():
    photos = Photo.query.filter_by(is_blocked=False).all()
    return jsonify([{
        "id": photo.id,
        "title": photo.title,
        "filename": photo.filename,
        "location": photo.location,
        "photo_year": photo.photo_year,
        "owner_id": photo.owner_id,
        "created_at": photo.created_at.isoformat()
    } for photo in photos]), 200

@app.route('/api/v1/photos/<int:photo_id>', methods=['GET'])
@jwt_required()
def get_photo(photo_id):
    photo = db.session.get(Photo, photo_id)
    if not photo or photo.is_blocked:
        return jsonify({"error": "Photo not found"}), 404
    return jsonify({
        "id": photo.id,
        "title": photo.title,
        "filename": photo.filename,
        "location": photo.location,
        "photo_year": photo.photo_year,
        "owner_id": photo.owner_id,
        "created_at": photo.created_at.isoformat()
    }), 200

@app.route('/api/v1/photos/<int:photo_id>', methods=['PUT'])
@jwt_required()
def update_photo(photo_id):
    """Edit photo metadata — owner or admin only"""
    current_user_id = get_jwt_identity()
    user = db.session.get(User, int(current_user_id))
    if not user:
        return jsonify({"error": "User not found"}), 404

    photo = db.session.get(Photo, photo_id)
    # Blocked photos are hidden from everyone except admins, who moderate them
    if not photo or (photo.is_blocked and user.role != 'admin'):
        return jsonify({"error": "Photo not found"}), 404

    if photo.owner_id != user.id and user.role != 'admin':
        return jsonify({"error": "Insufficient permissions"}), 403

    data = json_body()
    if not data:
        return jsonify({"error": "No data provided"}), 400

    title = str_field(data, 'title')
    location = str_field(data, 'location')
    photo_year = data.get('photo_year')

    if not title:
        return jsonify({"error": "Title is required"}), 400
    if not location:
        return jsonify({"error": "Location is required"}), 400
    if photo_year is not None:
        if isinstance(photo_year, bool) or not isinstance(photo_year, int):
            return jsonify({"error": "Year must be an integer"}), 400
        if not YEAR_MIN <= photo_year <= YEAR_MAX:
            log.warning("Rejected photo %s update: year %s outside %s-%s", photo_id, photo_year, YEAR_MIN, YEAR_MAX)
            return jsonify({"error": f"Year must be between {YEAR_MIN} and {YEAR_MAX}"}), 422

    try:
        photo.title = title
        photo.location = location
        photo.photo_year = photo_year
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Failed to update photo"}), 500

    return jsonify({"message": "Photo updated successfully"}), 200

@app.route('/api/v1/photos/<int:photo_id>', methods=['DELETE'])
@jwt_required()
def delete_photo(photo_id):
    """Delete a photo — owner or admin only"""
    current_user_id = get_jwt_identity()
    user = db.session.get(User, int(current_user_id))
    if not user:
        return jsonify({"error": "User not found"}), 404

    photo = db.session.get(Photo, photo_id)
    # Blocked photos are hidden from everyone except admins, who moderate them
    if not photo or (photo.is_blocked and user.role != 'admin'):
        return jsonify({"error": "Photo not found"}), 404

    if photo.owner_id != user.id and user.role != 'admin':
        return jsonify({"error": "Insufficient permissions"}), 403

    file_path = os.path.join(UPLOAD_FOLDER, photo.filename)
    try:
        db.session.delete(photo)
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Failed to delete photo"}), 500

    try:
        if os.path.isfile(file_path):
            os.remove(file_path)
    except OSError:
        pass

    return jsonify({"message": "Photo deleted successfully"}), 200

@app.route('/api/v1/photos/add', methods=['POST'])
@jwt_required()
@require_role('editor')
def add_photo():
    """Upload a photo (editor and admin only)"""
    current_user_id = get_jwt_identity()

    if 'file' not in request.files:
        return jsonify({"error": "No file provided"}), 400

    file = request.files['file']
    title = request.form.get('title', '').strip()
    location = request.form.get('location', '').strip()
    year_str = request.form.get('year', '').strip()

    if not title:
        return jsonify({"error": "Title is required"}), 400
    if not location:
        return jsonify({"error": "Location is required"}), 400
    year = None
    if year_str:
        # isdigit() alone also accepts e.g. '²', which int() rejects
        if not (year_str.isascii() and year_str.isdigit()):
            return jsonify({"error": "Year must be an integer"}), 400
        year = int(year_str)
        if not YEAR_MIN <= year <= YEAR_MAX:
            log.warning("Rejected photo upload by user %s: year %s outside %s-%s", current_user_id, year, YEAR_MIN, YEAR_MAX)
            return jsonify({"error": f"Year must be between {YEAR_MIN} and {YEAR_MAX}"}), 422
    if not file or file.filename == '':
        return jsonify({"error": "No file selected"}), 400

    original_name = file.filename
    if '.' not in original_name:
        return jsonify({"error": "File has no extension"}), 400

    ext = original_name.rsplit('.', 1)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        return jsonify({"error": f"File type not allowed. Allowed: {', '.join(sorted(ALLOWED_EXTENSIONS))}"}), 400

    # Read and enforce 1 MB size limit
    file_data = file.read()
    if len(file_data) > 1 * 1024 * 1024:
        return jsonify({"error": "File too large. Maximum size is 1 MB"}), 413

    if not is_valid_image(file_data, ext):
        return jsonify({"error": "File is not a valid image of the declared type"}), 400

    # UUID filename — completely replaces original name, safe against path traversal
    safe_filename = f"{uuid.uuid4().hex}.{ext}"

    os.makedirs(UPLOAD_FOLDER, exist_ok=True)
    file_path = os.path.join(UPLOAD_FOLDER, safe_filename)

    try:
        with open(file_path, 'wb') as f:
            f.write(file_data)
    except Exception as e:
        return jsonify({"error": "Failed to save file"}), 500

    try:
        photo = Photo(
            title=title,
            filename=safe_filename,
            location=location,
            photo_year=year,
            owner_id=int(current_user_id),
            is_blocked=False
        )
        db.session.add(photo)
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        try:
            os.remove(file_path)
        except OSError:
            pass
        return jsonify({"error": "Failed to save photo record"}), 500

    return jsonify({"message": "Photo uploaded successfully", "id": photo.id, "filename": safe_filename}), 201

@app.route('/api/v1/photos/my_photos', methods=['GET'])
@jwt_required()
@require_role('editor')
def my_photos():
    current_user_id = get_jwt_identity()
    photos = Photo.query.filter_by(owner_id=current_user_id).all()
    return jsonify([{
        "id": photo.id,
        "title": photo.title,
        "filename": photo.filename,
        "location": photo.location,
        "photo_year": photo.photo_year,
        "owner_id": photo.owner_id,
        "is_blocked": photo.is_blocked,
        "created_at": photo.created_at.isoformat()
    } for photo in photos]), 200


#########################################################################################
################################## ADMIN ################################################
#########################################################################################

@app.route('/api/v1/admin/test', methods=['GET'])
@jwt_required()
@require_role('admin')
def admin_test():
    """Test admin-only endpoint"""
    return jsonify({"message": "Admin access successful"}), 200


@app.route('/api/v1/admin/audit', methods=['GET'])
@jwt_required()
@require_role('admin')
def admin_audit():
    """List photos added since the admin's previous login (last_last_login)"""
    current_user_id = get_jwt_identity()
    user = db.session.get(User, int(current_user_id))
    if user.last_last_login:
        photos = Photo.query.filter(Photo.created_at >= user.last_last_login).order_by(Photo.created_at.desc()).all()
    else:
        photos = Photo.query.order_by(Photo.created_at.desc()).all()
    return jsonify([{
        "id": photo.id,
        "title": photo.title,
        "filename": photo.filename,
        "location": photo.location,
        "photo_year": photo.photo_year,
        "owner_id": photo.owner_id,
        "is_blocked": photo.is_blocked,
        "created_at": photo.created_at.isoformat()
    } for photo in photos]), 200


@app.route('/api/v1/admin/manage_users', methods=['GET'])
@jwt_required()
@require_role('admin')
def admin_manage_users():
    """List all users"""
    users = User.query.order_by(User.id).all()
    return jsonify([{
        "id": u.id,
        "first_name": u.first_name,
        "last_name": u.last_name,
        "email": u.email,
        "role": u.role,
        "is_blocked": u.is_blocked,
        "last_login_date": u.last_login_date.isoformat() if u.last_login_date else None
    } for u in users]), 200


@app.route('/api/v1/admin/manage_users', methods=['PUT'])
@jwt_required()
@require_role('admin')
def admin_update_user_roles():
    """Bulk-update user roles"""
    data = json_body()
    if not data or 'changes' not in data:
        return jsonify({"error": "No changes provided"}), 400

    changes = data['changes']
    if not isinstance(changes, list) or len(changes) == 0:
        return jsonify({"error": "changes must be a non-empty list"}), 400

    errors = []
    for change in changes:
        user_id = change.get('id')
        new_role = change.get('role')
        if not isinstance(user_id, int) or not isinstance(new_role, str) or new_role not in VALID_ROLES:
            errors.append(f"Invalid entry: {change}")
            continue
        user = db.session.get(User, user_id)
        if not user:
            errors.append(f"User {user_id} not found")
            continue
        user.role = new_role

    if errors:
        db.session.rollback()
        return jsonify({"error": "Some changes were invalid", "details": errors}), 400

    try:
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Failed to save changes"}), 500

    return jsonify({"message": f"Updated {len(changes)} user(s)"}), 200


@app.route('/api/v1/admin/users/<int:user_id>/block', methods=['PUT'])
@jwt_required()
@require_role('admin')
def admin_block_user(user_id):
    """Block a user (admin only)"""
    current_user_id = get_jwt_identity()
    if user_id == int(current_user_id):
        return jsonify({"error": "Cannot block yourself"}), 400

    user = db.session.get(User, user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404

    user.is_blocked = True
    try:
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Failed to block user"}), 500

    # End the user's sessions right away instead of waiting for the access token to expire
    try:
        revoke_user_tokens(user_id)
    except redis.RedisError as e:
        log.error("Could not revoke sessions of blocked user %s: %s", user_id, e)

    return jsonify({"message": f"User {user_id} blocked"}), 200


@app.route('/api/v1/admin/users/<int:user_id>/unblock', methods=['PUT'])
@jwt_required()
@require_role('admin')
def admin_unblock_user(user_id):
    """Unblock a user (admin only)"""
    user = db.session.get(User, user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404

    user.is_blocked = False
    try:
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Failed to unblock user"}), 500

    return jsonify({"message": f"User {user_id} unblocked"}), 200


@app.route('/api/v1/admin/photos/<int:photo_id>/block', methods=['PUT'])
@jwt_required()
@require_role('admin')
def admin_block_photo(photo_id):
    """Block a photo (admin only)"""
    photo = db.session.get(Photo, photo_id)
    if not photo:
        return jsonify({"error": "Photo not found"}), 404

    photo.is_blocked = True
    try:
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Failed to block photo"}), 500

    return jsonify({"message": f"Photo {photo_id} blocked"}), 200


@app.route('/api/v1/admin/photos/<int:photo_id>/unblock', methods=['PUT'])
@jwt_required()
@require_role('admin')
def admin_unblock_photo(photo_id):
    """Unblock a photo (admin only)"""
    photo = db.session.get(Photo, photo_id)
    if not photo:
        return jsonify({"error": "Photo not found"}), 404

    photo.is_blocked = False
    try:
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Failed to unblock photo"}), 500

    return jsonify({"message": f"Photo {photo_id} unblocked"}), 200


@app.route('/api/v1/admin/manage_photos', methods=['GET'])
@jwt_required()
@require_role('admin')
def admin_manage_photos():
    """List all photos including blocked ones"""
    photos = Photo.query.order_by(Photo.created_at.desc()).all()
    return jsonify([{
        "id": photo.id,
        "title": photo.title,
        "filename": photo.filename,
        "location": photo.location,
        "photo_year": photo.photo_year,
        "owner_id": photo.owner_id,
        "is_blocked": photo.is_blocked,
        "created_at": photo.created_at.isoformat()
    } for photo in photos]), 200



#########################################################################################
################################## FORGOT PASSWORD #####################################
#########################################################################################

@app.route('/api/v1/forgot_password', methods=['POST'])
def forgot_password():
    """Send a password-reset email if the given address exists."""
    data = json_body() or {}
    email = str_field(data, 'email').lower()
    if not email:
        return jsonify({"error": "Email is required"}), 400

    user = User.query.filter_by(email=email).first()
    # Always return 200 to avoid leaking whether an email exists
    if not user:
        return jsonify({"message": "If that email exists, a reset link has been sent."}), 200

    token = secrets.token_urlsafe(48)          # 64-char URL-safe token
    redis_key = f"password_reset:{token}"
    jwt_redis_whitelist.setex(redis_key, 900, str(user.id))

    try:
        send_password_reset_email(user.email, token)
    except Exception as e:
        log.error("Email send error: %s", e)
        return jsonify({"error": "Failed to send reset email. Try again later."}), 500

    return jsonify({"message": "If that email exists, a reset link has been sent."}), 200


@app.route('/api/v1/forgot_password/<string:token>', methods=['GET'])
def validate_reset_token(token):
    """Check whether a password-reset token is still valid."""
    redis_key = f"password_reset:{token}"
    user_id = jwt_redis_whitelist.get(redis_key)
    if not user_id:
        return jsonify({"error": "Invalid or expired token"}), 404
    return jsonify({"message": "Token is valid"}), 200


@app.route('/api/v1/forgot_password/<string:token>', methods=['POST'])
def reset_password(token):
    """Reset a user's password using a valid reset token."""
    redis_key = f"password_reset:{token}"
    user_id = jwt_redis_whitelist.get(redis_key)
    if not user_id:
        return jsonify({"error": "Invalid or expired token"}), 404

    data = json_body() or {}
    new_password = str_field(data, 'new_password', strip=False)
    repeat_password = str_field(data, 'repeat_password', strip=False)

    if not new_password or not repeat_password:
        return jsonify({"error": "Both password fields are required"}), 400

    if new_password != repeat_password:
        return jsonify({"error": "Passwords do not match"}), 400

    policy_errors = password_policy(new_password)
    if policy_errors:
        return jsonify({"errors": policy_errors}), 400

    user = db.session.get(User, int(user_id))
    if not user:
        return jsonify({"error": "User not found"}), 404

    user.password = generate_password_hash(new_password)
    try:
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Failed to update password"}), 500

    # Invalidate the token immediately after use and end all existing sessions
    jwt_redis_whitelist.delete(redis_key)
    try:
        revoke_user_tokens(user.id)
    except redis.RedisError as e:
        log.error("Could not revoke sessions after password reset: %s", e)

    return jsonify({"message": "Password has been reset successfully"}), 200


@app.route('/api/v1/healthcheck', methods=['GET'])
def healthcheck():
    return jsonify({"status": "ok"}), 200

def main():
    # Local development only; in the cloud the app runs under gunicorn.
    app.run(host='0.0.0.0', port=5000, debug=os.getenv("FLASK_DEBUG", "false").lower() == "true")

if __name__ == '__main__':
    main()