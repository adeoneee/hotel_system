package com.example.hotel_backend.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record LoginRequest(
    @NotBlank(message = "Email обязателен")
    @Email(message = "Некорректный email")
    @Size(max = 254, message = "Email слишком длинный")
    String email,

    @NotBlank(message = "Пароль обязателен")
    String password
) {
}