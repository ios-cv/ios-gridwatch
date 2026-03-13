FROM golang:1.23.5

WORKDIR /usr/src/gridwatch

copy go.mod go.sum ./
RUN go mod download

copy . .
RUN go build -v -o /usr/local/bin/gridwatch ./...

CMD ["gridwatch"]