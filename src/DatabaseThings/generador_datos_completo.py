"""
Script de generación y carga completo para VSV-Contadores
Hace TODO en un script:
1. Se conecta a la BD
2. Trunca tablas en orden
3. Inserta planes
4. Inserta servicios
5. Genera y carga usuarios, empresas, credenciales, sucursales, audita,
   empresa_servicios, empresa_servicio_historial, bitácora y sesiones
6. Guarda JSON para registro
"""

from faker import Faker
import random
import os
import json
import uuid
from datetime import datetime, timedelta
import psycopg2
from psycopg2.extras import execute_values
import bcrypt
import hashlib
from dotenv import load_dotenv
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.backends import default_backend
import struct
import base64

# Cargar variables de entorno
load_dotenv()

fake = Faker(['es_CL'])

# --- CONFIGURACIÓN BD ---
DB_USER = os.getenv('DBS_USER')
DB_PASSWORD = os.getenv('DBS_PASSWORD')
DB_HOST = os.getenv('DBS_HOST')
DB_PORT = os.getenv('DBS_PORT', '6543')
DB_DATABASE = os.getenv('DBS_DATABASE')
ENCRYPTION_KEY = os.getenv('ENCRYPTION_KEY', '').encode()

# --- CONFIGURACIÓN DATA ---
CANTIDAD_USUARIOS = 150
CANTIDAD_EMPRESAS = 80
NOMBRE_ARCHIVO = "datosdepruebahash_completo.txt"
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
RUTA_FINAL = os.path.join(BASE_DIR, NOMBRE_ARCHIVO)


def calc_rut_dv(number: int) -> str:
    """Calcula dígito verificador chileno válido"""
    reversed_digits = map(int, reversed(str(number)))
    factors = [2, 3, 4, 5, 6, 7]
    total = 0
    for i, digit in enumerate(reversed_digits):
        total += digit * factors[i % len(factors)]

    mod = 11 - (total % 11)
    if mod == 11:
        return '0'
    if mod == 10:
        return 'K'
    return str(mod)


def generar_rut_chileno_valido(used: set = None) -> str:
    """Genera RUT chileno válido y único"""
    if used is None:
        used = set()
    
    while True:
        numero = random.randint(5_000_000, 26_000_000)
        rut = f"{numero}-{calc_rut_dv(numero)}"
        if rut not in used:
            if used is not None:
                used.add(rut)
            return rut


def generar_timestamp_pasado(dias_atras: int = 365) -> str:
    """Genera un timestamp ISO hace X días"""
    fecha = datetime.utcnow() - timedelta(days=random.randint(0, dias_atras))
    return fecha.isoformat() + 'Z'


def encrypt_aes(plaintext: str, key: bytes) -> str:
    """Encripta AES-256-CBC y retorna iv_hex:ciphertext_hex"""
    if not key or len(key) != 32:
        raise ValueError(f"Clave debe ser 32 bytes, recibido {len(key)}")
    
    iv = os.urandom(16)
    cipher = Cipher(algorithms.AES(key), modes.CBC(iv), backend=default_backend())
    encryptor = cipher.encryptor()
    
    plaintext_bytes = plaintext.encode()
    pad_len = 16 - (len(plaintext_bytes) % 16)
    plaintext_bytes += bytes([pad_len] * pad_len)
    
    ciphertext = encryptor.update(plaintext_bytes) + encryptor.finalize()
    return f"{iv.hex()}:{ciphertext.hex()}"


def generate_hash(value: str) -> str:
    """Genera SHA256 hash para campos searchables"""
    return hashlib.sha256(value.encode()).hexdigest()


def hash_password(password: str) -> str:
    """Genera bcrypt hash de contraseña"""
    salt = bcrypt.gensalt(rounds=10)
    return bcrypt.hashpw(password.encode(), salt).decode()


def conectar_bd():
    """Retorna conexión a PostgreSQL"""
    try:
        conn = psycopg2.connect(
            user=DB_USER,
            password=DB_PASSWORD,
            host=DB_HOST,
            port=DB_PORT,
            database=DB_DATABASE
        )
        return conn
    except Exception as e:
        print(f"❌ Error conectando a BD: {e}")
        raise


