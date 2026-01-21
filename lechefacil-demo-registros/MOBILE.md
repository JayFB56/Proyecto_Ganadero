# LecheFacil Mobile Setup

## Configuración de Capacitor

Este proyecto está configurado para ser compilado como aplicación móvil nativa usando Capacitor.

## Requisitos previos

### Para Android:
- **Java JDK 11 o superior** (actualmente tienes Java 8)
- Android Studio (última versión)
- Android SDK instalado

Para actualizar Java en macOS:
```bash
brew install openjdk@17
sudo ln -sfn /opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk /Library/Java/JavaVirtualMachines/openjdk-17.jdk
```

### Para iOS:
- macOS
- Xcode (última versión)
- CocoaPods: `sudo gem install cocoapods`

## Scripts disponibles

```bash
# Compilar y sincronizar cambios a las plataformas móviles
npm run mobile:sync

# Abrir Android Studio para compilar y ejecutar la app
npm run mobile:android

# Abrir Xcode para compilar y ejecutar la app
npm run mobile:ios

# Ejecutar directamente en dispositivo/emulador Android
npm run mobile:run:android

# Ejecutar directamente en dispositivo/simulador iOS
npm run mobile:run:ios
```

## Plugins instalados

- **@capacitor/camera**: Acceso a la cámara del dispositivo
- **@capacitor/filesystem**: Manejo de archivos locales
- **@capacitor/preferences**: Almacenamiento de preferencias local

## Permisos configurados

### Android (AndroidManifest.xml):
- Internet
- Cámara
- Lectura/escritura de almacenamiento externo
- Lectura de imágenes

### iOS:
Los permisos se configuran en el archivo `Info.plist` al abrir Xcode.

## Pasos para compilar

### Android:

1. **Actualiza Java a versión 11 o superior**
2. Compila el proyecto web:
   ```bash
   npm run build
   ```
3. Sincroniza con Android:
   ```bash
   npx cap sync android
   ```
4. Abre Android Studio:
   ```bash
   npx cap open android
   ```
5. Compila y ejecuta desde Android Studio

### iOS:

1. Compila el proyecto web:
   ```bash
   npm run build
   ```
2. Instala dependencias de iOS:
   ```bash
   npx cap sync ios
   cd ios/App && pod install
   ```
3. Abre Xcode:
   ```bash
   npx cap open ios
   ```
4. Configura tu equipo de desarrollo en Xcode
5. Compila y ejecuta desde Xcode

## Flujo de desarrollo

1. Desarrolla normalmente con `npm run dev`
2. Cuando quieras probar en móvil:
   - Ejecuta `npm run mobile:sync`
   - Abre el IDE nativo (Android Studio o Xcode)
   - Compila y ejecuta en emulador/dispositivo

## Notas importantes

- El build se genera en la carpeta `dist/`
- Los cambios en el código web requieren sincronizar con `npx cap sync`
- Los cambios en configuración nativa requieren abrir el IDE correspondiente
- La primera compilación puede tardar varios minutos

## URLs y configuración

- La app usa el esquema `https://` para Android (más seguro)
- Configura tu API backend en las variables de entorno correspondientes
