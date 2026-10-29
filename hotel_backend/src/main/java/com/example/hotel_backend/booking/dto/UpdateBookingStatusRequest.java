package com.example.hotel_backend.booking.dto;

import com.example.hotel_backend.booking.BookingStatus;
import jakarta.validation.constraints.NotNull;

public record UpdateBookingStatusRequest(
    @NotNull(message = "Укажите новый статус бронирования")
    BookingStatus status
) {
}
