
package com.example.hotel_backend.room;

public class RoomNotFoundException extends RuntimeException {

    public RoomNotFoundException(Long id) {
        super("Номер с идентификатором " + id + " не найден");
    }
}

