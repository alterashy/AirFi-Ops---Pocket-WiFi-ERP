#!/bin/sh
set -e

echo "=== Initializing AirFi Ops n8n Workflows ==="

if [ -f /workflows/airfi-refund-workflow.json ]; then
  WORKFLOW_ID=$(n8n list:workflow 2>/dev/null | grep '|' | cut -d'|' -f1 | head -n 1)

  if [ -z "$WORKFLOW_ID" ]; then
    echo "Importing AirFi Ops workflow..."
    n8n import:workflow --input=/workflows/airfi-refund-workflow.json
    WORKFLOW_ID=$(n8n list:workflow 2>/dev/null | grep '|' | cut -d'|' -f1 | head -n 1)
  fi

  if [ -n "$WORKFLOW_ID" ]; then
    echo "Publishing workflow ID: $WORKFLOW_ID"
    n8n publish:workflow --id="$WORKFLOW_ID" || true
  fi
fi

echo "=== Starting n8n Server ==="
exec n8n
