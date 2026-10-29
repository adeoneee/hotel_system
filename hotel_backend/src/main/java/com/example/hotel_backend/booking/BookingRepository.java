package com.example.hotel_backend.booking;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface BookingRepository extends JpaRepository<Booking, Long> {

    List<Booking> findAllByOrderByCreatedAtDesc();

    List<Booking> findAllByGuestEmailOrderByCreatedAtDesc(String email);

    Optional<Booking> findByIdAndGuestEmail(Long id, String email);

    @Query("""
        select b
        from Booking b
        where b.room.id = :roomId
          and b.status <> :cancelledStatus
          and b.checkIn < :requestedCheckOut
          and b.checkOut > :requestedCheckIn
        """)
    List<Booking> findOverlappingBookings(
        @Param("roomId") Long roomId,
        @Param("requestedCheckIn") LocalDate requestedCheckIn,
        @Param("requestedCheckOut") LocalDate requestedCheckOut,
        @Param("cancelledStatus") BookingStatus cancelledStatus
    );
}
