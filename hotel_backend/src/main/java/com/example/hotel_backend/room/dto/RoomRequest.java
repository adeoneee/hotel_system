
package com.example.hotel_backend.room.dto;

import com.example.hotel_backend.room.RoomStatus;
import com.example.hotel_backend.room.RoomType;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

public record RoomRequest(
    @NotBlank(message = "Номер комнаты обязателен")
    @Size(max = 10, message = "Номер комнаты не должен превышать 10 символов")
    String roomNumber,

    @NotNull(message = "Необходимо указать тип комнаты")
    RoomType roomType,

    @Min(value = 1, message = "Вместимость должна быть не менее 1")
    int capacity,

    @NotNull(message = "Необходимо указать стоимость ночи")
    @DecimalMin(value = "0.01", message = "Стоимость должна быть положительной")
    @Digits(integer = 8, fraction = 2, message = "Некорректный формат стоимости")
    BigDecimal pricePerNight,

    @NotNull(message = "Необходимо указать статус комнаты")
    RoomStatus status,

    @Size(max = 2000, message = "Описание не должно превышать 2000 символов")
    String description
) {
}
