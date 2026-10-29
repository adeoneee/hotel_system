package com.example.hotel_backend.auth;

public class EmailAlreadyExistsException extends RuntimeException {

    public EmailAlreadyExistsException() {
        super("Пользователь с таким email уже зарегистрирован");
    }
}