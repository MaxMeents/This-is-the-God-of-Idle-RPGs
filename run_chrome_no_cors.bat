@echo off
REM Launch Chrome with CORS disabled for local development
"C:\Program Files\Google\Chrome\Application\chrome.exe" --disable-web-security --user-data-dir="%TEMP%\chrome_dev" --allow-file-access-from-files
