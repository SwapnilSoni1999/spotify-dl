FROM buildkite/puppeteer

RUN wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | apt-key add -

RUN apt update && \
    apt install -y  \
    ffmpeg && \
    rm -rf /var/lib/apt/lists/*

RUN mkdir /app

WORKDIR /app
COPY . .
ENTRYPOINT ["spotifydl"]
CMD ["--help"]
