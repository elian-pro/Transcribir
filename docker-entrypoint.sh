#!/bin/sh

# Generate runtime environment configuration
# This allows us to inject environment variables at container startup

echo "Generating runtime configuration..."

# Create env.js file with runtime environment variables
cat > /usr/share/nginx/html/env.js <<EOF
window.env = {
  GEMINI_API_KEY: "${GEMINI_API_KEY}"
};
EOF

echo "Runtime configuration generated successfully"
echo "GEMINI_API_KEY is set: $([ -n "$GEMINI_API_KEY" ] && echo "Yes" || echo "No")"

# Start nginx
echo "Starting nginx..."
exec nginx -g 'daemon off;'
