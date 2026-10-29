package com.example.hotel_backend.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RegisterRequest(
    @NotBlank(message = "Имя обязательно")
    @Size(max = 150, message = "Имя не должно превышать 150 символов")
    String fullName,

    @NotBlank(message = "Email обязателен")
    @Email(message = "Некорректный email")
    @Size(max = 254, message = "Email слишком длинный")
    String email,

    @NotBlank(message = "Пароль обязателен")
    @Size(
        min = 8,
        max = 72,
        message = "Пароль должен содержать от 8 до 72 символов"
    )
    String password
) {
}