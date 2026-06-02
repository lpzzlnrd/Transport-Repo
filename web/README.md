# NexusCore Systems — Sistema Web de Logística y Optimización de Talento

Aplicación web del **Proyecto IV de Programación Matemática** (Universidad José
Antonio Páez). Resuelve dos tipos de problemas y los analiza con IA:

- **Parte I — Transporte:** Esquina Noroeste, Costo Mínimo y Aproximación de Vogel.
- **Parte II — Asignación:** Método Húngaro (paso a paso).
- **Parte III — IA + PDF:** análisis con la API de Groq y exportación a PDF.

Construido con **HTML + CSS + JavaScript vanilla, SIN librerías ni build.**
Se abre con doble clic en `index.html`.

---

## 1. Cómo ejecutarlo

1. Abre `web/index.html` en cualquier navegador moderno.
2. Ya vienen cargados los **casos base del enunciado**. Puedes editarlos o pulsar
   *Generar cuadrícula* para crear matrices de otro tamaño.
3. Pulsa *Resolver transporte* / *Resolver asignación* para ver los pasos.
4. (Opcional) Pega tu **API Key de Groq**, pulsa *Optimizar y Analizar* y luego
   *Exportar PDF*.

> El análisis de IA requiere una clave de [GroqCloud](https://console.groq.com).
> Todo lo demás funciona sin conexión.

---

## 2. Arquitectura Hexagonal (Ports & Adapters)

El código se organiza en **tres capas concéntricas**. La regla de oro: las capas
externas dependen de las internas, **nunca al revés**. El núcleo (dominio) no
sabe que existe un navegador ni Groq.

```
                ┌─────────────────────────────────────────┐
                │           INFRAESTRUCTURA                 │
                │  (adaptadores concretos + interfaz web)   │
                │                                           │
                │   ┌───────────────────────────────────┐  │
                │   │           APLICACIÓN              │  │
                │   │   (casos de uso + puertos)        │  │
                │   │                                   │  │
                │   │      ┌───────────────────────┐    │  │
                │   │      │       DOMINIO         │    │  │
                │   │      │  (reglas de negocio   │    │  │
                │   │      │   puras: algoritmos)  │    │  │
                │   │      └───────────────────────┘    │  │
                │   └───────────────────────────────────┘  │
                └─────────────────────────────────────────┘
```

### 2.1 Dominio (`dominio/`) — el núcleo puro

Reglas de negocio sin ninguna dependencia de tecnología. Se podría copiar a un
servidor Node, a otra app, etc., sin cambiar nada.

| Archivo | Contiene |
|---|---|
| `ProblemaTransporte.js` | Entidad `ProblemaTransporte` + objeto de valor `ResultadoTransporte`. Valida datos, equilibra (origen/destino ficticio) y resuelve por los 3 métodos. |
| `ProblemaAsignacion.js` | Entidad `ProblemaAsignacion` + servicio `MetodoHungaro`. Resuelve la asignación óptima con todos los pasos. |

### 2.2 Aplicación (`aplicacion/`) — orquestación + contratos

| Archivo | Contiene |
|---|---|
| `puertos.js` | **Puertos** (interfaces): `PuertoAnalisisIA`, `PuertoReporte`. Definen *qué* necesita la app del exterior, no *cómo*. |
| `casosDeUso.js` | `CasosDeUso`: coordina dominio + puertos (resolver, analizar, exportar). Recibe los adaptadores por **inyección de dependencias**. |

### 2.3 Infraestructura (`infraestructura/`) — adaptadores + UI

| Archivo | Rol |
|---|---|
| `adaptadores/AdaptadorGroq.js` | Implementa `PuertoAnalisisIA` con `fetch` a la API de Groq. |
| `adaptadores/AdaptadorReportePDF.js` | Implementa `PuertoReporte` con `window.print()` (PDF sin librerías). |
| `ui/Vista.js` | Único responsable del DOM: pinta cuadrículas, lee inputs, renderiza resultados. |
| `ui/Controlador.js` | Adaptador conductor + **composition root**: instancia los adaptadores, los inyecta y enlaza los eventos a los casos de uso. |
| `ui/datosPorDefecto.js` | Casos de prueba base del enunciado. |
| `estilos/estilos.css` | Estilos + reglas `@media print` para el PDF. |

**¿Por qué hexagonal?** Si mañana cambias Groq por otra IA, solo creas un nuevo
adaptador que implemente `PuertoAnalisisIA`; el dominio y los casos de uso no se
tocan. Lo mismo si reemplazas la web por una CLI: cambias la capa de
infraestructura y reutilizas todo el núcleo.

---

## 3. Cómo funciona cada algoritmo

### Transporte
1. **Equilibrado:** si oferta ≠ demanda, se crea un origen/destino *ficticio*
   con costo 0 (validado en vivo en la web).
2. **Esquina Noroeste:** asigna desde la celda superior izquierda avanzando.
3. **Costo Mínimo:** asigna siempre en la celda activa de menor costo.
4. **Vogel:** usa penalizaciones (diferencia de los 2 costos más bajos) para
   priorizar; suele dar el mejor resultado.

### Método Húngaro
1. **Reducción por filas** (resta el mínimo de cada fila).
2. **Reducción por columnas** (resta el mínimo de cada columna).
3. **Asignación de ceros** por *matching* bipartito (caminos de aumento).
4. Si no alcanza, **ajuste de matriz** (cobertura mínima de líneas — teorema de
   König) para crear nuevos ceros, y se repite hasta lograr la asignación óptima.

---

## 4. Verificación

Los algoritmos se probaron con los casos del enunciado y casos límite:

- Transporte balanceado (caso PDF): Vogel = **6900** (≤ Costo Mínimo ≤ Esquina NO).
- Húngaro (caso PDF): costo **38**, confirmado óptimo por fuerza bruta.
- Húngaro que requiere ajustes (Paso 3): correcto vs. fuerza bruta.
- Transporte desbalanceado: añade ficticio y marca `balanceado = false`.
- Validaciones: matriz no cuadrada / valores negativos lanzan error claro.

---

## 5. Nota sobre el módulo de consola

El archivo `problema_transporte.py` (en la raíz del repo) es la versión Python
original del Método Húngaro y **no forma parte de la web**; se mantiene intacto.
La web reimplementa la lógica en JavaScript con arquitectura hexagonal.
