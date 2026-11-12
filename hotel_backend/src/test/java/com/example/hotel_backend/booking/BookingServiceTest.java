package com.example.hotel_backend.booking;
import org.springframework.test.util.ReflectionTestUtils;
import com.example.hotel_backend.booking.dto.BookingAvailabilityResponse;
import com.example.hotel_backend.room.Room;
import com.example.hotel_backend.room.RoomStatus;
import com.example.hotel_backend.user.AppUser;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class BookingServiceTest {

    @Mock
    private BookingRepository bookingRepository;

    @Mock
    private EntityManager entityManager;

    @InjectMocks
    private BookingService bookingService;

    private final LocalDate checkIn = LocalDate.now().plusDays(5);
    private final LocalDate checkOut = LocalDate.now().plusDays(8);
    private Room room;

    @BeforeEach
    void setUp() {
        room = new Room();
        room.setRoomNumber("101");
        room.setStatus(RoomStatus.AVAILABLE);

        // Устанавливаем ID, поскольку у Room нет публичного setter для id
        ReflectionTestUtils.setField(room, "id", 1L);

        // EntityManager внедряется в BookingService через @PersistenceContext,
        // поэтому задаём mock явно
        ReflectionTestUtils.setField(bookingService, "entityManager", entityManager);
    }
    @Test
    void checkAvailabilityReturnsAvailableWhenNoBookingsOverlap() {
        when(entityManager.find(Room.class, 1L)).thenReturn(room);
        when(bookingRepository.findOverlappingBookings(
            1L, checkIn, checkOut, BookingStatus.CANCELLED
        )).thenReturn(List.of());

        BookingAvailabilityResponse result = bookingService.checkAvailability(1L, checkIn, checkOut);

        assertTrue(result.available());
        verify(bookingRepository).findOverlappingBookings(
            1L, checkIn, checkOut, BookingStatus.CANCELLED
        );
    }

    @Test
    void checkAvailabilityReturnsUnavailableWhenRoomIsNotAvailable() {
        room.setStatus(RoomStatus.MAINTENANCE);
        when(entityManager.find(Room.class, 1L)).thenReturn(room);

        BookingAvailabilityResponse result = bookingService.checkAvailability(1L, checkIn, checkOut);

        assertFalse(result.available());
        verify(bookingRepository, never()).findOverlappingBookings(
            1L, checkIn, checkOut, BookingStatus.CANCELLED
        );
    }

    @Test
    void checkAvailabilityReturnsUnavailableWhenDatesOverlap() {
        Booking overlappingBooking = mock(Booking.class);
        when(overlappingBooking.getId()).thenReturn(10L);
        when(entityManager.find(Room.class, 1L)).thenReturn(room);
        when(bookingRepository.findOverlappingBookings(
            1L, checkIn, checkOut, BookingStatus.CANCELLED
        )).thenReturn(List.of(overlappingBooking));

        BookingAvailabilityResponse result = bookingService.checkAvailability(1L, checkIn, checkOut);

        assertFalse(result.available());
    }

    @Test
    void checkAvailabilityRejectsPastCheckInDate() {
        LocalDate yesterday = LocalDate.now().minusDays(1);

        ResponseStatusException exception = assertThrows(
            ResponseStatusException.class,
            () -> bookingService.checkAvailability(1L, yesterday, checkOut)
        );

        assertEquals(HttpStatus.BAD_REQUEST, exception.getStatusCode());
        verify(entityManager, never()).find(Room.class, 1L);
    }

    @Test
    void checkAvailabilityRejectsCheckOutBeforeCheckIn() {
        ResponseStatusException exception = assertThrows(
            ResponseStatusException.class,
            () -> bookingService.checkAvailability(1L, checkOut, checkIn)
        );

        assertEquals(HttpStatus.BAD_REQUEST, exception.getStatusCode());
        verify(entityManager, never()).find(Room.class, 1L);
    }

    @Test
    void cancelBookingRejectsCancellationByAnotherGuest() {
        Booking booking = mock(Booking.class);
        AppUser guest = mock(AppUser.class);
        when(bookingRepository.findById(1L)).thenReturn(Optional.of(booking));
        when(booking.getGuest()).thenReturn(guest);
        when(guest.getEmail()).thenReturn("owner@example.com");

        ResponseStatusException exception = assertThrows(
            ResponseStatusException.class,
            () -> bookingService.cancelBooking(1L, "another@example.com", false)
        );

        assertEquals(HttpStatus.FORBIDDEN, exception.getStatusCode());
    }

    @Test
    void cancelBookingRejectsCompletedBooking() {
        Booking booking = mock(Booking.class);
        AppUser guest = mock(AppUser.class);
        when(bookingRepository.findById(1L)).thenReturn(Optional.of(booking));
        when(booking.getGuest()).thenReturn(guest);
        when(guest.getEmail()).thenReturn("owner@example.com");
        when(booking.getStatus()).thenReturn(BookingStatus.COMPLETED);

        ResponseStatusException exception = assertThrows(
            ResponseStatusException.class,
            () -> bookingService.cancelBooking(1L, "owner@example.com", false)
        );

        assertEquals(HttpStatus.CONFLICT, exception.getStatusCode());
    }

    @Test
    void checkAvailabilityReturnsNotFoundWhenRoomDoesNotExist() {
        when(entityManager.find(Room.class, 1L)).thenReturn(null);

        ResponseStatusException exception = assertThrows(
            ResponseStatusException.class,
            () -> bookingService.checkAvailability(1L, checkIn, checkOut)
        );

        assertEquals(HttpStatus.NOT_FOUND, exception.getStatusCode());
    }
}
