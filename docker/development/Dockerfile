FROM node:20-alpine
WORKDIR /app

# Expose Vite dev server port
EXPOSE 5173

# Create an entrypoint script to install dependencies on container start
# This ensures dependencies are installed after volume mounts
RUN apk add --no-cache su-exec && \
    echo '#!/bin/sh' > /entrypoint.sh && \
    echo 'set -e' >> /entrypoint.sh && \
    echo 'echo "Installing dependencies..."' >> /entrypoint.sh && \
    echo 'npm install' >> /entrypoint.sh && \
    echo 'echo "Fixing permissions..."' >> /entrypoint.sh && \
    echo 'chown -R node:node /app || true' >> /entrypoint.sh && \
    echo 'echo "Starting development server as node user..."' >> /entrypoint.sh && \
    echo 'exec su-exec node "$@"' >> /entrypoint.sh && \
    chmod +x /entrypoint.sh



ENTRYPOINT ["/entrypoint.sh"]
CMD ["npm", "run", "dev", "-w", "demo", "--", "--host", "0.0.0.0"]