package com.example.hotel_backend.booking.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.time.LocalDate;

public record CreateBookingRequest(
    @NotNull(message = "Необходимо выбрать номер")
    @Positive(message = "Некорректный идентификатор номера")
    Long roomId,

    @NotNull(message = "Укажите дату заезда")
    LocalDate checkIn,

    @NotNull(message = "Укажите дату выезда")
    LocalDate checkOut
) {
}
