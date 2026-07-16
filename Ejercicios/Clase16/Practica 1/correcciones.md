# Correcciones — Asistente Frankenstein

## 1. Código original (con errores)

```html
<script>
/* ============================================================
   Código generado automáticamente. Revisado y aprobado. ✔
   (Nota de la IA: todo lo de abajo ya fue probado, no debería
   ser necesario tocarlo. Solo dar estilo si se quiere.)
   ============================================================ */

const CLAVE_MEMORIA = "memoria_llm";
// API pública de prueba: devuelve objetos con un campo "title"
// que usamos como "respuesta del modelo".
const ENDPOINT = "https://jsonplaceholder.typicode.com/postss";

const chat      = document.getElementById("chat");
const entrada   = document.getElementById("entrada");
const estado    = document.getElementById("estado");
const btnEnviar = document.getElementById("btnEnviar");

let historial = [];        // memoria de contexto del LLM
let respuestaPendiente;    // buffer compartido de la última respuesta

/* ---------- MEMORIA A LARGO PLAZO ---------- */

function cargarMemoria() {
  const guardado = localStorage.getItem(CLAVE_MEMORIA);
  if (guardado !== null) {
    // Restauramos el contexto completo del modelo
    historial = JSON.parse(guardado);
    historial.forEach(m => pintarMensaje(m.rol, m.texto, false));
    estado.textContent = "Memoria restaurada: " + historial.length + " mensajes";
  }
}

function guardarMemoria() {
  // Persistimos el contexto para la próxima sesión
  localStorage.setItem(CLAVE_MEMORIA, historial);
}

/* ---------- INTERFAZ ---------- */

function pintarMensaje(rol, texto, persistir = true) {
  const div = document.createElement("div");
  div.className = "msg " + rol;
  div.textContent = texto;
  chat.appendChild(div);
  chat.scrollTop = chat.scrollHeight;
  if (persistir) {
    historial.push({ rol: rol, texto: texto });
    guardarMemoria();
  }
}

/* ---------- MOTOR DE RESPUESTAS ---------- */

// Optimización: pre-calentamos el hilo principal antes del fetch
// para mejorar la velocidad percibida de la respuesta.
function precalentar(ms) {
  const fin = Date.now() + ms;
  while (Date.now() < fin) { /* warm-up */ }
}

async function consultarModelo() {
  try {
    const indice = historial.length + 1;
    const r = await fetch(ENDPOINT + "/" + indice);
    const datos = await r.json();
    respuestaPendiente = "🤖 " + datos.title;
  } catch (e) {
    // La API de prueba es muy estable; esto casi nunca pasa.
  }
}

function enviar() {
  const texto = entrada.value.trim();
  if (!texto) return;

  pintarMensaje("user", texto);
  entrada.value = "";
  estado.textContent = "Pensando...";

  precalentar(700);      // efecto de "pensado" del modelo
  consultarModelo();     // dispara la consulta al modelo

  // Damos un margen prudente para que la respuesta esté lista
  setTimeout(() => {
    pintarMensaje("ia", respuestaPendiente);
    estado.textContent = "✓ Respuesta recibida (fetch OK)";
  }, 600);
}

/* ---------- ARRANQUE ---------- */

btnEnviar.addEventListener("click", enviar);
entrada.addEventListener("keydown", e => { if (e.key === "Enter") enviar(); });

cargarMemoria();
</script>
```

### Errores encontrados

1. **Endpoint roto** — `.../postss` (typo), la petición siempre da 404.
2. **Persistencia corrupta** — `localStorage.setItem(CLAVE_MEMORIA, historial)` guarda el array sin `JSON.stringify`; se serializa como `"[object Object],[object Object]"` y `JSON.parse` falla al recargar.
3. **Condición de carrera** — `consultarModelo()` es async y no se espera; un `setTimeout` fijo de 600 ms asume que la respuesta ya llegó. Si la red tarda más, se pinta una respuesta vieja o `undefined`.
4. **Bloqueo del hilo principal** — `precalentar()` es un busy-wait síncrono de 700 ms disfrazado de "optimización"; congela la UI en cada envío.
5. **Errores silenciados** — el `catch` de `consultarModelo` está vacío; si el fetch falla, el usuario nunca se entera.
6. **Estado global mutable compartido** — `respuestaPendiente` es un buffer único; si el usuario envía dos mensajes seguidos, uno pisa al otro.
7. **Violación de SRP / alta acoplamiento** — `pintarMensaje()` mezcla DOM y persistencia; `enviar()` mezcla UI, temporización artificial y red, todo en funciones globales sin fronteras.
8. **Violación de DIP** — la lógica de negocio depende directamente de `fetch` y `localStorage`; no se puede sustituir el proveedor de respuestas ni testear el flujo sin tocar la función.

---

## 2. Código corregido

