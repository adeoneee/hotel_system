package com.example.hotel_backend.booking.dto;

import com.example.hotel_backend.booking.Booking;
import com.example.hotel_backend.booking.BookingStatus;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;

public record BookingResponse(
    Long id,
    Long roomId,
    String roomNumber,
    Long guestId,
    String guestFullName,
    String guestEmail,
    LocalDate checkIn,
    LocalDate checkOut,
    long nights,
    BigDecimal pricePerNight,
    BigDecimal totalPrice,
    BookingStatus status,
    LocalDateTime createdAt,
    LocalDateTime updatedAt
) {
    public static BookingResponse from(Booking booking) {
        long nights = ChronoUnit.DAYS.between(booking.getCheckIn(), booking.getCheckOut());
        return new BookingResponse(
            booking.getId(),
            booking.getRoom().getId(),
            booking.getRoom().getRoomNumber(),
            booking.getGuest().getId(),
            booking.getGuest().getFullName(),
            booking.getGuest().getEmail(),
            booking.getCheckIn(),
            booking.getCheckOut(),
            nights,
            booking.getPricePerNight(),
            booking.getTotalPrice(),
            booking.getStatus(),
            booking.getCreatedAt(),
            booking.getUpdatedAt()
        );
    }
}
