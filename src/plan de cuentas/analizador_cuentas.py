import pandas as pd
import os
import sys

# Forzar salida en utf-8
sys.stdout.reconfigure(encoding='utf-8')
DIRECTORIO_BASE = os.path.dirname(os.path.abspath(__file__))

def procesar_planes_dinamico():
    print("==================================================")
    print(f"⚙️ BUSCANDO ARCHIVOS EN: {DIRECTORIO_BASE}")
    print("==================================================")

    # Listar absolutamente todos los archivos en la carpeta
    todos_los_archivos = os.listdir(DIRECTORIO_BASE)
    print(f"Archivos detectados: {todos_los_archivos}\n")
    
    archivo_normal = None
    archivo_ifrs = None

    for nombre_archivo in todos_los_archivos:
        nombre_upper = nombre_archivo.upper()
        
        # Ignorar este mismo script de Python y los archivos limpios que generemos
        if nombre_archivo.endswith(".py") or "LIMPIO" in nombre_upper:
            continue
            
        # Identificar IFRS y Normal por su nombre
        if "IFRS" in nombre_upper:
            archivo_ifrs = os.path.join(DIRECTORIO_BASE, nombre_archivo)
        elif "PLAN" in nombre_upper or "CUENTAS" in nombre_upper:
            archivo_normal = os.path.join(DIRECTORIO_BASE, nombre_archivo)

    # Validar que encontramos ambos
    if not archivo_normal or not archivo_ifrs:
        print("[ERROR] No se encontraron los dos archivos necesarios (Normal e IFRS).")
        return

    print(f"📂 Plan Normal detectado : {os.path.basename(archivo_normal)}")
    print(f"📂 Plan IFRS detectado   : {os.path.basename(archivo_ifrs)}")
    print("--------------------------------------------------")

    # Función robusta: intenta leer como CSV primero (por si es un falso .xls) y luego como Excel
    def leer_documento(ruta):
        try:
            return pd.read_csv(ruta, sep=',', encoding='utf-8')
        except:
            try:
                return pd.read_excel(ruta)
            except Exception as e:
                print(f"[ERROR] No se pudo leer {os.path.basename(ruta)}: {e}")
                return None

    df_normal = leer_documento(archivo_normal)
    df_ifrs = leer_documento(archivo_ifrs)

    if df_normal is None or df_ifrs is None:
        return

    # Limpiar espacios en blanco invisibles en los códigos (columna 0)
    col_normal = df_normal.columns[0]
    col_ifrs = df_ifrs.columns[0]
    
    df_normal[col_normal] = df_normal[col_normal].astype(str).str.strip()
    df_ifrs[col_ifrs] = df_ifrs[col_ifrs].astype(str).str.strip()

    # 1. Guardar el Plan Normal limpio
    salida_normal = os.path.join(DIRECTORIO_BASE, "Plan_Limpio_Normal.csv")
    df_normal.to_csv(salida_normal, sep=';', index=False, encoding='utf-8-sig')
    print(f"✔️ Plan Normal generado: {len(df_normal)} cuentas -> {os.path.basename(salida_normal)}")

    # 2. Guardar el Plan IFRS limpio
    salida_ifrs = os.path.join(DIRECTORIO_BASE, "Plan_Limpio_IFRS.csv")
    df_ifrs.to_csv(salida_ifrs, sep=';', index=False, encoding='utf-8-sig')
    print(f"✔️ Plan IFRS generado: {len(df_ifrs)} cuentas -> {os.path.basename(salida_ifrs)}")

    print("==================================================")
    print("✅ ¡PROCESO COMPLETADO EXITOSAMENTE!")
    print("==================================================")

if __name__ == "__main__":
    procesar_planes_dinamico()