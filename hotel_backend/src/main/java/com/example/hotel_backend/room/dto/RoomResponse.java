
package com.example.hotel_backend.room.dto;

import com.example.hotel_backend.room.RoomStatus;
import com.example.hotel_backend.room.RoomType;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

public record RoomResponse(
    Long id,
    String roomNumber,
    RoomType roomType,
    int capacity,
    BigDecimal pricePerNight,
    RoomStatus status,
    String description,
    OffsetDateTime createdAt,
    OffsetDateTime updatedAt
) {
}
