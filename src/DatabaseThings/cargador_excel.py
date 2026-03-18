import os
import bcrypt
import hashlib
import psycopg2
import sys
from dotenv import load_dotenv
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.backends import default_backend

# Forzar salida en utf-8 para evitar errores de codificación en consola Windows
sys.stdout.reconfigure(encoding='utf-8')

# Cargar las variables de tu archivo .env
load_dotenv()

DB_USER = os.getenv('DBS_USER')
DB_PASSWORD = os.getenv('DBS_PASSWORD')
DB_HOST = os.getenv('DBS_HOST')
DB_PORT = os.getenv('DBS_PORT', '6543')
DB_DATABASE = os.getenv('DBS_DATABASE')
ENCRYPTION_KEY = os.getenv('ENCRYPTION_KEY', '').encode()

def encrypt_aes(plaintext: str, key: bytes) -> str:
    if not plaintext: return "SIN_DATO"
    iv = os.urandom(16)
    cipher = Cipher(algorithms.AES(key), modes.CBC(iv), backend=default_backend())
    encryptor = cipher.encryptor()
    plaintext_bytes = str(plaintext).encode('utf-8')
    pad_len = 16 - (len(plaintext_bytes) % 16)
    plaintext_bytes += bytes([pad_len] * pad_len)
    ciphertext = encryptor.update(plaintext_bytes) + encryptor.finalize()
    return f"{iv.hex()}:{ciphertext.hex()}"

def generate_hash(value: str) -> str:
    if not value: return "hash_vacio"
    return hashlib.sha256(str(value).encode('utf-8')).hexdigest()

def crear_admin_maestro():
    conn = None
    try:
        conn = psycopg2.connect(
            user=DB_USER, 
            password=DB_PASSWORD, 
            host=DB_HOST, 
            port=DB_PORT, 
            database=DB_DATABASE
        )
        cur = conn.cursor()

        # Datos del administrador
        nombre = "Administrador Master"
        rut_admin = "11111111-1" # Dato obligatorio por la estructura
        email_admin = "admin@vsv.cl"
        password_plana = "admin123"

        print(f"Encriptando y procesando credenciales para: {email_admin}...")

        # 1. Encriptar y hashear el RUT
        rut_enc = encrypt_aes(rut_admin, ENCRYPTION_KEY)
        rut_hash = generate_hash(rut_admin)
        
        # 2. Encriptar y hashear el Email
        email_enc = encrypt_aes(email_admin, ENCRYPTION_KEY)
        email_hash = generate_hash(email_admin)

        # 3. Hashear la contraseña (bcrypt) para inicio de sesión
        salt = bcrypt.gensalt(rounds=10)
        clave_hash = bcrypt.hashpw(password_plana.encode('utf-8'), salt).decode('utf-8')

        # Insertar usando los nombres de columnas correctos de tu esquema
        cur.execute("""
            INSERT INTO usuario (
                nombre, rut_encrypted, rut_hash, email_encrypted, email_hash, clave, rol, activo
            ) VALUES (
                %s, %s, %s, %s, %s, %s, 'Administrador', true
            ) RETURNING id;
        """, (nombre, rut_enc, rut_hash, email_enc, email_hash, clave_hash))
        
        nuevo_id = cur.fetchone()[0]
        conn.commit()
        
        # Le quité los emojis para que la consola de tu Windows no falle
        print(f"[EXITO] Administrador creado con ID: {nuevo_id}")
        print(f" > Correo: {email_admin}")
        print(f" > Contrasena: {password_plana}")

        cur.close()
        conn.close()

    except Exception as e:
        if conn:
            conn.rollback()
            conn.close()
        print(f"[ERROR] Error al crear el administrador: {e}")

if __name__ == "__main__":
    crear_admin_maestro()