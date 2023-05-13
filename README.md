# Electron Build Instructions

## macOS Builds

For macOS builds, the `electron-builder.js` file needs to be added to the root of the application folder. Also, the following line should be added to the `build` section of the `package.json` file:

```json
"aftersign": "electron-builder.js"
```

## Windows Builds

For Windows builds, the `electron-builder.js` file should be removed, as well as the reference to it in the `package.json` file, before attempting to build the Windows application. If not removed, the build process will fail.
