"""
VSV CONTADORES - Generador de Plan de Cuentas (Solo CSV - SIN BD)
Lee los JSON de Noviembre y Diciembre y fabrica un Plan de Cuentas a medida en Excel.
"""
import json
import csv
import os
import glob
import sys

sys.stdout.reconfigure(encoding='utf-8')
DIRECTORIO_BASE = os.path.dirname(os.path.abspath(__file__))

def generar_plan_cuentas():
    print("==================================================")
    print("🔍 CREANDO PLAN DE CUENTAS (SOLO CSV - SIN TOCAR BD)")
    print("==================================================")

    # Buscar los archivos JSON de Noviembre y Diciembre
    patron = os.path.join(DIRECTORIO_BASE, "RCV_Super_Extraccion_*.json")
    archivos = glob.glob(patron)
    
    if not archivos:
        print("[ERROR] No se encontraron los archivos JSON.")
        return

    proveedores = {}
    
    # Leer las compras para extraer a quiénes les compraste realmente
    for archivo in archivos:
        with open(archivo, 'r', encoding='utf-8') as f:
            data = json.load(f)
            
        if "compras" in data and isinstance(data["compras"], dict):
            registro = data["compras"].get("Registro", {})
            if isinstance(registro, dict) and "detalles" in registro and isinstance(registro["detalles"], dict):
                for tipo_doc, lista_docs in registro["detalles"].items():
                    for doc in lista_docs:
                        rut = doc.get("RUT Emisor", doc.get("Rut Emisor", ""))
                        razon = doc.get("Razón Social Emisor", doc.get("Razon Social Emisor", ""))
                        if rut and rut != "Razon Soc. Emisor":
                            proveedores[rut] = razon

    print(f"✅ Se encontraron {len(proveedores)} proveedores únicos en tus compras.")

    # Estructura Base del Plan de Cuentas (Activos, Pasivos, Ventas)
    plan_de_cuentas = [
        ["Código Cuenta", "Nombre de la Cuenta", "Tipo"],
        ["1104", "Deudores por Ventas (Clientes)", "Activo"],
        ["1105", "IVA Crédito Fiscal", "Activo"],
        ["2101", "Proveedores Nacionales", "Pasivo"],
        ["2104", "IVA Débito Fiscal", "Pasivo"],
        ["4101", "Ingresos por Ventas", "Ganancia"],
        ["4201-01", "Costo de Mercadería", "Pérdida"]
    ]

    # Clasificador automático de Gastos según tus proveedores reales
    for rut, razon in proveedores.items():
        razon_upper = razon.upper()
        if "FLOW" in razon_upper:
            plan_de_cuentas.append(["4201-03", f"Comisiones Bancarias ({razon[:15]})", "Pérdida"])
        elif "BPO ADVISORS" in razon_upper:
            plan_de_cuentas.append(["4201-04", f"Asesorías Profesionales ({razon[:15]})", "Pérdida"])
        elif "LANDSKRON" in razon_upper or "MARCELO" in razon_upper:
            plan_de_cuentas.append(["4201-05", f"Honorarios ({razon[:15]})", "Pérdida"])
        elif "SUBSECRETARIA" in razon_upper:
            plan_de_cuentas.append(["4201-12", f"Gastos Legales y Trámites ({razon[:15]})", "Pérdida"])
        else:
            plan_de_cuentas.append(["4201-99", f"Gastos Generales - {razon[:15]}", "Pérdida"])

    # Agregar la cuenta general por defecto para futuras compras que no conozcamos
    plan_de_cuentas.append(["4201-99", "Gastos Generales Varios (Otros)", "Pérdida"])

    # Escribir el CSV
    ruta_csv = os.path.join(DIRECTORIO_BASE, "Mi_Plan_de_Cuentas_Real.csv")
    with open(ruta_csv, mode='w', newline='', encoding='utf-8-sig') as f:
        writer = csv.writer(f, delimiter=';')
        writer.writerows(plan_de_cuentas)

    print(f"📁 ¡Éxito! Tu Plan de Cuentas se ha guardado en:\n{ruta_csv}")
    print("Puedes abrirlo con Excel y ajustarlo a tu gusto. No se tocó la base de datos.")

if __name__ == "__main__":
    generar_plan_cuentas()