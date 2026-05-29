from copy import deepcopy


# Guarda los datos de cada problema de asignacion
class ProblemaAsignacion:
    def __init__(self, nombre, trabajadores, tareas, costos, unidad):
        self.__nombre = nombre
        self.__trabajadores = trabajadores
        self.__tareas = tareas
        self.__costos = costos
        self.__unidad = unidad

    def obtener_nombre(self):
        return self.__nombre

    def obtener_unidad(self):
        return self.__unidad

    def obtener_trabajadores(self):
        return deepcopy(self.__trabajadores)

    def obtener_tareas(self):
        return deepcopy(self.__tareas)

    def obtener_costos(self):
        return deepcopy(self.__costos)


# Guarda y muestra la solucion final del problema
class ResultadoAsignacion:
    def __init__(self, problema, asignaciones, costo_total, pasos):
        self.__problema = problema
        self.__asignaciones = asignaciones
        self.__costo_total = costo_total
        self.__pasos = pasos

    def imprimir(self):
        print("=" * 70)
        print(self.__problema.obtener_nombre())
        print("=" * 70)
        print()
        self.__imprimir_matriz_original()
        self.__imprimir_pasos()
        self.__imprimir_asignaciones()
        self.__imprimir_conclusion()
        print()

    def __imprimir_matriz_original(self):
        print("Matriz original")
        self.__imprimir_matriz(self.__problema.obtener_costos())
        print()

    def __imprimir_pasos(self):
        for paso in self.__pasos:
            print(paso["titulo"])
            self.__imprimir_matriz(paso["matriz"])
            if paso.get("detalle"):
                print(paso["detalle"])
            print()

    def __imprimir_asignaciones(self):
        print("Asignacion optima")
        for trabajador, tarea, costo in self.__asignaciones:
            print(f"{trabajador} -> {tarea}: {costo} {self.__problema.obtener_unidad()}")
        print(f"Costo minimo total: {self.__costo_total} {self.__problema.obtener_unidad()}")
        print()

    def __imprimir_conclusion(self):
        print("Conclusion")
        print(
            "La asignacion encontrada minimiza el costo total porque cada trabajador "
            "queda unido a una sola tarea y se selecciona una combinacion de ceros "
            "independientes despues de las reducciones del metodo hungaro."
        )

    def __imprimir_matriz(self, matriz):
        tareas = self.__problema.obtener_tareas()
        ancho = 14
        print("".ljust(ancho), end="")
        for tarea in tareas:
            print(tarea.rjust(ancho), end="")
        print()

        trabajadores = self.__problema.obtener_trabajadores()
        for indice, fila in enumerate(matriz):
            print(trabajadores[indice].ljust(ancho), end="")
            for valor in fila:
                print(str(valor).rjust(ancho), end="")
            print()


