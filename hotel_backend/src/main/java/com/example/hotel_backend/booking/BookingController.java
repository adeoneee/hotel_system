package com.example.hotel_backend.booking;

import com.example.hotel_backend.booking.dto.BookingAvailabilityResponse;
import com.example.hotel_backend.booking.dto.BookingResponse;
import com.example.hotel_backend.booking.dto.CreateBookingRequest;
import com.example.hotel_backend.booking.dto.UpdateBookingStatusRequest;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;

@RestController
@RequestMapping("/api/bookings")
public class BookingController {

    private final BookingService bookingService;

    public BookingController(BookingService bookingService) {
        this.bookingService = bookingService;
    }

    @PostMapping
    public ResponseEntity<BookingResponse> createBooking(
        @Valid @RequestBody CreateBookingRequest request,
        Authentication authentication
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(bookingService.createBooking(authentication.getName(), request));
    }

    @GetMapping("/my")
    public List<BookingResponse> getMyBookings(Authentication authentication) {
        return bookingService.getMyBookings(authentication.getName());
    }

    @GetMapping
    public List<BookingResponse> getAllBookings(Authentication authentication) {
        requireAdministrator(authentication);
        return bookingService.getAllBookings();
    }

    @GetMapping("/availability")
    public BookingAvailabilityResponse checkAvailability(
        @RequestParam Long roomId,
        @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate checkIn,
        @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate checkOut
    ) {
        return bookingService.checkAvailability(roomId, checkIn, checkOut);
    }

    @PostMapping("/{id}/cancel")
    public BookingResponse cancelBooking(
        @PathVariable Long id,
        Authentication authentication
    ) {
        return bookingService.cancelBooking(id, authentication.getName(), isAdministrator(authentication));
    }

    @PatchMapping("/{id}/status")
    public BookingResponse updateStatus(
        @PathVariable Long id,
        @Valid @RequestBody UpdateBookingStatusRequest request,
        Authentication authentication
    ) {
        requireAdministrator(authentication);
        return bookingService.updateStatus(id, request.status());
    }

    private void requireAdministrator(Authentication authentication) {
        if (!isAdministrator(authentication)) {
            throw new org.springframework.web.server.ResponseStatusException(
                HttpStatus.FORBIDDEN,
                "Эта операция доступна только администратору"
            );
        }
    }

    private boolean isAdministrator(Authentication authentication) {
        if (authentication == null) {
            return false;
        }

        Collection<? extends GrantedAuthority> authorities = authentication.getAuthorities();
        boolean authorityMatches = authorities.stream().anyMatch(authority -> {
            String value = authority.getAuthority();
            return "ROLE_ADMIN".equals(value) || "ADMIN".equals(value);
        });
        if (authorityMatches) {
            return true;
        }

        Object principal = authentication.getPrincipal();
        if (principal instanceof Jwt jwt) {
            List<String> roles = jwt.getClaimAsStringList("roles");
            return roles != null && roles.contains("ADMIN");
        }
        return false;
    }
}
