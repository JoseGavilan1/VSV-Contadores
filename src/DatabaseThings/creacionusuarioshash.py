
# Importaciones
from faker import Faker
import random
import os
import json
import uuid 

fake = Faker(['es_CL'])

# --- CONFIGURACIÓN ---
# Cantidades
CANTIDAD_USUARIOS = 1000 # Ajustar según los usuarios necesarios
CANTIDAD_EMPRESAS = 200 # Ajustar según las empresas necesarias
# Rutas
NOMBRE_ARCHIVO = "datosdepruebahash.txt" # Nombre del archivo, de ser cambiado ajustar también en cargador.js
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
RUTA_FINAL = os.path.join(BASE_DIR, NOMBRE_ARCHIVO)

def generar_rut_chileno():
    numero = random.randint(10000000, 25000000)
    dv = random.choice(['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'K'])
    return f"{numero}-{dv}"

def generar_todo():
    print(f"🚀 Generando ecosistema UUID con Representantes Legales...")
    
    data_final = {
        "usuarios": [],
        "empresas": [],
        "credenciales": [],
        "sucursales": [],
        "audita": []
    }

    # --- USUARIOS ---
    user_ids = []
    roles = ['Administrador', 'Consultor', 'Cliente']
    for _ in range(CANTIDAD_USUARIOS):
        user_id = str(uuid.uuid4())
        user_ids.append(user_id)
        data_final["usuarios"].append({
            "id": user_id,
            "nombre": fake.name(),
            "rut": generar_rut_chileno(),
            "email": fake.unique.email(),
            "clave": "12345678", 
            "rol": random.choice(roles),
            "activo": random.choices([True, False], weights=[90, 10])[0]
        })

    # --- EMPRESAS Y CREDENCIALES ---
    company_ids = []
    regimenes = ['Propyme General', 'Propyme Transparencia', 'General Semi Integrado']
    giros = ['Servicios de Ingeniería', 'Asesorías Contables', 'Venta de Software', 'Transporte']
    ciudades_principales = ['Santiago', 'Valparaíso', 'Concepción', 'La Serena', 'Antofagasta', 'Temuco']

    for _ in range(CANTIDAD_EMPRESAS):
        comp_id = str(uuid.uuid4())
        company_ids.append(comp_id)
        nombre_empresa = fake.company()
        
        # A. Tabla 'empresa'
        data_final["empresas"].append({
            "id": comp_id,
            "razon_social": nombre_empresa,
            "rut": generar_rut_chileno(),
            "giro": random.choice(giros),
            "regimen_tributario": random.choice(regimenes),
            "telefono_corporativo": fake.phone_number(),
            "email_corporativo": fake.company_email(),
            "logo_url": f"https://placehold.co/200?text={nombre_empresa[:2]}",
            "configuracion": {"moneda": "CLP", "notificaciones": True},
            "nombre_rep": fake.name(),
            "rut_rep": generar_rut_chileno(),
            "activo": True
        })

        # B. Credenciales SII 
        data_final["credenciales"].append({
            "empresa_id": comp_id,
            "sii_rut": generar_rut_chileno(),
            "sii_email": fake.email(),
            "sii_password": "clave_sii_secreta"
        })

        # C. Sucursales
        data_final["sucursales"].append({
            "id": str(uuid.uuid4()),
            "empresa_id": comp_id,
            "direccion": fake.street_address(),
            "comuna": fake.city(),
            "ciudad": random.choice(ciudades_principales),
            "telefono_sucursal": fake.phone_number(),
            "es_casa_matriz": True
        })

    # --- AUDITORÍA ---
    relaciones_existentes = set()
    for u_id in user_ids:
        if random.random() > 0.5:
            num_asignaciones = random.randint(1, 3)
            empresas_a_asignar = random.sample(company_ids, min(num_asignaciones, len(company_ids)))
            for e_id in empresas_a_asignar:
                if (u_id, e_id) not in relaciones_existentes:
                    data_final["audita"].append({"usuario_id": u_id, "empresa_id": e_id})
                    relaciones_existentes.add((u_id, e_id))

    return data_final

if __name__ == "__main__":
    try:
        datos = generar_todo()
        with open(RUTA_FINAL, "w", encoding="utf-8") as archivo:
            json.dump(datos, archivo, indent=4, ensure_ascii=False)
        print(f"✅ Búnker de datos actualizado en: {RUTA_FINAL}")
    except Exception as e:
        print(f"❌ Error: {e}")