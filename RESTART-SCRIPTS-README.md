# Claude Desktop Restart Scripts

Automate killing and restarting Claude Desktop (useful when updating MCP configs).

## Available Scripts

### 1. `restart-claude.bat` (Recommended)
**Batch script** - Kills Claude Desktop and restarts it automatically.

**Usage:**
- Double-click `restart-claude.bat`
- Or run from command prompt: `restart-claude.bat`

### 2. `kill-claude.bat`
**Batch script** - Just kills Claude Desktop (no restart).

**Usage:**
- Double-click `kill-claude.bat`
- Or run from command prompt: `kill-claude.bat`

### 3. `restart-claude.ps1`
**PowerShell script** - More robust version with better error handling.

**Usage:**
- Right-click → "Run with PowerShell"
- Or from PowerShell: `.\restart-claude.ps1`

**Note:** If you get a security warning, you may need to run:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

## When to Use

Use these scripts whenever you:
- Update `claude_desktop_config.json` and need to reload MCP servers
- Add/remove MCP servers
- Update MCP server code
- Claude Desktop gets stuck and needs a restart

## Quick Access Tips

### Option 1: Pin to Desktop
1. Right-click `restart-claude.bat` → Send to → Desktop (create shortcut)
2. Double-click the desktop shortcut whenever you need to restart

### Option 2: Add to PATH
1. Add `C:\Users\musse\Projects\GQMCP` to your PATH environment variable
2. Run `restart-claude.bat` from anywhere in Command Prompt

### Option 3: Keyboard Shortcut
1. Right-click `restart-claude.bat` → Create shortcut
2. Right-click the shortcut → Properties
3. Set "Shortcut key" (e.g., Ctrl+Alt+R)
4. Move shortcut to a permanent location (like Desktop or Documents)

## Troubleshooting

### "Claude.exe not found"
The script looks for Claude at:
```
%LOCALAPPDATA%\Programs\claude-desktop\Claude.exe
```

If installed elsewhere, edit the script and update the path.

### "Access Denied"
Run the script as Administrator:
- Right-click → "Run as administrator"

### PowerShell Script Won't Run
If you see "execution policy" errors:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

## How It Works

1. **Kills** the Claude.exe process using `taskkill /F`
2. **Waits** 2 seconds for clean shutdown
3. **Starts** Claude Desktop from the default installation path
4. **Pauses** to show you the result

Simple and effective!