# Aplica el metodo hungaro para minimizar costos
class MetodoHungaro:
    def resolver(self, problema):
        matriz_original = problema.obtener_costos()
        self.__validar_matriz(matriz_original)

        matriz = deepcopy(matriz_original)
        pasos = []

        self.__reducir_filas(matriz)
        pasos.append({"titulo": "Paso 1: reduccion por filas", "matriz": deepcopy(matriz)})

        self.__reducir_columnas(matriz)
        pasos.append({"titulo": "Paso 2: reduccion por columnas", "matriz": deepcopy(matriz)})

        asignacion = self.__buscar_asignacion_completa(matriz)

        while asignacion is None:
            cobertura = self.__obtener_cobertura_minima(matriz)
            self.__ajustar_matriz(matriz, cobertura)
            detalle = (
                f"Lineas usadas: {len(cobertura['filas']) + len(cobertura['columnas'])}. "
                f"Filas cubiertas: {self.__formatear_indices(cobertura['filas'])}. "
                f"Columnas cubiertas: {self.__formatear_indices(cobertura['columnas'])}."
            )
            pasos.append({"titulo": "Paso 3: ajuste de la matriz", "matriz": deepcopy(matriz), "detalle": detalle})
            asignacion = self.__buscar_asignacion_completa(matriz)

        trabajadores = problema.obtener_trabajadores()
        tareas = problema.obtener_tareas()
        asignaciones = []
        costo_total = 0

        for fila, columna in sorted(asignacion.items()):
            costo = matriz_original[fila][columna]
            asignaciones.append((trabajadores[fila], tareas[columna], costo))
            costo_total += costo

        return ResultadoAsignacion(problema, asignaciones, costo_total, pasos)

    def __validar_matriz(self, matriz):
        if not matriz or len(matriz) != len(matriz[0]):
            raise ValueError("El metodo hungaro requiere una matriz cuadrada")

        tamano = len(matriz)
        for fila in matriz:
            if len(fila) != tamano:
                raise ValueError("Todas las filas deben tener el mismo tamano")

    def __reducir_filas(self, matriz):
        # Resta el menor valor de cada fila
        for fila in matriz:
            menor = min(fila)
            for columna in range(len(fila)):
                fila[columna] -= menor

    def __reducir_columnas(self, matriz):
        # Resta el menor valor de cada columna
        tamano = len(matriz)
        for columna in range(tamano):
            menor = min(matriz[fila][columna] for fila in range(tamano))
            for fila in range(tamano):
                matriz[fila][columna] -= menor

    def __buscar_asignacion_completa(self, matriz):
        emparejamiento = self.__emparejar_ceros(matriz)
        if len(emparejamiento) != len(matriz):
            return None
        return {fila: columna for columna, fila in emparejamiento.items()}

    def __emparejar_ceros(self, matriz):
        tamano = len(matriz)
        emparejamiento = {}

        for fila in range(tamano):
            visitadas = set()
            self.__intentar_emparejar(fila, matriz, visitadas, emparejamiento)

        return emparejamiento

    def __intentar_emparejar(self, fila, matriz, visitadas, emparejamiento):
        for columna, valor in enumerate(matriz[fila]):
            if valor != 0 or columna in visitadas:
                continue

            visitadas.add(columna)
            if columna not in emparejamiento or self.__intentar_emparejar(
                emparejamiento[columna], matriz, visitadas, emparejamiento
            ):
                emparejamiento[columna] = fila
                return True

        return False

    def __obtener_cobertura_minima(self, matriz):
        tamano = len(matriz)
        emparejamiento = self.__emparejar_ceros(matriz)
        filas_emparejadas = set(emparejamiento.values())
        filas_visitadas = {fila for fila in range(tamano) if fila not in filas_emparejadas}
        columnas_visitadas = set()

        cambio = True
        while cambio:
            cambio = False

            for fila in list(filas_visitadas):
                for columna, valor in enumerate(matriz[fila]):
                    if valor == 0 and columna not in columnas_visitadas:
                        columnas_visitadas.add(columna)
                        cambio = True

            for columna in list(columnas_visitadas):
                if columna in emparejamiento and emparejamiento[columna] not in filas_visitadas:
                    filas_visitadas.add(emparejamiento[columna])
                    cambio = True

        filas_cubiertas = set(range(tamano)) - filas_visitadas
        columnas_cubiertas = columnas_visitadas
        return {"filas": filas_cubiertas, "columnas": columnas_cubiertas}

    def __ajustar_matriz(self, matriz, cobertura):
        # Crea nuevos ceros cuando no existe asignacion completa
        tamano = len(matriz)
        no_cubiertos = []

        for fila in range(tamano):
            for columna in range(tamano):
                if fila not in cobertura["filas"] and columna not in cobertura["columnas"]:
                    no_cubiertos.append(matriz[fila][columna])

        menor = min(no_cubiertos)

        for fila in range(tamano):
            for columna in range(tamano):
                fila_cubierta = fila in cobertura["filas"]
                columna_cubierta = columna in cobertura["columnas"]

                if not fila_cubierta and not columna_cubierta:
                    matriz[fila][columna] -= menor
                elif fila_cubierta and columna_cubierta:
                    matriz[fila][columna] += menor

    def __formatear_indices(self, indices):
        if not indices:
            return "ninguna"
        return ", ".join(str(indice + 1) for indice in sorted(indices))


# Carga los dos ejercicios del enunciado
class ProyectoProgramacionMatematica:
    def __init__(self):
        self.__problemas = [
            ProblemaAsignacion(
                "Problema 1: contratacion de programadores para tareas",
                ["Programador 1", "Programador 2", "Programador 3", "Programador 4"],
                ["Tarea 1", "Tarea 2", "Tarea 3", "Tarea 4"],
                [
                    [10, 15, 9, 7],
                    [14, 18, 12, 11],
                    [6, 14, 12, 8],
                    [9, 13, 14, 10],
                ],
                "miles de USD",
            ),
            ProblemaAsignacion(
                "Problema 2: asignacion de programadores a modulos",
                ["Programador 1", "Programador 2", "Programador 3"],
                ["Modulo 1", "Modulo 2", "Modulo 3"],
                [
                    [12, 9, 10],
                    [10, 8, 11],
                    [13, 11, 10],
                ],
                "horas",
            ),
        ]

    def ejecutar(self):
        metodo = MetodoHungaro()
        for problema in self.__problemas:
            resultado = metodo.resolver(problema)
            resultado.imprimir()


if __name__ == "__main__":
    proyecto = ProyectoProgramacionMatematica()
    proyecto.ejecutar()
