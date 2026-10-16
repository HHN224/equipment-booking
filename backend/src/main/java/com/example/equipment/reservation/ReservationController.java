package com.example.equipment.reservation;

import com.example.equipment.auth.SessionUser;
import com.example.equipment.common.PageResult;
import jakarta.validation.Valid;
import java.time.LocalDate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
public class ReservationController {

    private final ReservationService service;

    public ReservationController(ReservationService service) {
        this.service = service;
    }

    @GetMapping("/calendar")
    public ReservationService.CalendarInfo calendar() {
        return service.calendar();
    }

    @GetMapping("/equipment/{id}/availability")
    public ReservationService.Availability availability(
        @PathVariable long id,
        @RequestParam LocalDate date
    ) {
        return service.availability(id, date);
    }

    @PostMapping("/reservations")
    public Reservation create(
        @Valid @RequestBody ReservationService.BookingInput input,
        @AuthenticationPrincipal SessionUser user
    ) {
        return service.book(input, user);
    }

    @GetMapping("/reservations/mine")
    public PageResult<Reservation> mine(
        @AuthenticationPrincipal SessionUser user,
        @RequestParam(required = false) LocalDate date,
        @RequestParam(required = false) ReservationStatus status,
        @RequestParam(defaultValue = "1") int page,
        @RequestParam(defaultValue = "10") int size
    ) {
        return service.list(user.id(), date, null, null, status, page, size);
    }

    @GetMapping("/reservations/{id}")
    public Reservation get(@PathVariable long id, @AuthenticationPrincipal SessionUser user) {
        return service.get(id, user);
    }

    @PostMapping("/reservations/{id}/cancel")
    public Reservation cancel(@PathVariable long id, @AuthenticationPrincipal SessionUser user) {
        return service.cancel(id, user);
    }

    @GetMapping("/admin/reservations")
    @PreAuthorize("hasRole('ADMIN')")
    public PageResult<Reservation> all(
        @RequestParam(required = false) LocalDate date,
        @RequestParam(required = false) Long equipmentId,
        @RequestParam(required = false) String member,
        @RequestParam(required = false) ReservationStatus status,
        @RequestParam(defaultValue = "1") int page,
        @RequestParam(defaultValue = "10") int size
    ) {
        return service.list(null, date, equipmentId, member, status, page, size);
    }

    @PostMapping("/admin/reservations/{id}/pickup")
    @PreAuthorize("hasRole('ADMIN')")
    public Reservation pickup(@PathVariable long id, @AuthenticationPrincipal SessionUser user) {
        return service.pickup(id, user);
    }

    @PostMapping("/admin/reservations/{id}/return")
    @PreAuthorize("hasRole('ADMIN')")
    public Reservation returnEquipment(
        @PathVariable long id,
        @AuthenticationPrincipal SessionUser user
    ) {
        return service.returnEquipment(id, user);
    }
}
