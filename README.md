macOS Builds: The 'electron-builder.js' file needs to be added to the root of the application folder. Also, "aftersign": "electron-builder.js" should be added to the 'build' section of the package.json file. 

Windows Builds: The 'electron-builder.js' file should be removed as well as the reference to it in package.json before Windows application build is attempted, or else it will fail.