def cargar_todo():
    """Conecta a BD, trunca, inserta planes, servicios y carga todo"""
    conn = None
    try:
        print(f"🚀 Iniciando carga completa de datos...")
        
        # Conectar a BD
        conn = conectar_bd()
        cur = conn.cursor()
        
        # --- 1. TRUNCAR TABLAS ---
        print("🗑️  Limpiando base de datos...")
        tablas_truncate = [
            'empresa_servicio_historial', 'empresa_servicio', 'empresa_credenciales',
            'bitacora_gestion', 'audita', 'sucursal', 'empresa', 'sessions', 'usuario'
        ]
        for tabla in tablas_truncate:
            try:
                cur.execute(f"TRUNCATE TABLE {tabla} CASCADE;")
            except:
                pass
        conn.commit()
        
        # --- 2. INSERTAR PLANES ---
        print("📋 Insertando planes...")
        planes_data = [
            'GO',
            'FREE',
            'EMPRENDEDOR',
            'FULL EMPRENDEDOR',
            'EXECUTIVE',
            'ADVANCE'
        ]
        
        plane_ids = {}  # Mapeo nombre -> id
        for nombre in planes_data:
            cur.execute(
                "INSERT INTO plan (nombre) VALUES (%s) ON CONFLICT DO NOTHING RETURNING id",
                (nombre,)
            )
            result = cur.fetchone()
            if result:
                pid = result[0]
            else:
                # Si ya existe, obtener su ID
                cur.execute("SELECT id FROM plan WHERE nombre = %s", (nombre,))
                pid = cur.fetchone()[0]
            plane_ids[nombre] = pid
        conn.commit()
        
        # --- 3. INSERTAR SERVICIOS ---
        print("🔧 Insertando servicios...")
        servicios_data = [
            ('iva-mensual', 'IVA Mensual', 'Tributaria'),
            ('conciliacion-bancaria', 'Conciliación Bancaria', 'Contabilidad'),
            ('clasificacion-cuentas', 'Clasificación de Cuentas', 'Contabilidad'),
            ('gastos-factura', 'Gastos por Factura', 'Contabilidad'),
            ('ventas-factura', 'Ventas por Factura', 'Contabilidad'),
            ('balance-anual', 'Balance Anual', 'Contabilidad'),
            ('soporte-email', 'Soporte por Email', 'Soporte'),
            ('cupos-rrhh', 'Cupos RRHH', 'RRHH'),
            ('contratos-trabajo', 'Contratos de Trabajo', 'RRHH'),
            ('liquidaciones-sueldo', 'Liquidaciones de Sueldo', 'RRHH'),
            ('nomina-previred', 'Nómina Previred', 'RRHH'),
            ('finiquitos', 'Finiquitos', 'RRHH'),
        ]
        
        servicio_ids = {}  # Mapeo slug -> id
        for slug, nombre, categoria in servicios_data:
            cur.execute(
                """INSERT INTO servicio (slug, nombre, categoria) VALUES (%s, %s, %s) 
                   ON CONFLICT DO NOTHING RETURNING id""",
                (slug, nombre, categoria)
            )
            result = cur.fetchone()
            if result:
                sid = result[0]
            else:
                # Si ya existe, obtener su ID
                cur.execute("SELECT id FROM servicio WHERE slug = %s", (slug,))
                sid = cur.fetchone()[0]
            servicio_ids[slug] = sid
        conn.commit()
        
        # --- 4. GENERAR DATOS ---
        print(f"\n📊 Generando datos de prueba...")
        
        used_ruts = set()
        used_emails = set()
        
        data_final = {
            "usuarios": [],
            "empresas": [],
            "credenciales": [],
            "sucursales": [],
            "audita": [],
            "empresa_servicios": [],
            "empresa_servicio_historial": [],
            "bitacora_gestion": [],
            "sessions": []
        }
        
        # Generar usuarios
        print(f"  👤 Generando {CANTIDAD_USUARIOS} usuarios...")
        user_ids = []
        roles = ['Administrador', 'Consultor', 'Cliente']
        
        usuarios_insert = []
        data_final["usuarios"] = []
        
        # --- USUARIO ADMINISTRADOR GARANTIZADO ---
        admin_nombre = "Walter David Arias Acevedo"
        admin_rut = "20866173-6"
        admin_email = "carlos@gmail.com"
        admin_rol = "Administrador"
        admin_activo = True
        
        # Encriptar admin
        admin_rut_encrypted = encrypt_aes(admin_rut, ENCRYPTION_KEY)
        admin_email_encrypted = encrypt_aes(admin_email, ENCRYPTION_KEY)
        admin_rut_hash = generate_hash(admin_rut)
        admin_email_hash = generate_hash(admin_email)
        admin_clave_hash = hash_password("12345678")
        
        usuarios_insert.append((
            admin_nombre, admin_rut_encrypted, admin_rut_hash, admin_email_encrypted, 
            admin_email_hash, admin_clave_hash, admin_rol, admin_activo
        ))
        
        data_final["usuarios"].append({
            "nombre": admin_nombre,
            "rut": admin_rut,
            "email": admin_email,
            "rol": admin_rol,
            "activo": admin_activo
        })
        
        used_ruts.add(admin_rut)
        used_emails.add(admin_email)
        
        # --- GENERAR USUARIOS ADICIONALES (149 más) ---
        for _ in range(CANTIDAD_USUARIOS - 1):
            nombre = fake.name()
            rut = generar_rut_chileno_valido(used_ruts)
            email = fake.unique.email().lower()
            while email in used_emails:
                email = fake.unique.email().lower()
            used_emails.add(email)
            
            clave = "12345678"
            rol = random.choices(roles, weights=[8, 25, 67])[0]
            activo = random.choices([True, False], weights=[92, 8])[0]
            
            # Encriptar RUT y email
            rut_encrypted = encrypt_aes(rut, ENCRYPTION_KEY)
            email_encrypted = encrypt_aes(email, ENCRYPTION_KEY)
            
            # Hashes para búsqueda
            rut_hash = generate_hash(rut)
            email_hash = generate_hash(email)
            
            # Bcrypt para contraseña
            clave_hash = hash_password(clave)
            
            usuarios_insert.append((
                nombre, rut_encrypted, rut_hash, email_encrypted, email_hash,
                clave_hash, rol, activo
            ))
            
            data_final["usuarios"].append({
                "nombre": nombre,
                "rut": rut,
                "email": email,
                "rol": rol,
                "activo": activo
            })
            
            user_ids.append(None)  # Placeholder
        
        # Insertar usuarios y obtener IDs
        query = """INSERT INTO usuario (nombre, rut_encrypted, rut_hash, email_encrypted, 
                   email_hash, clave, rol, activo) 
                   VALUES %s RETURNING id"""
        execute_values(cur, query, usuarios_insert)
        user_ids = [row[0] for row in cur.fetchall()]
        conn.commit()
        
        # Generar empresas
        print(f"  🏢 Generando {CANTIDAD_EMPRESAS} empresas...")
        empresa_ids = []
        empresa_plan_map = {}
        
        regimenes = ['Propyme General', 'Propyme Transparencia', 'General Semi Integrado']
        giros = ['Servicios', 'Tecnología', 'Retail', 'Manufactura', 'Consultoría']
        
        # Comunas por ciudad (Chile)
        comunas = {
            'Santiago': ['Santiago', 'Providencia', 'Las Condes', 'Ñuñoa', 'Maipú', 'San Miguel', 'Estación Central', 'Quilicura', 'La Reina', 'Peñalolén'],
            'Valparaíso': ['Valparaíso', 'Viña del Mar', 'Concón', 'Quilpué', 'Villa Alemana', 'Limache'],
            'Concepción': ['Concepción', 'Talcahuano', 'San Pedro de la Paz', 'Coronel', 'Lota']
        }
        ciudades = list(comunas.keys())
        estado_pago_vals = ['AL DIA', 'NO PAGADO']
        estado_f29_vals = ['DECLARADO', 'PENDIENTE']
        
        empresas_insert = []
        for _ in range(CANTIDAD_EMPRESAS):
            plan = random.choice(planes_data)
            plan_id = plane_ids[plan]
            empresa_plan_map[len(empresa_ids)] = plan_id, plan
            
            nombre = fake.company()
            rut = generar_rut_chileno_valido(used_ruts)
            rut_rep = generar_rut_chileno_valido(used_ruts)
            
            # Encriptar RUTs
            rut_encrypted = encrypt_aes(rut, ENCRYPTION_KEY)
            rut_rep_encrypted = encrypt_aes(rut_rep, ENCRYPTION_KEY)
            rut_hash = generate_hash(rut)
            
            empresas_insert.append((
                plan_id, nombre, rut_encrypted, rut_hash, rut_rep_encrypted,
                random.choice(giros), random.choice(regimenes),
                fake.phone_number(), fake.company_email(),
                f"https://placehold.co/200?text={nombre[:2]}",
                random.choices(estado_pago_vals, weights=[65, 35])[0],
                random.choices(estado_f29_vals, weights=[75, 25])[0],
                round(random.uniform(0, 2_500_000), 2),
                random.randint(0, 80),
                random.randint(30, 100),
                fake.name()
            ))
            
            data_final["empresas"].append({
                "razon_social": nombre,
                "rut": rut,
                "plan": plan
            })
        
        query = """INSERT INTO empresa (plan_id, razon_social, rut_encrypted, rut_hash, 
                   rut_rep_encrypted, giro, regimen_tributario, telefono_corporativo, 
                   email_corporativo, logo_url, estado_pago, estado_f29, impuesto_pagar, 
                   dts_mensuales, score, nombre_rep)
                   VALUES %s RETURNING id"""
        execute_values(cur, query, empresas_insert)
        empresa_ids = [row[0] for row in cur.fetchall()]
        conn.commit()
        
        # Credenciales SII
        print("  🔐 Insertando credenciales SII...")
        creds_insert = []
        for emp_id in empresa_ids:
            sii_rut = generar_rut_chileno_valido(used_ruts)
            sii_email = fake.email()
            sii_password = f"sii_pass_{uuid.uuid4().hex[:8]}"
            
            sii_rut_encrypted = encrypt_aes(sii_rut, ENCRYPTION_KEY)
            sii_email_encrypted = encrypt_aes(sii_email, ENCRYPTION_KEY)
            sii_password_encrypted = encrypt_aes(sii_password, ENCRYPTION_KEY)
            web_password_encrypted = encrypt_aes(sii_password or "web_default_pass", ENCRYPTION_KEY)
            
            creds_insert.append((
                emp_id, sii_rut_encrypted, sii_email_encrypted, sii_password_encrypted, web_password_encrypted
            ))
        
        query = """INSERT INTO empresa_credenciales (empresa_id, sii_rut_encrypted, 
                   sii_email_encrypted, sii_password_encrypted, web_password_encrypted) VALUES %s"""
        execute_values(cur, query, creds_insert)
        conn.commit()
        
        # Sucursales
        print("  🏪 Insertando sucursales...")
        sucursales_insert = []
        for emp_id in empresa_ids:
            ciudad_elegida = random.choice(ciudades)
            comuna_elegida = random.choice(comunas[ciudad_elegida])
            sucursales_insert.append((
                emp_id, fake.street_address(),
                comuna_elegida, ciudad_elegida,
                fake.phone_number(), True
            ))
        
        query = """INSERT INTO sucursal (empresa_id, direccion, comuna, ciudad, 
                   telefono_sucursal, es_casa_matriz) VALUES %s"""
        execute_values(cur, query, sucursales_insert)
        conn.commit()
        
        # Audita (relaciones usuario-empresa)
        print("  🔗 Generando relaciones usuario-empresa...")
        audita_insert = []
        for u_id in user_ids:
            if random.random() > 0.4:
                num_asignaciones = random.randint(1, 4)
                empresas_a_asignar = random.sample(
                    range(len(empresa_ids)), 
                    k=min(num_asignaciones, len(empresa_ids))
                )
                for emp_idx in empresas_a_asignar:
                    audita_insert.append((u_id, empresa_ids[emp_idx]))
        
        query = "INSERT INTO audita (usuario_id, empresa_id) VALUES %s"
        if audita_insert:
            execute_values(cur, query, audita_insert)
            conn.commit()
        
        # Servicios asignados
        print("  📦 Asignando servicios a empresas...")
        emp_servicios_insert = []
        emp_serv_ids_map = {}  # Para historial
        
        for emp_idx, emp_id in enumerate(empresa_ids):
            num_servicios = random.randint(3, len(servicio_ids))
            servicios_asignados = random.sample(
                list(servicio_ids.keys()), 
                k=num_servicios
            )
            
            for slug in servicios_asignados:
                servicio_id = servicio_ids[slug]
                estado = random.choices(
                    ['Activo', 'Pendiente', 'Suspendido'], 
                    weights=[70, 15, 15]
                )[0]
                
                fecha_inicio = None
                fecha_termino = None
                if estado in ['Activo', 'Suspendido']:
                    fecha_inicio = generar_timestamp_pasado(dias_atras=500)
                if estado == 'Suspendido':
                    fecha_termino = generar_timestamp_pasado(dias_atras=random.randint(10, 200))
                
                emp_servicios_insert.append((
                    emp_id, servicio_id, estado,
                    round(random.uniform(5_000, 250_000), 2) if random.random() < 0.85 else None,
                    fecha_inicio, fecha_termino
                ))
        
        query = """INSERT INTO empresa_servicio (empresa_id, servicio_id, estado, 
                   precio_pactado, fecha_inicio, fecha_termino) 
                   VALUES %s RETURNING id"""
        execute_values(cur, query, emp_servicios_insert)
        emp_serv_ids = [row[0] for row in cur.fetchall()]
        conn.commit()
        
        # Historial de servicios
        print("  📜 Generando historial de servicios...")
        historial_insert = []
        for emp_serv_id in emp_serv_ids:
            if random.random() < 0.7:
                historial_insert.append((
                    emp_serv_id,
                    random.choice(user_ids),
                    random.choice(['Pendiente', 'Activo', None]),
                    random.choice(['Pendiente', 'Activo', 'Suspendido']),
                    random.choice([
                        'Cambio solicitado',
                        'Actualización automática',
                        'Revisión periódica',
                        'Cumplimiento'
                    ]),
                    generar_timestamp_pasado(dias_atras=90)
                ))
        
        query = """INSERT INTO empresa_servicio_historial (empresa_servicio_id, usuario_id, 
                   estado_anterior, estado_nuevo, motivo, created_at) VALUES %s"""
        if historial_insert:
            execute_values(cur, query, historial_insert)
            conn.commit()
        
        # Bitácora de gestión
        print("  📋 Generando bitácora...")
        bitacora_insert = []
        bitacora_templates = [
            'Cliente solicita regularización',
            'Recordatorio de pago enviado',
            'Documentación validada',
            'Pendiente respuesta',
            'Antecedentes recibidos',
            'Revisión en progreso',
            'Licencia aprobada',
            'Nómina procesada',
            'Declaración SII enviada',
            'Información requerida',
            'Auditoría completada',
            'Servicio activado'
        ]
        
        for emp_id in empresa_ids:
            for _ in range(random.randint(4, 12)):
                bitacora_insert.append((
                    emp_id,
                    random.choice(user_ids) if random.random() < 0.85 else None,
                    random.choice(bitacora_templates),
                    generar_timestamp_pasado(dias_atras=150)
                ))
        
        query = """INSERT INTO bitacora_gestion (empresa_id, usuario_id, texto, created_at) 
                   VALUES %s"""
        execute_values(cur, query, bitacora_insert)
        conn.commit()
        
        # Sesiones
        print("  🔑 Generando sesiones...")
        muestra_usuarios = random.sample(user_ids, k=max(1, int(len(user_ids) * 0.25)))
        sesiones_insert = []
        
        for u_id in muestra_usuarios:
            ahora = datetime.utcnow()
            created = ahora - timedelta(days=random.randint(0, 20), hours=random.randint(0, 23))
            expires = created + timedelta(days=random.randint(3, 14))
            
            sesiones_insert.append((
                str(uuid.uuid4()),
                u_id,
                expires.isoformat() + 'Z',
                created.isoformat() + 'Z'
            ))
        
        query = """INSERT INTO sessions (session_id, usuario_id, expires_at, created_at) 
                   VALUES %s"""
        execute_values(cur, query, sesiones_insert)
        conn.commit()
        
        # Guardar JSON para registro
        with open(RUTA_FINAL, "w", encoding="utf-8") as archivo:
            json.dump(data_final, archivo, indent=2, ensure_ascii=False)
        
        print(f"\n✅ Datos cargados exitosamente a la BD")
        print(f"📁 JSON guardado: {RUTA_FINAL}")
        print(f"\n📊 Resumen:")
        print(f"   • Usuarios: {len(user_ids)}")
        print(f"   • Empresas: {len(empresa_ids)}")
        print(f"   • Planes: {len(plane_ids)}")
        print(f"   • Servicios: {len(servicio_ids)}")
        print(f"   • Servicios asignados: {len(emp_servicios_insert)}")
        print(f"   • Historial servicios: {len(historial_insert)}")
        print(f"   • Entradas bitácora: {len(bitacora_insert)}")
        print(f"   • Sesiones: {len(sesiones_insert)}")
        
        cur.close()
        conn.close()
        
    except Exception as e:
        if conn:
            conn.rollback()
            conn.close()
        print(f"❌ ERROR: {e}")
        import traceback
        traceback.print_exc()
        raise


if __name__ == "__main__":
    try:
        cargar_todo()
    except Exception as e:
        print(f"❌ Error: {e}")
        raise
