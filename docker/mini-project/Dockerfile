# Multi-stage build - the real reason Docker + a compiled language like Go
# is such a common production pairing. The build stage has the full Go
# toolchain (hundreds of MB); the final stage copies out ONLY the compiled
# binary into a minimal base image. The result: a final image a fraction of
# the size of the build environment, with no language runtime, package
# manager, or source code shipped to production at all.

FROM golang:1.22-alpine AS builder
WORKDIR /app
COPY go.mod .
RUN go mod tidy
COPY main.go .
# CGO_ENABLED=0 produces a fully static binary - no shared libraries to
# worry about matching in the final minimal image.
RUN CGO_ENABLED=0 GOOS=linux go build -o visitcounter .

FROM alpine:3.20
WORKDIR /app
COPY --from=builder /app/visitcounter .
EXPOSE 4000
CMD ["./visitcounter"]
