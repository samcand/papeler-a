# Libros incluidos en la app

Los libros de esta carpeta se cargan solos en la **Biblioteca** de cada usuario
la primera vez que abre la app, y sus citas bíblicas aparecen en la Guía del
pasaje ("En tu biblioteca").

Para agregar uno:

1. Copia el archivo aquí (`.txt`, `.md`, `.html`, `.epub` o `.docx`).
2. Añádelo a `indice.json`:

```json
[
  { "id": "matthew-henry-romanos", "archivo": "matthew-henry-romanos.txt",
    "titulo": "Comentario a Romanos", "autor": "Matthew Henry",
    "licencia": "Dominio público", "version": 1 }
]
```

Sube `version` cuando cambies el archivo, para que se vuelva a indexar.

Incluye solo obras de dominio público o con permiso de distribución. Los libros
con derechos de autor que tengas puedes importarlos tú mismo desde la pantalla
Biblioteca: quedan solo en tu dispositivo.
