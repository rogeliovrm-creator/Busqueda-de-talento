# NBG Talent Outreach v8 — Firebase + GitHub + Vercel

Esta versión conecta **prospección, casting, capturas de cancelación y las plantillas editables** con Firebase. Conserva el botón para abrir un perfil y registrarlo como "Contactado (abierto)", importación CSV, exclusión de duplicados y exportación de respaldos. **No envía mensajes automáticos ni descarga listas de seguidores de Instagram.**

## 1. Crea el proyecto gratuito

1. Abre https://console.firebase.google.com y entra con tu cuenta de Google.
2. Pulsa **Crear un proyecto** y usa, por ejemplo, `nbg-talent-outreach` (elige un nombre libre). Puedes desactivar Analytics para mantenerlo sencillo.
3. Mantén el plan **Spark (sin costo)**; no añadas tarjeta bancaria ni vincules facturación.
4. En **Compilación / Build > Authentication > Comenzar > Método de acceso**, habilita **Google**. Selecciona el correo de soporte del proyecto y guarda.
5. En **Compilación / Build > Firestore Database > Crear base de datos**, elige edición **Standard**, base `(default)` y modo **producción** (no modo de prueba); selecciona una región y confirma. La región de la base no se puede cambiar fácilmente después.

## 2. Protege tus registros con reglas de Firestore

1. Abre **Firestore Database > Reglas / Rules**.
2. Copia **todo** el contenido del archivo `firestore.rules` incluido en el ZIP.
3. En ese texto cambia `CAMBIA_POR_TU_CORREO@gmail.com` por **el mismo correo de Google** con el que entrarás en la página, entre comillas. Ejemplo: `['correo@empresa.com']`.
4. Pulsa **Publicar**. Sin este paso, nadie podrá leer ni guardar los perfiles. No uses reglas que permitan lectura a cualquier persona (`allow read, write: if true`).
5. Para agregar a un compañero, añádelo a la lista del archivo de reglas: `['correo1@empresa.com', 'correo2@empresa.com']`, publica de nuevo y pídele que entre con esa cuenta de Google.

**Seguridad:** el nombre de usuario y las capturas de casting son información sensible para tu operación. La configuración pública de Firebase no sustituye a las reglas de seguridad. Nunca subas claves de una *cuenta de servicio* ni contraseñas a GitHub.

## 3. Conecta el proyecto a esta página

1. Firebase Console > ⚙ **Configuración del proyecto** > sección **Tus apps**.
2. Registra una app **Web (</>)** si no tienes una y copia el objeto de configuración `firebaseConfig` que muestra Firebase.
3. **En este paquete configurado, `firebase-config.js` ya contiene los valores de tu app web `nbg-talent-outreach` que aparecen en tu captura. No es necesario volver a copiarlos.**
4. Sube juntos `index.html`, `firebase-config.js` y `firebase-sync.js` al directorio raíz de tu sitio.

La `apiKey` de la app web es un identificador público **no es una contraseña**. La seguridad depende de las reglas anteriores. La sincronización necesita abrir la página desde un dominio HTTPS autorizado (Vercel o Firebase Hosting); no funcionará simplemente al abrir `index.html` como archivo local.

## 4. Sube a GitHub y Vercel

1. Descomprime el ZIP.
2. En tu repositorio de GitHub, sube **estos archivos al nivel raíz**: `index.html`, `firebase-sync.js`, `firebase-config.js`. Puedes añadir los archivos de documentación. **No subas solamente `index.html`**, porque la sincronización depende de los otros dos archivos JS.
3. En https://vercel.com usa **Add New > Project**, importa el repositorio y selecciona **Framework Preset: Other**, sin comando de compilación. Publica con **Deploy**.
4. En Firebase > **Authentication > Settings/Configuración > Authorized domains/Dominios autorizados**, agrega el dominio de tu sitio Vercel, por ejemplo `nbg-talent.vercel.app` (solo el dominio, sin `https://` ni barras). Si tienes dominio propio, agrégalo también.
5. Abre tu URL de Vercel y pulsa **Iniciar sesión con Google**. Debe aparecer `Firebase conectado` y tu correo. Si sale **Permiso denegado**, revisa el correo autorizado y las reglas.

Puedes seguir publicando cambios desde GitHub a Vercel sin modificar tus datos de Firestore.

## 4B. Alternativa totalmente gratuita para uso empresarial: Firebase Hosting

El plan gratuito Vercel Hobby solo permite uso **personal o no comercial**. Como NBG Talent Outreach es para reclutamiento empresarial, para mantener el hosting sin costo es mejor publicar el HTML también en **Firebase Hosting Spark** (sujeto a su cuota de 360 MB transferidos al día y 10 GB alojados). Puedes mantener el código en GitHub.

