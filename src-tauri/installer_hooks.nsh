; Custom NSIS installer hooks for mkVideo.
;
; The main purpose of this file is to work around a Windows quirk where
; Explorer / Start Menu / Taskbar keep showing the OLD application icon
; after a reinstall. Windows caches per-EXE icons in
;   %LOCALAPPDATA%\IconCache.db
;   %LOCALAPPDATA%\Microsoft\Windows\Explorer\IconCacheToRemove
; and only rebuilds that cache when the cached file's modification time
; or hash no longer matches the on-disk EXE.
;
; Replacing the EXE in place updates the modification time, but the
; per-user cache file is NOT automatically invalidated. The result is
; that the user keeps seeing the previous install's icon until they
; sign out, run `ie4uinit.exe -show`, or delete the cache file
; manually.
;
; We invalidate the cache from the installer so the user sees the new
; icon immediately after the install finishes — no manual steps
; required. The post-uninstall hook does the same so removing and
; reinstalling the app also picks up any future icon change cleanly.

!macro NSIS_HOOK_POSTINSTALL
  ; Refresh the user's icon cache so the new EXE icon is picked up
  ; by Explorer, the Start Menu and the Taskbar. Requires no
  ; elevation: each operation touches only the current user's profile.
  SetShellVarContext current

  ; 1. Mark the per-user icon cache for deletion. Windows will rebuild
  ;    it the next time Explorer needs an icon.
  ;
  ;    Windows 10/11 keep a per-user icon cache at
  ;    %LOCALAPPDATA%\IconCache.db. Replacing the EXE in place
  ;    updates its modification time but does NOT invalidate the
  ;    cached thumbnail, so Explorer keeps showing the previous
  ;    install's icon until sign-out / cache rebuild.
  ;
  ;    We try a plain Rename first (no /REBOOTOK flag — NSIS's
  ;    Rename accepts /REBOOTOK but only when the file is locked,
  ;    and we want the common case to succeed synchronously).
  ;    If Rename fails (file held by Explorer), we ignore the
  ;    error code: Explorer releases the handle on the next cache
  ;    lookup and the new icon then takes effect.
  StrCpy $0 "$LOCALAPPDATA\IconCache.db"
  IfFileExists "$0" 0 skip_icon_cache_delete
    Rename "$0" "$0.old"
  skip_icon_cache_delete:

  ; 2. Notify Explorer to drop its in-memory icon cache.
  ;    SHCNE_ASSOCCHANGED (=0x08000000) flushes file-association
  ;    AND icon caches for the shell.
  System::Call 'Shell32::SHChangeNotify(i 0x08000000, i 0x0000, p 0, p 0)'

  ; 3. Refresh the per-user icon cache now. ie4uinit.exe -show is
  ;    the supported way to make Windows 10/11 rebuild the icon
  ;    thumbnails without a sign-out.
  ;    Errors are ignored: if ie4uinit is unavailable (very old
  ;    Windows), the cache will still be rebuilt on the next
  ;    sign-in, and our SHChangeNotify above has already kicked
  ;    the shell into refreshing its in-memory cache.
  ExecWait 'ie4uinit.exe -show' $1
!macroend

!macro NSIS_HOOK_POSTUNINSTALL
  ; Same icon-cache flush as the install path, so re-running the
  ; installer with a different icon also picks up immediately.
  SetShellVarContext current

  StrCpy $0 "$LOCALAPPDATA\IconCache.db"
  IfFileExists "$0" 0 skip_icon_cache_delete_un
    Rename "$0" "$0.old"
  skip_icon_cache_delete_un:

  System::Call 'Shell32::SHChangeNotify(i 0x08000000, i 0x0000, p 0, p 0)'
  ExecWait 'ie4uinit.exe -show' $1
!macroend

; The pre-install and pre-uninstall hooks are intentionally empty but
; declared so any future "do something before files are touched"
; behaviour has a clear home and doesn't require editing the JSON
; config again.

!macro NSIS_HOOK_PREINSTALL
!macroend

!macro NSIS_HOOK_PREUNINSTALL
!macroend