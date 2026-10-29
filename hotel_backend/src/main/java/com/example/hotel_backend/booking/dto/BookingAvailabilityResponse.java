package com.example.hotel_backend.booking.dto;

public record BookingAvailabilityResponse(
    boolean available,
    String message
) {
}
