# Test-only server built from the official RELEASE.2025-10-15T17-29-55Z source.
# No MinIO registry image or registry credentials are required.
FROM golang:1.24.8-alpine@sha256:3d78beb141d98f42337f1252ecf2a5f20374109929a4c3f6817f9e4179cc0ae5 AS builder

RUN apk add --no-cache ca-certificates git
WORKDIR /src
RUN git init . \
    && git fetch --depth=1 https://github.com/minio/minio.git 9e49d5e7a648f00e26f2246f4dc28e6b07f8c84a \
    && git checkout --detach FETCH_HEAD \
    && test "$(git rev-parse HEAD)" = "9e49d5e7a648f00e26f2246f4dc28e6b07f8c84a"
ENV CGO_ENABLED=0 GOTOOLCHAIN=local
RUN go build -mod=readonly -p=2 -trimpath -ldflags="-s -w" -o /out/minio .

FROM alpine:3.22@sha256:49340b346798875b5592e5d420241f2f9cfba5f47e62ebb1446a1b34734e898f
RUN apk add --no-cache ca-certificates \
    && addgroup -S -g 10001 minio \
    && adduser -S -D -u 10001 -G minio minio \
    && mkdir /data \
    && chown minio:minio /data
COPY --from=builder /out/minio /usr/local/bin/minio
COPY --from=builder /src/LICENSE /usr/share/licenses/minio/LICENSE
LABEL org.opencontainers.image.source="https://github.com/minio/minio" \
      org.opencontainers.image.revision="9e49d5e7a648f00e26f2246f4dc28e6b07f8c84a"
ENV MINIO_BROWSER=off
USER 10001:10001
EXPOSE 9000
ENTRYPOINT ["minio"]
CMD ["server", "/data"]
