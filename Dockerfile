FROM alpine

RUN apk add \
    npm \
    ffmpeg
RUN npm install -g spotify-dl
## uncomment this for local testing
# COPY ./ /usr/local/lib/node_modules/spotify-dl/ 
WORKDIR /download
ENTRYPOINT ["spotifydl"]
CMD ["--help"]
