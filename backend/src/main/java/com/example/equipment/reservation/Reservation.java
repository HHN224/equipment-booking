package com.example.equipment.reservation;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.*;
import org.springframework.jdbc.core.RowMapper;

public record Reservation(
    long id,
    long equipmentId,
    String equipmentName,
    String assetCode,
    long userId,
    String memberName,
    String username,
    LocalDate date,
    Slot slot,
    ReservationStatus status,
    Instant createdAt,
    Instant cancelledAt,
    Instant pickedUpAt,
    Instant returnedAt
) {
    public static final String SELECT =
        "SELECT r.*, e.name AS equipment_name, e.asset_code, u.display_name, u.username FROM reservation r JOIN equipment e ON e.id=r.equipment_id JOIN app_user u ON u.id=r.user_id";

    public static final RowMapper<Reservation> MAPPER = (rs, n) ->
        new Reservation(
            rs.getLong("id"),
            rs.getLong("equipment_id"),
            rs.getString("equipment_name"),
            rs.getString("asset_code"),
            rs.getLong("user_id"),
            rs.getString("display_name"),
            rs.getString("username"),
            rs.getDate("reservation_date").toLocalDate(),
            Slot.valueOf(rs.getString("slot")),
            ReservationStatus.valueOf(rs.getString("status")),
            instant(rs, "created_at"),
            instant(rs, "cancelled_at"),
            instant(rs, "picked_up_at"),
            instant(rs, "returned_at")
        );

    private static Instant instant(ResultSet rs, String column) throws SQLException {
        var timestamp = rs.getTimestamp(column);

        return timestamp == null ? null : timestamp.toInstant();
    }
}
