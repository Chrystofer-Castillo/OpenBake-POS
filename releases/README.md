# 📦 OpenBake-POS — Carpeta de Releases

Aquí se depositan automáticamente los ejecutables generados:
- **Windows:** `OpenBake-POS_Setup_x64.exe` / `.msi`
- **Linux:** `.deb` / `.AppImage`

### Cómo compilar y colocar el .exe aquí:
1. En Windows, haz doble clic en `compilar-exe.bat` o corre:
   ```bash
   npm run build:release
   ```
2. El script compilará la app y moverá automáticamente los ejecutables a esta carpeta listos para subir a GitHub Releases.
