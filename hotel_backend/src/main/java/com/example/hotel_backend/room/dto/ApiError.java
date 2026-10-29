
package com.example.hotel_backend.room.dto;

import java.time.OffsetDateTime;

public record ApiError(
    OffsetDateTime timestamp,
    int status,
    String error,
    String message,
    String path
) {
}