1. Descarga el ZIP y descomprímelo en una carpeta local.
2. Instala Node.js si todavía no lo tienes: https://nodejs.org .
3. Abre una terminal en la carpeta que contiene `index.html` y `firebase.json`.
4. Ejecuta `npx firebase-tools login` y entra con el Google administrador del proyecto.
5. Despliega con `npx firebase-tools deploy --only hosting,firestore --project TU_PROJECT_ID`, reemplazando `TU_PROJECT_ID` por el **ID** exacto del proyecto Firebase. Lee las reglas antes de desplegarlas.
6. El comando te devolverá una URL como `https://TU_PROJECT_ID.web.app`. Abre esa dirección e inicia sesión con Google. Firebase reconoce sus propios dominios de Hosting por defecto; si usas uno personalizado, autorízalo en Authentication.

Este camino evita depender de Vercel Hobby para una actividad comercial. Conecta al **mismo Firestore** y mantiene exactamente los mismos datos en todos los dispositivos.

## 5. Pasa tus datos de la versión 7 a Firebase (una sola vez)

**NO borres la página anterior ni su almacenamiento local antes de migrar.**

- Por seguridad, en la v7 exporta **CSV de prospección** y **JSON de casting con capturas**.
- Si usabas la v7 en **la misma URL de Vercel**, al abrir la v8 allí la página hace una copia local de seguridad y muestra el botón **↑ Migrar datos del navegador** después de entrar a Firebase. Úsalo **una sola vez**. La migración importa los perfiles que todavía no existan en la nube y no vuelve a poner los contactos en pendientes.
- Si utilizabas la v7 como archivo en tu computadora o desde otra URL, el navegador tratará ambos sitios como distintos: **no puede leer su almacenamiento local anterior**. En ese caso, importa tu CSV y tu JSON **desde la página v8 una vez conectado a Firebase**.
- El JSON de casting puede incluir imágenes grandes: al importar capturas antiguas que excedan el límite gratuito tendrás que volver a adjuntarlas (la v8 comprime automáticamente las nuevas).
- Si existen registros con el mismo usuario en Firebase, prevalece la versión de la nube durante la migración; los perfiles repetidos no se crearán de nuevo.

## 6. Úsala en cualquier dispositivo

1. Abre **la misma dirección Vercel** en Android, iPhone o computadora.
2. Inicia sesión con un Google **autorizado en las reglas**.
3. Se cargarán los perfiles, castings y plantillas de Firestore. Los cambios aparecerán en otros dispositivos conectados.
4. Al cambiar el estado de un perfil, desaparece de «Por contactar» en todos los dispositivos.
5. Se recomienda exportar respaldos CSV y JSON periódicamente: el plan gratuito de Firestore no incluye copias administradas automáticas.

**Importante:** las imágenes se guardan comprimidas en documentos de Firestore, no en Cloud Storage (que requiere Blaze). Cada imagen nueva se comprime para ocupar menos de ~400 KB. Demasiadas capturas pueden agotar los 1 GiB de almacenamiento gratuito. Si llegas a una cuota, Spark limita el servicio en vez de generar cobros inesperados.

## 7. Problemas comunes

| Síntoma | Revisión |
|---|---|
| «Firebase aún no está configurado» | Completar `firebase-config.js` y subirlo a GitHub. |
| «Permiso denegado» | Revisar `firestore.rules`, publicar y entrar con el correo autorizado. |
| Error `auth/unauthorized-domain` | Agregar tu dominio Vercel en Authentication > Authorized domains. |
| «Modo local» después de entrar | Refrescar la página y revisar la conexión a internet. |
| Los datos viejos no aparecen | Usar la migración de la misma URL o importar CSV y JSON desde la v7. |
| No se puede guardar una captura vieja | Comprimir o volver a adjuntar la imagen con la herramienta de la v8. |
| Dos usuarios cambian el mismo perfil al mismo tiempo | El último cambio confirmado puede prevalecer. Coordinar la edición simultánea. |

## Costos y límites (consultados el 6 de noviembre de 2026)

- **Firebase Authentication con Google:** disponible sin costo para este uso habitual.
- **Firestore Spark:** 1 GiB almacenado, 50,000 lecturas/día, 20,000 escrituras/día, 20,000 eliminaciones/día; 10 GiB de salida/mes (pueden cambiar).
- **Cloud Storage for Firebase:** desde el 3 de febrero de 2026 requiere Blaze; por eso **esta versión no lo utiliza**.
- **Vercel Hobby:** no permite uso comercial, así que para NBG recomendamos **Firebase Hosting Spark** o un plan Vercel comercial.
- **Firebase Hosting Spark:** 10 GB almacenados y 360 MB de transferencia diarios sin costo, sujetos a cambios.

Fuentes oficiales:
- https://firebase.google.com/pricing
- https://firebase.google.com/docs/projects/billing/firebase-pricing-plans
- https://firebase.google.com/docs/storage/faqs-storage-changes-announced-sept-2024
- https://firebase.google.com/docs/firestore/quotas
- https://firebase.google.com/docs/auth/web/google-signin

- https://vercel.com/legal/terms
