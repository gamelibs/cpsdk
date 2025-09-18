build-copy.sh

Usage:

# run the script from repo root (it is executable)
./build-copy.sh

What it does:
- Creates a `build/` directory in the repo root
- Copies these files into `build/` while preserving directory structure:
  - index.html
  - src/wsdk-v4.4.js
  - src/main.js
  - src/cpsdk1.3.js
  - src/iframesdk1.0.js
  - game/index.html

Notes:
- The script exits with status 2 and prints missing files if any of the listed files are absent.
- You can edit the file list in `build-copy.sh` if you need additional files copied.
