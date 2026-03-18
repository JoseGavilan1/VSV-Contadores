"""
Script de Limpieza Total (Opción Nuclear)
Este script se conecta a Supabase y borra TODOS los registros de TODAS las tablas,
dejando la base de datos completamente en blanco pero manteniendo la estructura intacta.
"""
import os
import psycopg2
from dotenv import load_dotenv
import sys

# Forzar codificación UTF-8 en la consola
sys.stdout.reconfigure(encoding='utf-8')

# Cargar variables de entorno desde la raíz
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), '.env'))

DB_USER = os.getenv('DBS_USER')
DB_PASSWORD = os.getenv('DBS_PASSWORD')
DB_HOST = os.getenv('DBS_HOST')
DB_PORT = os.getenv('DBS_PORT', '6543')
DB_DATABASE = os.getenv('DBS_DATABASE')

def limpiar_base_de_datos():
    conn = None
    try:
        print("⚠️ ADVERTENCIA: Iniciando secuencia de borrado total...")
        
        # Conexión a la base de datos
        conn = psycopg2.connect(
            user=DB_USER, 
            password=DB_PASSWORD, 
            host=DB_HOST, 
            port=DB_PORT, 
            database=DB_DATABASE
        )
        cur = conn.cursor()
        
        # Ejecutar el borrado en cascada
        print("🗑️  Vaciando tablas (usuario, empresa, plan, servicio, sessions y dependencias)...")
        cur.execute("TRUNCATE TABLE usuario, empresa, plan, servicio, sessions CASCADE;")
        
        # Confirmar los cambios
        conn.commit()
        
        print("✅ ¡ÉXITO! La base de datos ha sido vaciada completamente.")
        print("La estructura (columnas y tablas) sigue intacta, pero no hay ningún cliente ni usuario registrado.")
        
        cur.close()
        conn.close()

    except Exception as e:
        if conn:
            conn.rollback()
            conn.close()
        print(f"❌ ERROR AL LIMPIAR: {e}")

if __name__ == "__main__":
    # Pequeña medida de seguridad para evitar borrar por accidente
    confirmacion = input("¿Estás SEGURO de que quieres borrar TODA la base de datos? (escribe 'si' para continuar): ")
    if confirmacion.lower() == 'si':
        limpiar_base_de_datos()
    else:
        print("🛑 Operación cancelada. La base de datos está a salvo.")