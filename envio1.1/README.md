# Sistema de Pesaje con Servidor de Datos

Este proyecto implementa una balanza inteligente utilizando un **ESP32**, que integra múltiples periféricos para la gestión de pesaje, visualización y almacenamiento de datos con capacidad de descarga inalámbrica.

##  Hardware Integrado

*   **ESP32**: Microcontrolador principal con conectividad Wi-Fi.
*   **Celda de Carga**: Sensor de peso de alta precisión.
*   **Pantalla OLED**: Interfaz visual para mostrar peso y estado.
*   **Reloj RTC**: Módulo de tiempo real para el registro de fecha y hora.
*   **Teclado Matricial 4x4**: Para interacción y entrada de comandos.
*   **Buzzer y 2 LEDs**: Indicadores de alertas y estados del sistema.

##  Conectividad y Descarga de Datos

El sistema actúa como un punto de acceso (Access Point), permitiendo descargar los datos desde la app los registros almacenados sin necesidad de una red externa.

1.  **Red Wi-Fi (SSID):** `Balanza`
2.  **Contraseña:** `12345678`
3.  **Acceso Web:** Navega a la IP `192.168.4.1/data`

Al acceder a la app movil se vera un boton que hara la descarga automática de un archivo llamado **`data.csv`**, el cual contiene el historial completo de todos los registros realizados hasta la fecha.

##  Formato de Exportación

Los datos se exportan en formato **CSV**, compatible con Excel, Google Sheets y otras herramientas de análisis:

*   **Nombre del archivo:** `data.csv`
*   **Contenido:** Se guarda el código de vaca, peso, fecha, hora, turno(am/pm).
   **Ejemplo:** `23,4.20,8/1/2026,4:17,AM`
