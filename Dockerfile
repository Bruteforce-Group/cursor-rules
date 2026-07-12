# syntax=docker/dockerfile:1.7
FROM python:3.13-alpine AS validator

RUN apk add --no-cache \
    bash \
    git \
    shellcheck

WORKDIR /workspace

COPY requirements-docs.txt ./
RUN pip install --no-cache-dir --requirement requirements-docs.txt \
    && pip install --no-cache-dir pyyaml

COPY . .

RUN addgroup -S validator && adduser -S validator -G validator \
    && chown -R validator:validator /workspace
USER validator

ENTRYPOINT ["bash", "scripts/lint.sh"]