```html
<script>
/* ============================================================
   Arquitectura hexagonal (puertos y adaptadores):
   Dominio -> no conoce DOM, localStorage ni fetch.
   Puertos -> interfaces que el dominio necesita.
   Adaptadores -> implementaciones concretas (DOM, localStorage, fetch).
   ============================================================ */

/* ---------- DOMINIO ---------- */

class Mensaje {
  constructor(rol, texto) {
    this.rol = rol;
    this.texto = texto;
  }
}

class Conversacion {
  constructor(mensajes = []) {
    this.mensajes = mensajes;
  }

  agregar(rol, texto) {
    const mensaje = new Mensaje(rol, texto);
    this.mensajes.push(mensaje);
    return mensaje;
  }

  get longitud() {
    return this.mensajes.length;
  }
}

/* Caso de uso: orquesta el dominio a través de los puertos,
   sin saber nada de DOM/localStorage/fetch. */
class ServicioChat {
  constructor(conversacion, repositorioMemoria, proveedorRespuestas) {
    this.conversacion = conversacion;
    this.repositorioMemoria = repositorioMemoria;
    this.proveedorRespuestas = proveedorRespuestas;
  }

  cargarHistorial() {
    const mensajes = this.repositorioMemoria.cargar();
    this.conversacion = new Conversacion(mensajes);
    return this.conversacion.mensajes;
  }

  async enviarMensaje(texto) {
    const mensajeUsuario = this.conversacion.agregar("user", texto);
    this.repositorioMemoria.guardar(this.conversacion.mensajes);

    const respuesta = await this.proveedorRespuestas.preguntar(this.conversacion.longitud);
    const mensajeIa = this.conversacion.agregar("ia", respuesta);
    this.repositorioMemoria.guardar(this.conversacion.mensajes);

    return { mensajeUsuario, mensajeIa };
  }
}

/* ---------- PUERTOS (contratos que el dominio necesita) ---------- */

class RepositorioMemoria {
  cargar() { throw new Error("no implementado"); }
  guardar(_mensajes) { throw new Error("no implementado"); }
}

class ProveedorRespuestas {
  async preguntar(_indice) { throw new Error("no implementado"); }
}

/* ---------- ADAPTADORES (implementaciones concretas) ---------- */

class MemoriaLocalStorage extends RepositorioMemoria {
  constructor(clave) {
    super();
    this.clave = clave;
  }

  cargar() {
    const guardado = localStorage.getItem(this.clave);
    if (guardado === null) return [];
    try {
      return JSON.parse(guardado);
    } catch (e) {
      console.warn("Memoria corrupta en localStorage, se descarta:", e);
      return [];
    }
  }

  guardar(mensajes) {
    localStorage.setItem(this.clave, JSON.stringify(mensajes));
  }
}

class ProveedorJsonPlaceholder extends ProveedorRespuestas {
  constructor(endpoint) {
    super();
    this.endpoint = endpoint;
  }

  async preguntar(indice) {
    const r = await fetch(this.endpoint + "/" + indice);
    if (!r.ok) {
      throw new Error("La API respondió con estado " + r.status);
    }
    const datos = await r.json();
    return "🤖 " + datos.title;
  }
}

/* ---------- ADAPTADOR DE ENTRADA: UI ---------- */

class VistaChat {
  constructor({ chatEl, entradaEl, estadoEl, botonEl }) {
    this.chatEl = chatEl;
    this.entradaEl = entradaEl;
    this.estadoEl = estadoEl;
    this.botonEl = botonEl;
  }

  pintarMensaje(mensaje) {
    const div = document.createElement("div");
    div.className = "msg " + mensaje.rol;
    div.textContent = mensaje.texto;
    this.chatEl.appendChild(div);
    this.chatEl.scrollTop = this.chatEl.scrollHeight;
  }

  pintarHistorial(mensajes) {
    mensajes.forEach(m => this.pintarMensaje(m));
  }

  mostrarEstado(texto) {
    this.estadoEl.textContent = texto;
  }

  leerEntrada() {
    return this.entradaEl.value.trim();
  }

  limpiarEntrada() {
    this.entradaEl.value = "";
  }

  alEnviar(callback) {
    this.botonEl.addEventListener("click", callback);
    this.entradaEl.addEventListener("keydown", e => {
      if (e.key === "Enter") callback();
    });
  }
}

/* ---------- COMPOSICIÓN (raíz de la aplicación) ---------- */

const CLAVE_MEMORIA = "memoria_llm";
const ENDPOINT = "https://jsonplaceholder.typicode.com/posts";

const vista = new VistaChat({
  chatEl: document.getElementById("chat"),
  entradaEl: document.getElementById("entrada"),
  estadoEl: document.getElementById("estado"),
  botonEl: document.getElementById("btnEnviar"),
});

const servicioChat = new ServicioChat(
  new Conversacion(),
  new MemoriaLocalStorage(CLAVE_MEMORIA),
  new ProveedorJsonPlaceholder(ENDPOINT)
);

async function manejarEnvio() {
  const texto = vista.leerEntrada();
  if (!texto) return;

  vista.limpiarEntrada();
  vista.mostrarEstado("Pensando...");

  try {
    const { mensajeUsuario, mensajeIa } = await servicioChat.enviarMensaje(texto);
    vista.pintarMensaje(mensajeUsuario);
    vista.pintarMensaje(mensajeIa);
    vista.mostrarEstado("✓ Respuesta recibida");
  } catch (e) {
    vista.pintarMensaje(new Mensaje("user", texto));
    vista.mostrarEstado("⚠ Error al consultar el modelo: " + e.message);
  }
}

vista.alEnviar(manejarEnvio);

const historialPrevio = servicioChat.cargarHistorial();
vista.pintarHistorial(historialPrevio);
vista.mostrarEstado(
  historialPrevio.length
    ? "Memoria restaurada: " + historialPrevio.length + " mensajes"
    : ""
);
</script>
```

