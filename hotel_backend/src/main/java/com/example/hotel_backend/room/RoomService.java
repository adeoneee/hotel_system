
package com.example.hotel_backend.room;

import com.example.hotel_backend.room.dto.RoomRequest;
import com.example.hotel_backend.room.dto.RoomResponse;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class RoomService {

    private final RoomRepository roomRepository;

    public RoomService(RoomRepository roomRepository) {
        this.roomRepository = roomRepository;
    }

    @Transactional(readOnly = true)
    public List<RoomResponse> findAll() {
        return roomRepository.findAllByOrderByRoomNumberAsc()
            .stream()
            .map(this::toResponse)
            .toList();
    }

    @Transactional(readOnly = true)
    public RoomResponse findById(Long id) {
        Room room = roomRepository.findById(id)
            .orElseThrow(() -> new RoomNotFoundException(id));

        return toResponse(room);
    }

    @Transactional
    public RoomResponse create(RoomRequest request) {
        String roomNumber = request.roomNumber().trim();

        if (roomRepository.existsByRoomNumber(roomNumber)) {
            throw new RoomAlreadyExistsException(roomNumber);
        }

        Room room = new Room();
        applyRequest(room, request);

        return toResponse(roomRepository.save(room));
    }

    @Transactional
    public RoomResponse update(Long id, RoomRequest request) {
        Room room = roomRepository.findById(id)
            .orElseThrow(() -> new RoomNotFoundException(id));

        String roomNumber = request.roomNumber().trim();

        if (roomRepository.existsByRoomNumberAndIdNot(roomNumber, id)) {
            throw new RoomAlreadyExistsException(roomNumber);
        }

        applyRequest(room, request);

        return toResponse(roomRepository.save(room));
    }

    @Transactional
    public void delete(Long id) {
        Room room = roomRepository.findById(id)
            .orElseThrow(() -> new RoomNotFoundException(id));

        roomRepository.delete(room);
    }

    private void applyRequest(Room room, RoomRequest request) {
        room.setRoomNumber(request.roomNumber().trim());
        room.setRoomType(request.roomType());
        room.setCapacity(request.capacity());
        room.setPricePerNight(request.pricePerNight());
        room.setStatus(request.status());
        room.setDescription(request.description());
    }

    private RoomResponse toResponse(Room room) {
        return new RoomResponse(
            room.getId(),
            room.getRoomNumber(),
            room.getRoomType(),
            room.getCapacity(),
            room.getPricePerNight(),
            room.getStatus(),
            room.getDescription(),
            room.getCreatedAt(),
            room.getUpdatedAt()
        );
    }
}
