# Frontend Blank Shell

This project is a stripped-down React + Vite + Capacitor setup that renders a blank surface. Mobile support (Capacitor) remains, everything else was removed.

## Prerequisites
- Node.js ≥ 20
- npm or yarn
- JDK 21.
- Android SDK/Platform Tools (`adb`).

## Setup
```sh
npm i          # or yarn
```

## Web
```sh
npm run dev
# build
npm run build
```

## Android (Capacitor)

Sync and run:
```sh
npm run mobile:run:android   # or yarn mobile:run:android
```


## Connect a physical Android device over Wi‑Fi (pairing code)
1) On the phone: enable Developer Options → Wireless debugging → Pair device with pairing code. Note IP:pairingPort and the 6‑digit code.  
2) In the terminal:
```sh
adb disconnect
adb pair <ip>:<pairingPort>   # enter the 6-digit code
adb devices                   # should list adb-... device
```
3) Connect for debugging (if another connect port is shown on the phone):
```sh
adb connect <ip>:<connectPort>
adb devices   # should show <ip>:port device
```
4) Run `yarn mobile:run:android` and pick the device when prompted.

Tip: if you need to reset USB auth, toggle USB debugging off/on and accept the RSA prompt, then repeat pairing.

# Capture of app web
![alt text](image.png)

![alt text](image-1.png)