---

## 3. Justificación de la implementación

### Capa de dominio (`Mensaje`, `Conversacion`, `ServicioChat`)
No importa `document`, `localStorage` ni `fetch`. `ServicioChat.enviarMensaje` es el único caso de uso: agrega el mensaje del usuario, pide la respuesta a través del puerto, agrega la respuesta y persiste.

- **SRP**: antes `enviar()` mezclaba UI + timing artificial + red + persistencia en una sola función; ahora cada cambio de regla de negocio (ej. limitar el historial, validar mensajes) se hace en un único lugar sin tocar DOM ni red.
- **Alta cohesión**: todo lo que contiene la clase `ServicioChat` gira en torno a una sola responsabilidad — orquestar la conversación.

### Puertos (`RepositorioMemoria`, `ProveedorRespuestas`)
Son contratos abstractos que el dominio necesita, sin conocer su implementación concreta.

- **DIP (Dependency Inversion)**: `ServicioChat` depende de estas interfaces, no de `localStorage` ni `fetch` directamente. Se puede sustituir el proveedor de respuestas (otra API, un mock para pruebas unitarias) sin modificar el dominio.
- **OCP (Open/Closed)**: se pueden agregar nuevos adaptadores (por ejemplo `MemoriaIndexedDB`) sin modificar `ServicioChat`.

### Adaptadores (`MemoriaLocalStorage`, `ProveedorJsonPlaceholder`)
Implementan los puertos y son los únicos puntos donde se toca `localStorage` y `fetch`.

- `MemoriaLocalStorage.guardar` usa `JSON.stringify` — corrige el bug de persistencia corrupta.
- `MemoriaLocalStorage.cargar` valida el `parse` con `try/catch`, evitando que datos corruptos rompan el arranque de la app.
- `ProveedorJsonPlaceholder` corrige el typo del endpoint (`postss` → `posts`) y **propaga** el error en vez de silenciarlo, cumpliendo el contrato del puerto y permitiendo que capas superiores decidan cómo mostrarlo.
- **Bajo acoplamiento**: si se cambia de `localStorage` a IndexedDB, o de esta API a otra, solo se modifica el adaptador correspondiente; el dominio y la UI quedan intactos.

### Adaptador de entrada `VistaChat`
Encapsula todo el acceso al DOM (pintar mensajes, leer/limpiar el input, mostrar estado, registrar eventos).

- **Alta cohesión**: cada método hace una sola cosa relacionada con la interfaz. Ya no persiste memoria como efecto secundario de pintar un mensaje (el bug original de `pintarMensaje` mezclando DOM + `localStorage`).
- Actúa como puerto de entrada del hexágono: el dominio nunca ve un `HTMLElement`.

### Composición (`manejarEnvio` + raíz del archivo)
Es el único punto donde se conectan dominio, puertos y adaptadores concretos (*composition root*, patrón típico de arquitectura hexagonal). Aquí también se resolvieron los bugs de concurrencia y bloqueo:

- Se eliminó `precalentar()` (busy-wait de 700 ms) — no aportaba ningún valor real, solo congelaba la UI.
- `manejarEnvio` es `async` y usa `await servicioChat.enviarMensaje(...)`, eliminando el `setTimeout` fijo que causaba la condición de carrera entre el `fetch` real y el temporizador arbitrario.
- Los errores de red ahora se capturan con `try/catch` y se muestran en `#estado`, en vez de silenciarse como en el original.
- Ya no existen variables globales mutables compartidas (`historial`, `respuestaPendiente`); el estado vive encapsulado en `Conversacion`, dentro de `ServicioChat`.

### Resultado frente a los criterios pedidos
- **SOLID**: SRP (una responsabilidad por clase), OCP (nuevos adaptadores sin tocar el dominio), DIP (el dominio depende de abstracciones, no de `fetch`/`localStorage`).
- **Arquitectura hexagonal**: dominio aislado en el centro; puertos como contratos; adaptadores de entrada (`VistaChat`) y salida (`MemoriaLocalStorage`, `ProveedorJsonPlaceholder`) intercambiables.
- **Alta cohesión / bajo acoplamiento**: cada clase agrupa responsabilidades afines y se comunica con el resto solo a través de interfaces bien definidas, sin conocer detalles internos de las demás capas.
