Coloca aquí el certificado CA que te da Aiven al crear tu servicio MySQL,
con el nombre exacto: ca.pem

Dónde lo consigues en Aiven:
  Consola de Aiven -> tu servicio MySQL -> pestaña "Overview"
  -> sección "Connection information" -> botón "CA certificate" (descargar)

Una vez que pongas el archivo ca.pem en esta carpeta, el backend detecta su
presencia automáticamente (ver app/core/cfg_database.py) y lo usa para
conectarse por SSL. No es información secreta, es un certificado público,
así que es seguro subirlo al repositorio.

Si corres el backend en local contra tu MySQL local (sin SSL), simplemente
no pongas ningún archivo aquí y todo sigue funcionando igual que antes.
