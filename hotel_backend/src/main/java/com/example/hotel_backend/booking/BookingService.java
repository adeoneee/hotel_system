package com.example.hotel_backend.booking;

import com.example.hotel_backend.booking.dto.BookingAvailabilityResponse;
import com.example.hotel_backend.booking.dto.BookingResponse;
import com.example.hotel_backend.booking.dto.CreateBookingRequest;
import com.example.hotel_backend.room.Room;
import com.example.hotel_backend.user.AppUser;
import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;
import jakarta.persistence.PersistenceContext;
import jakarta.transaction.Transactional;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Objects;

@Service
public class BookingService {

    private final BookingRepository bookingRepository;

    @PersistenceContext
    private EntityManager entityManager;

    public BookingService(BookingRepository bookingRepository) {
        this.bookingRepository = bookingRepository;
    }

    @Transactional
    public BookingResponse createBooking(String guestEmail, CreateBookingRequest request) {
        validateDates(request.checkIn(), request.checkOut());

        // Lock the room row so two simultaneous requests cannot both pass the overlap check.
        Room room = entityManager.find(Room.class, request.roomId(), LockModeType.PESSIMISTIC_WRITE);
        if (room == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Номер не найден");
        }

        AppUser guest = findUserByEmail(guestEmail);
        ensureRoomIsAvailable(room, request.checkIn(), request.checkOut(), null);

        long nights = ChronoUnit.DAYS.between(request.checkIn(), request.checkOut());
        BigDecimal pricePerNight = new BigDecimal(room.getPricePerNight().toString())
            .setScale(2, RoundingMode.HALF_UP);
        BigDecimal totalPrice = pricePerNight
            .multiply(BigDecimal.valueOf(nights))
            .setScale(2, RoundingMode.HALF_UP);

        Booking booking = new Booking();
        booking.setRoom(room);
        booking.setGuest(guest);
        booking.setCheckIn(request.checkIn());
        booking.setCheckOut(request.checkOut());
        booking.setPricePerNight(pricePerNight);
        booking.setTotalPrice(totalPrice);
        booking.setStatus(BookingStatus.CONFIRMED);

        return BookingResponse.from(bookingRepository.saveAndFlush(booking));
    }

    @Transactional
    public List<BookingResponse> getMyBookings(String guestEmail) {
        return bookingRepository.findAllByGuestEmailOrderByCreatedAtDesc(guestEmail)
            .stream()
            .map(BookingResponse::from)
            .toList();
    }

    @Transactional
    public List<BookingResponse> getAllBookings() {
        return bookingRepository.findAllByOrderByCreatedAtDesc()
            .stream()
            .map(BookingResponse::from)
            .toList();
    }

    @Transactional
    public BookingResponse cancelBooking(Long bookingId, String requestingEmail, boolean administrator) {
        Booking booking = bookingRepository.findById(bookingId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Бронирование не найдено"));

        if (!administrator && !booking.getGuest().getEmail().equalsIgnoreCase(requestingEmail)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Нельзя отменить чужое бронирование");
        }
        if (booking.getStatus() == BookingStatus.COMPLETED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Завершённое бронирование нельзя отменить");
        }

        booking.setStatus(BookingStatus.CANCELLED);
        return BookingResponse.from(bookingRepository.saveAndFlush(booking));
    }

    @Transactional
    public BookingResponse updateStatus(Long bookingId, BookingStatus newStatus) {
        Booking booking = bookingRepository.findById(bookingId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Бронирование не найдено"));

        if (newStatus == BookingStatus.CONFIRMED && booking.getStatus() != BookingStatus.CONFIRMED) {
            Room room = entityManager.find(Room.class, booking.getRoom().getId(), LockModeType.PESSIMISTIC_WRITE);
            if (room == null) {
                throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Номер не найден");
            }
            validateDates(booking.getCheckIn(), booking.getCheckOut());
            ensureRoomIsAvailable(room, booking.getCheckIn(), booking.getCheckOut(), booking.getId());
        }

        booking.setStatus(newStatus);
        return BookingResponse.from(bookingRepository.saveAndFlush(booking));
    }

    @Transactional
    public BookingAvailabilityResponse checkAvailability(Long roomId, LocalDate checkIn, LocalDate checkOut) {
        validateDates(checkIn, checkOut);
        Room room = entityManager.find(Room.class, roomId);
        if (room == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Номер не найден");
        }
        String unavailableMessage = getUnavailableMessage(room, checkIn, checkOut, null);
        return unavailableMessage == null
            ? new BookingAvailabilityResponse(true, "Номер доступен на выбранные даты")
            : new BookingAvailabilityResponse(false, unavailableMessage);
    }

    private AppUser findUserByEmail(String email) {
        List<AppUser> users = entityManager.createQuery(
                "select u from AppUser u where lower(u.email) = lower(:email)", AppUser.class)
            .setParameter("email", email)
            .setMaxResults(1)
            .getResultList();

        if (users.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Пользователь не найден; войдите заново");
        }
        return users.get(0);
    }

    private void validateDates(LocalDate checkIn, LocalDate checkOut) {
        if (checkIn == null || checkOut == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Укажите даты заезда и выезда");
        }
        if (checkIn.isBefore(LocalDate.now())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Дата заезда не может быть в прошлом");
        }
        if (!checkOut.isAfter(checkIn)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Дата выезда должна быть позже даты заезда");
        }
    }

    private void ensureRoomIsAvailable(Room room, LocalDate checkIn, LocalDate checkOut, Long excludedBookingId) {
        String message = getUnavailableMessage(room, checkIn, checkOut, excludedBookingId);
        if (message != null) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, message);
        }
    }

    private String getUnavailableMessage(Room room, LocalDate checkIn, LocalDate checkOut, Long excludedBookingId) {
        if (room.getStatus() == null || !"AVAILABLE".equals(room.getStatus().name())) {
            return "Этот номер сейчас недоступен для бронирования";
        }

        List<Booking> overlappingBookings = bookingRepository.findOverlappingBookings(
            room.getId(), checkIn, checkOut, BookingStatus.CANCELLED);
        boolean overlapExists = overlappingBookings.stream()
            .anyMatch(booking -> !Objects.equals(booking.getId(), excludedBookingId));

        return overlapExists
            ? "Номер уже забронирован на выбранные даты"
            : null;
    }
}
