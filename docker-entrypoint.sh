#!/bin/sh

# Generate runtime environment configuration
# This allows us to inject environment variables at container startup

echo "========================================"
echo "Starting Transcribir Application"
echo "========================================"

echo "Generating runtime configuration..."

# Create env.js file with runtime environment variables
cat > /usr/share/nginx/html/env.js <<EOF
window.env = {
  GEMINI_API_KEY: "${GEMINI_API_KEY}"
};
EOF

echo "Runtime configuration generated successfully"
echo "GEMINI_API_KEY is set: $([ -n "$GEMINI_API_KEY" ] && echo "Yes (length: ${#GEMINI_API_KEY})" || echo "No")"

# Verify file was created
if [ -f /usr/share/nginx/html/env.js ]; then
    echo "✓ env.js file created successfully"
    echo "File size: $(wc -c < /usr/share/nginx/html/env.js) bytes"
else
    echo "✗ ERROR: env.js file was not created!"
fi

# List files in html directory
echo "Files in /usr/share/nginx/html:"
ls -lh /usr/share/nginx/html | head -20

echo "========================================"
echo "Starting nginx..."
echo "========================================"
exec nginx -g 'daemon off;'
