# NBG Talent Outreach — versión 7

Sitio estático listo para publicar en GitHub y Vercel. No necesita instalar dependencias.

## Subir a GitHub
1. Crea un repositorio en GitHub (recomendado: **privado**).
2. Sube el archivo `index.html` en la raíz del repositorio. Puedes subir también este README.
3. Guarda los cambios (Commit changes).

## Publicar en Vercel
1. En Vercel, selecciona **Add New > Project**.
2. Importa el repositorio de GitHub.
3. Selecciona **Framework Preset: Other**, sin Build Command y con directorio raíz `/`.
4. Presiona **Deploy**.

## Datos y precauciones
- Los perfiles, plantillas y registros se guardan en **el navegador y dominio** de cada usuario (localStorage; las capturas pueden utilizar IndexedDB).
- Al pasar de una versión local (`file://`) al sitio de Vercel (`https://`), **los registros no se migran solos**. Antes de cambiar de sitio, exporta tu lista de contactos en CSV y los registros de casting (incluidas capturas) en JSON; después impórtalos desde el nuevo dominio.
- Publicar el sitio **no crea una base de datos en línea ni sincroniza usuarios/dispositivos**. Para eso se requiere un backend y autenticación.
- La imagen de instrucciones está incorporada dentro de `index.html`, por lo que **no necesitas cargarla por separado**.
- El botón de abrir un perfil registra su apertura para seguimiento, **no demuestra que se haya enviado un mensaje**.
