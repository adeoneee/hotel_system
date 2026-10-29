package com.example.hotel_backend.auth;

import com.example.hotel_backend.user.UserRole;

public record AuthResponse(
    String accessToken,
    String tokenType,
    long expiresInSeconds,
    UserInfo user
) {
    public record UserInfo(
        Long id,
        String fullName,
        String email,
        UserRole role
    ) {
    }
}