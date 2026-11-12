package com.example.hotel_backend.room;

import com.example.hotel_backend.room.dto.RoomRequest;
import com.example.hotel_backend.room.dto.RoomResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RoomServiceTest {

    @Mock
    private RoomRepository roomRepository;

    @InjectMocks
    private RoomService roomService;

    private Room room;
    private RoomRequest request;

    @BeforeEach
    void setUp() {
        room = new Room();
        room.setRoomNumber("101");
        room.setRoomType(RoomType.STANDARD);
        room.setCapacity(2);
        room.setPricePerNight(new BigDecimal("3500.00"));
        room.setStatus(RoomStatus.AVAILABLE);
        room.setDescription("Test room");

        request = new RoomRequest(
            " 101 ",
            RoomType.STANDARD,
            2,
            new BigDecimal("3500.00"),
            RoomStatus.AVAILABLE,
            "Test room"
        );
    }

    @Test
    void findAllReturnsRoomsOrderedByRoomNumber() {
        when(roomRepository.findAllByOrderByRoomNumberAsc()).thenReturn(List.of(room));

        List<RoomResponse> result = roomService.findAll();

        assertEquals(1, result.size());
        assertEquals("101", result.get(0).roomNumber());
        verify(roomRepository).findAllByOrderByRoomNumberAsc();
    }

    @Test
    void findByIdReturnsRoomWhenItExists() {
        when(roomRepository.findById(1L)).thenReturn(Optional.of(room));

        RoomResponse result = roomService.findById(1L);

        assertEquals("101", result.roomNumber());
        assertEquals(RoomType.STANDARD, result.roomType());
    }

    @Test
    void findByIdThrowsWhenRoomDoesNotExist() {
        when(roomRepository.findById(99L)).thenReturn(Optional.empty());

        assertThrows(RoomNotFoundException.class, () -> roomService.findById(99L));
    }

    @Test
    void createTrimsRoomNumberAndSavesRoom() {
        when(roomRepository.existsByRoomNumber("101")).thenReturn(false);
        when(roomRepository.save(any(Room.class))).thenAnswer(invocation -> invocation.getArgument(0));

        RoomResponse result = roomService.create(request);

        assertEquals("101", result.roomNumber());
        verify(roomRepository).save(any(Room.class));
    }

    @Test
    void createThrowsWhenRoomNumberAlreadyExists() {
        when(roomRepository.existsByRoomNumber("101")).thenReturn(true);

        assertThrows(RoomAlreadyExistsException.class, () -> roomService.create(request));
        verify(roomRepository, never()).save(any(Room.class));
    }

    @Test
    void updateChangesExistingRoom() {
        when(roomRepository.findById(1L)).thenReturn(Optional.of(room));
        when(roomRepository.existsByRoomNumberAndIdNot("101", 1L)).thenReturn(false);
        when(roomRepository.save(any(Room.class))).thenAnswer(invocation -> invocation.getArgument(0));

        RoomRequest updatedRequest = new RoomRequest(
            " 101 ", RoomType.LUX, 3, new BigDecimal("5000.00"),
            RoomStatus.AVAILABLE, "Updated room"
        );

        RoomResponse result = roomService.update(1L, updatedRequest);

        assertEquals(RoomType.LUX, result.roomType());
        assertEquals(3, result.capacity());
        assertEquals(new BigDecimal("5000.00"), result.pricePerNight());
        assertEquals("Updated room", result.description());
    }

    @Test
    void updateThrowsWhenRoomNumberBelongsToAnotherRoom() {
        when(roomRepository.findById(1L)).thenReturn(Optional.of(room));
        when(roomRepository.existsByRoomNumberAndIdNot("101", 1L)).thenReturn(true);

        assertThrows(RoomAlreadyExistsException.class, () -> roomService.update(1L, request));
        verify(roomRepository, never()).save(any(Room.class));
    }

    @Test
    void deleteRemovesExistingRoom() {
        when(roomRepository.findById(1L)).thenReturn(Optional.of(room));

        roomService.delete(1L);

        verify(roomRepository).delete(room);
    }
}
