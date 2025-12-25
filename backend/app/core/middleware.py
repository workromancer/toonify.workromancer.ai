"""
Middleware for request processing and logging.

This module provides middleware that:
- Extracts trace context from Cloud Run headers
- Generates request IDs for correlation
- Logs request/response information
"""

import time
import uuid
from typing import Callable
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from app.core.config import settings
from app.core.logging import (
    get_logger,
    set_trace_context,
    set_request_id,
    set_user_id,
    parse_cloud_trace_header,
)

logger = get_logger(__name__)


class LoggingMiddleware(BaseHTTPMiddleware):
    """
    Middleware that handles request logging and trace context propagation.
    """

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Generate or extract request ID
        request_id = request.headers.get('X-Request-ID') or str(uuid.uuid4())
        set_request_id(request_id)

        # Extract Cloud Trace context
        trace_header = request.headers.get('X-Cloud-Trace-Context')
        trace_id, span_id = parse_cloud_trace_header(
            trace_header, 
            settings.GOOGLE_CLOUD_PROJECT
        )
        set_trace_context(trace_id, span_id)

        # Extract user ID from auth header if available (will be set properly in deps)
        # This is just for initial logging before auth is processed
        
        # Log request start
        start_time = time.time()
        
        logger.info(
            "Request started",
            method=request.method,
            path=str(request.url.path),
            query=str(request.url.query) if request.url.query else None,
            client_ip=request.client.host if request.client else None,
            user_agent=request.headers.get('User-Agent'),
        )

        try:
            response = await call_next(request)
            
            # Calculate duration
            duration_ms = (time.time() - start_time) * 1000

            # Log response
            logger.info(
                "Request completed",
                method=request.method,
                path=str(request.url.path),
                status_code=response.status_code,
                duration_ms=round(duration_ms, 2),
            )

            # Add trace headers to response
            response.headers['X-Request-ID'] = request_id
            if trace_id:
                response.headers['X-Trace-ID'] = trace_id

            return response

        except Exception as e:
            duration_ms = (time.time() - start_time) * 1000
            logger.error(
                "Request failed",
                method=request.method,
                path=str(request.url.path),
                duration_ms=round(duration_ms, 2),
                error=str(e),
                error_type=type(e).__name__,
            )
            raise
