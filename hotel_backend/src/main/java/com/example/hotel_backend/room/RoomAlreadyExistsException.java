
package com.example.hotel_backend.room;

public class RoomAlreadyExistsException extends RuntimeException {

    public RoomAlreadyExistsException(String roomNumber) {
        super("Номер комнаты " + roomNumber + " уже существует");
    }
}
