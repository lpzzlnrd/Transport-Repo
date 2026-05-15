from copy import deepcopy


class ProblemaTransporte:

    #metodo para privatizar las variables del sistema
    def __init__(self):
        self.__origenes = ["Origen 1", "Origen 2", "Origen 3"]
        self.__destinos = ["Destino A", "Destino B", "Destino C", "Destino D"]
        self.__ofertas = [500, 700, 600]
        self.__demandas = [600, 300, 400, 500]
        self.__costos = [
            [45, 80, 75, 65],
            [60, 50, 48, 52],
            [90, 85, 60, 70],
        ]

        #metodo para obtener los datos del problema
    def obtener_datos(self):
        return {
            "origenes": deepcopy(self.__origenes),
            "destinos": deepcopy(self.__destinos),
            "ofertas": deepcopy(self.__ofertas),
            "demandas": deepcopy(self.__demandas),
            "costos": deepcopy(self.__costos),
        }

    #metodo para obtener la resolucion del problema
    def obtener_resolucion(self):
        origenes, destinos, ofertas, demandas, costos = self.__equilibrar_problema()

        solucion_esquina = self.__resolver_esquina_noroeste(origenes, destinos, ofertas, demandas, costos)
        solucion_minimo = self.__resolver_costo_minimo(origenes, destinos, ofertas, demandas, costos)
        solucion_vogel = self.__resolver_vogel(origenes, destinos, ofertas, demandas, costos)

        return { #retorna un diccinario
            "balanceado": self.__es_balanceado(),
            "origenes": origenes,
            "destinos": destinos,
            "esquina_noroeste": solucion_esquina,
            "costo_minimo": solucion_minimo,
            "vogel": solucion_vogel,
        }

    def imprimir_resumen(self):
        resolucion = self.obtener_resolucion()

        print("Problema balanceado:", "Sí" if resolucion["balanceado"] else "No")
        print()

        self.__imprimir_solucion("Método de la Esquina Noroeste", resolucion["esquina_noroeste"])
        self.__imprimir_solucion("Método del Costo Mínimo", resolucion["costo_minimo"])
        self.__imprimir_solucion("Método de Aproximación de Vogel", resolucion["vogel"])

        mejor_metodo = min(
            [
                ("Esquina Noroeste", resolucion["esquina_noroeste"]["costo_total"]),
                ("Costo Mínimo", resolucion["costo_minimo"]["costo_total"]),
                ("Vogel", resolucion["vogel"]["costo_total"]),
            ],
            key=lambda elemento: elemento[1], #se usa un lambda para ordenar un valor como el minimo
        )

        print("Método con menor costo:", mejor_metodo[0])
        print("Costo más bajo:", mejor_metodo[1])

    def __es_balanceado(self):
        return sum(self.__ofertas) == sum(self.__demandas)

    def __equilibrar_problema(self):
        origenes = deepcopy(self.__origenes)
        destinos = deepcopy(self.__destinos)
        ofertas = deepcopy(self.__ofertas)
        demandas = deepcopy(self.__demandas)
        costos = deepcopy(self.__costos)

        total_oferta = sum(ofertas)
        total_demanda = sum(demandas)

        if total_oferta > total_demanda:
            diferencia = total_oferta - total_demanda
            destinos.append("Destino ficticio")
            demandas.append(diferencia)
            for fila in costos:
                fila.append(0)
        elif total_demanda > total_oferta:
            diferencia = total_demanda - total_oferta
            origenes.append("Origen ficticio")
            ofertas.append(diferencia)
            costos.append([0 for _ in destinos])

        return origenes, destinos, ofertas, demandas, costos

    def __resolver_esquina_noroeste(self, origenes, destinos, ofertas, demandas, costos):
        ofertas_restantes = ofertas[:]
        demandas_restantes = demandas[:]
        asignaciones = []
        costo_total = 0

        i = 0
        j = 0
        while i < len(origenes) and j < len(destinos):
            cantidad = min(ofertas_restantes[i], demandas_restantes[j])
            if cantidad > 0:
                asignaciones.append((origenes[i], destinos[j], cantidad, costos[i][j]))
                costo_total += cantidad * costos[i][j]

            ofertas_restantes[i] -= cantidad
            demandas_restantes[j] -= cantidad

            if ofertas_restantes[i] == 0 and demandas_restantes[j] == 0:
                i += 1
                j += 1
            elif ofertas_restantes[i] == 0:
                i += 1
            else:
                j += 1

        return {"asignaciones": asignaciones, "costo_total": costo_total}

    def __resolver_costo_minimo(self, origenes, destinos, ofertas, demandas, costos):
        ofertas_restantes = ofertas[:]
        demandas_restantes = demandas[:]
        filas_activas = [True] * len(origenes)
        columnas_activas = [True] * len(destinos)
        asignaciones = []
        costo_total = 0

        while True:
            mejor_fila = -1
            mejor_columna = -1
            menor_costo = None

            for i in range(len(origenes)):
                if not filas_activas[i]:
                    continue
                for j in range(len(destinos)):
                    if not columnas_activas[j]:
                        continue
                    costo_actual = costos[i][j]
                    if menor_costo is None or costo_actual < menor_costo:
                        menor_costo = costo_actual
                        mejor_fila = i
                        mejor_columna = j

            if menor_costo is None:
                break

            cantidad = min(ofertas_restantes[mejor_fila], demandas_restantes[mejor_columna])
            asignaciones.append(
                (origenes[mejor_fila], destinos[mejor_columna], cantidad, costos[mejor_fila][mejor_columna])
            )
            costo_total += cantidad * costos[mejor_fila][mejor_columna]

            ofertas_restantes[mejor_fila] -= cantidad
            demandas_restantes[mejor_columna] -= cantidad

            if ofertas_restantes[mejor_fila] == 0:
                filas_activas[mejor_fila] = False
            if demandas_restantes[mejor_columna] == 0:
                columnas_activas[mejor_columna] = False

        return {"asignaciones": asignaciones, "costo_total": costo_total}

    def __resolver_vogel(self, origenes, destinos, ofertas, demandas, costos):
        ofertas_restantes = ofertas[:]
        demandas_restantes = demandas[:]
        filas_activas = [True] * len(origenes)
        columnas_activas = [True] * len(destinos)
        asignaciones = []
        costo_total = 0

        while True:
            if not any(filas_activas) or not any(columnas_activas):
                break

            penalizacion_filas = self.__calcular_penalizaciones_filas(costos, filas_activas, columnas_activas)
            penalizacion_columnas = self.__calcular_penalizaciones_columnas(costos, filas_activas, columnas_activas)

            mayor_penalizacion = -1
            tipo_seleccion = None
            indice_seleccionado = -1

            for indice, penalizacion in enumerate(penalizacion_filas):
                if penalizacion > mayor_penalizacion:
                    mayor_penalizacion = penalizacion
                    tipo_seleccion = "fila"
                    indice_seleccionado = indice

            for indice, penalizacion in enumerate(penalizacion_columnas):
                if penalizacion > mayor_penalizacion:
                    mayor_penalizacion = penalizacion
                    tipo_seleccion = "columna"
                    indice_seleccionado = indice

            if tipo_seleccion == "fila":
                fila = indice_seleccionado
                columna = self.__buscar_menor_costo_en_fila(costos, fila, columnas_activas)
            else:
                columna = indice_seleccionado
                fila = self.__buscar_menor_costo_en_columna(costos, columna, filas_activas)

            cantidad = min(ofertas_restantes[fila], demandas_restantes[columna])
            asignaciones.append((origenes[fila], destinos[columna], cantidad, costos[fila][columna]))
            costo_total += cantidad * costos[fila][columna]

            ofertas_restantes[fila] -= cantidad
            demandas_restantes[columna] -= cantidad

            if ofertas_restantes[fila] == 0:
                filas_activas[fila] = False
            if demandas_restantes[columna] == 0:
                columnas_activas[columna] = False

        return {"asignaciones": asignaciones, "costo_total": costo_total}

    def __calcular_penalizaciones_filas(self, costos, filas_activas, columnas_activas):
        penalizaciones = []
        for i in range(len(costos)):
            if not filas_activas[i]:
                penalizaciones.append(-1)
                continue

            costos_fila = []
            for j in range(len(costos[i])):
                if columnas_activas[j]:
                    costos_fila.append(costos[i][j])

            costos_fila.sort()
            if len(costos_fila) >= 2:
                penalizaciones.append(costos_fila[1] - costos_fila[0])
            elif len(costos_fila) == 1:
                penalizaciones.append(costos_fila[0])
            else:
                penalizaciones.append(-1)

        return penalizaciones

    def __calcular_penalizaciones_columnas(self, costos, filas_activas, columnas_activas):
        penalizaciones = []
        for j in range(len(costos[0])):
            if not columnas_activas[j]:
                penalizaciones.append(-1)
                continue

            costos_columna = []
            for i in range(len(costos)):
                if filas_activas[i]:
                    costos_columna.append(costos[i][j])

            costos_columna.sort()
            if len(costos_columna) >= 2:
                penalizaciones.append(costos_columna[1] - costos_columna[0])
            elif len(costos_columna) == 1:
                penalizaciones.append(costos_columna[0])
            else:
                penalizaciones.append(-1)

        return penalizaciones

    def __buscar_menor_costo_en_fila(self, costos, fila, columnas_activas):
        menor_costo = None
        mejor_columna = -1
        for j in range(len(costos[fila])):
            if not columnas_activas[j]:
                continue
            costo_actual = costos[fila][j]
            if menor_costo is None or costo_actual < menor_costo:
                menor_costo = costo_actual
                mejor_columna = j
        return mejor_columna

    def __buscar_menor_costo_en_columna(self, costos, columna, filas_activas):
        menor_costo = None
        mejor_fila = -1
        for i in range(len(costos)):
            if not filas_activas[i]:
                continue
            costo_actual = costos[i][columna]
            if menor_costo is None or costo_actual < menor_costo:
                menor_costo = costo_actual
                mejor_fila = i
        return mejor_fila

    def __imprimir_solucion(self, nombre_metodo, solucion): #salida de datos
        print(nombre_metodo)
        for origen, destino, cantidad, costo_unitario in solucion["asignaciones"]:
            print(f"  {origen} -> {destino}: {cantidad} unidades a costo {costo_unitario}")
        print(f"  Costo total: {solucion['costo_total']}")
        print()


if __name__ == "__main__":
    problema = ProblemaTransporte()
    problema.imprimir_resumen()
