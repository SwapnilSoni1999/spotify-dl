FROM node:24

RUN wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | apt-key add -

RUN apt update && \
    apt install -y  \
    chromium \
    ffmpeg && \
    rm -rf /var/lib/apt/lists/*

## uncomment this for local testing
# COPY ./ /usr/local/lib/node_modules/spotify-dl/ 
RUN npm install -g spotify-dl

WORKDIR /download
ENTRYPOINT ["spotifydl"]
CMD ["--help"]
