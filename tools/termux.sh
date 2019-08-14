#!/data/data/com.termux/files/usr/bin/bash

echo "[ spotifydl ] Installing required packages..."

# Install packages
pkg install -y nodejs ffmpeg

# Get spotify-dl from npmjs
echo "[ spotifydl ] Installing spotify-dl"
npm install -g spotify-dl

# Setup app sharing script
echo "[ spotifydl ] Setting up scripts..."

if [ ! -d "$HOME/bin" ]; then
    mkdir "$HOME/bin"
fi

curl https://gist.githubusercontent.com/SwapnilSoni1999/e163a8c380e1cdfa65cecbf71972a579/raw/c270edd7634a88f710a735f4a5ac4cb93ad50b11/termux-url-opener-spotifydl > "$HOME/bin/termux-url-opener"

echo "[ spotifydl ] Setting up storage..."
termux-setup-storage

echo "Sucess!"
echo "You can now share song from Spotify App to Termux and Music will be downloaded."
exit 0
