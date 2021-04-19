FROM debian:unstable

RUN apt-get update && apt-get install --no-install-recommends --assume-yes npm ffmpeg && rm -rf /var/lib/apt/lists/*
RUN npm install -g spotify-dl
## uncomment this for local testing
# COPY ./ /usr/local/lib/node_modules/spotify-dl/ 
WORKDIR /download
ENTRYPOINT ["spotifydl"]
CMD ["--help"]
