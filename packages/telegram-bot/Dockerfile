FROM oven/bun:1.3-debian

WORKDIR /app

# Install system utilities needed by agent (git, curl, ripgrep, etc.)
RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    curl \
    ca-certificates \
    ripgrep \
    procps \
    && rm -rf /var/lib/apt/lists/*

# Copy package configurations
COPY package.json bun.lock tsconfig.base.json ./
COPY packages/telegram-bot/package.json ./packages/telegram-bot/

# Install dependencies
RUN bun install --filter @oh-my-pi/pi-telegram-bot

# Copy source code
COPY packages/telegram-bot ./packages/telegram-bot

ENV NODE_ENV=production
ENV OMP_WORKSPACE_ROOT=/root/.omp/telegram-workspaces
ENV OMP_SESSION_ROOT=/root/.omp/telegram-sessions

CMD ["bun", "run", "--cwd", "packages/telegram-bot", "src/index.ts"]
