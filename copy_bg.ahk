; AutoHotkey v1 Script to Copy Background Image
#NoEnv
SetWorkingDir %A_ScriptDir%

SourcePath := "C:\Users\maxme\Downloads\SBS - Seamless Space Backgrounds - Large 1024x1024 (1)\Large 1024x1024\Starfields\Starfield_06-1024x1024.png"
DestPath := "c:\wamp64\www\This is the God of Idle RPGs\img\Texture Floor\Starfield_06-1024x1024.png"

FileCopy, %SourcePath%, %DestPath%, 1

if (ErrorLevel)
    MsgBox, 16, Error, Failed to copy file.`nSource: %SourcePath%`nDest: %DestPath%
else
    MsgBox, 64, Success, Background image copied successfully!
