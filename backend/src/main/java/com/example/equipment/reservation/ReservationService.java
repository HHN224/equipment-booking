package com.example.equipment.reservation;

import com.example.equipment.auth.SessionUser;
import com.example.equipment.common.*;
import com.example.equipment.equipment.EquipmentService;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.sql.Statement;
import java.sql.Timestamp;
import java.time.*;
import java.util.*;

@Service
public class ReservationService {
    private final JdbcTemplate jdbc;
    private final NamedParameterJdbcTemplate named;
    private final EquipmentService equipment;
    private final Clock clock;
    public ReservationService(JdbcTemplate jdbc, EquipmentService equipment, Clock clock) {
        this.jdbc = jdbc; this.named = new NamedParameterJdbcTemplate(jdbc); this.equipment = equipment; this.clock = clock;
    }
    public record BookingInput(@Positive(message="请选择设备") long equipmentId,
        @NotNull(message="请选择日期") LocalDate date, @NotNull(message="请选择时段") Slot slot) {}
    public record CalendarInfo(LocalDate today, LocalDate maxDate, String timezone, Instant now) {}
    public record SlotAvailability(Slot slot, String label, String start, String end, boolean occupied, boolean bookable, String reason) {}
    public record Availability(long equipmentId, LocalDate date, List<SlotAvailability> slots) {}
    public CalendarInfo calendar() {
        var now = clock.instant();
        var today = now.atZone(clock.getZone()).toLocalDate();
        return new CalendarInfo(today, today.plusDays(30), "Asia/Shanghai", now);
    }
    private String timeError(LocalDate date, Slot slot) {
        LocalDateTime now = LocalDateTime.now(clock);
        if (date.isBefore(now.toLocalDate()) || date.isAfter(now.toLocalDate().plusDays(30))) return "仅可预约今天至未来 30 天（含第 30 天）";
        if (!date.atTime(slot.end).isAfter(now)) return "该时段已结束，请选择其他时段";
        return null;
    }
    public Availability availability(long equipmentId, LocalDate date) {
        var item = equipment.get(equipmentId);
        var occupied = jdbc.queryForList("SELECT slot FROM slot_occupancy WHERE equipment_id=? AND reservation_date=?", String.class, equipmentId, date);
        var slots = Arrays.stream(Slot.values()).map(slot -> {
            String reason = !item.enabled() ? "设备暂停新预约" : occupied.contains(slot.name()) ? "已被预约" : timeError(date, slot);
            return new SlotAvailability(slot, slot.label, slot.start.toString(), slot.end.toString(), occupied.contains(slot.name()), reason == null, reason);
        }).toList();
        // 不返回预约 ID、姓名、账号或成员 ID。
        return new Availability(equipmentId, date, slots);
    }
    @Transactional
    public Reservation book(BookingInput input, SessionUser user) {
        var item = equipment.lock(input.equipmentId());
        if (!item.enabled()) throw BusinessException.conflict("设备已暂停新预约");
        String error = timeError(input.date(), input.slot());
        if (error != null) throw BusinessException.badRequest(error);
        var key = new GeneratedKeyHolder();
        jdbc.update(conn -> {
            var statement = conn.prepareStatement("INSERT INTO reservation (equipment_id,user_id,reservation_date,slot,status,created_at) VALUES (?,?,?,?,'RESERVED',?)", Statement.RETURN_GENERATED_KEYS);
            statement.setLong(1, input.equipmentId()); statement.setLong(2, user.id()); statement.setObject(3, input.date());
            statement.setString(4, input.slot().name()); statement.setTimestamp(5, Timestamp.from(clock.instant()));
            return statement;
        }, key);
        long id = Objects.requireNonNull(key.getKey()).longValue();
        try {
            // 不依赖“先查空闲”：唯一键争用失败时抛出异常，整笔事务（包括预约记录）回滚。
            jdbc.update("INSERT INTO slot_occupancy (equipment_id,reservation_date,slot,reservation_id) VALUES (?,?,?,?)", input.equipmentId(), input.date(), input.slot().name(), id);
        } catch (DuplicateKeyException e) { throw BusinessException.conflict("该时段刚刚被预约，请选择其他时段"); }
        return get(id, user);
    }
    public Reservation get(long id, SessionUser user) {
        var rows = jdbc.query(Reservation.SELECT + " WHERE r.id=?" + (user.role().equals("ADMIN") ? "" : " AND r.user_id=" + user.id()), Reservation.MAPPER, id);
        return rows.stream().findFirst().orElseThrow(BusinessException::notFound);
    }
    public PageResult<Reservation> list(Long ownerId, LocalDate date, Long equipmentId, String member, ReservationStatus status, int page, int size) {
        PageResult.validate(page, size);
        var args = new HashMap<String, Object>();
        String where = " WHERE 1=1";
        if (ownerId != null) { where += " AND r.user_id=:owner"; args.put("owner", ownerId); }
        if (date != null) { where += " AND r.reservation_date=:date"; args.put("date", date); }
        if (equipmentId != null) { where += " AND r.equipment_id=:equipment"; args.put("equipment", equipmentId); }
        if (member != null && !member.isBlank()) { where += " AND (LOCATE(:member,u.display_name)>0 OR LOCATE(:member,u.username)>0)"; args.put("member", member.trim()); }
        if (status != null) { where += " AND r.status=:status"; args.put("status", status.name()); }
        long total = named.queryForObject("SELECT COUNT(*) FROM reservation r JOIN app_user u ON u.id=r.user_id" + where, args, Long.class);
        args.put("limit", size); args.put("offset", (page-1)*size);
        return new PageResult<>(named.query(Reservation.SELECT + where + " ORDER BY r.created_at DESC, r.id DESC LIMIT :limit OFFSET :offset", args, Reservation.MAPPER), total, page, size);
    }
    private record LockedReservation(long id, long equipmentId, long userId, ReservationStatus status) {}
    private LockedReservation lock(long id, SessionUser user) {
        // 此次读取只确定不可变的 equipment_id 并检查可见性，不用于判断状态。
        Reservation visible = get(id, user);
        equipment.lock(visible.equipmentId());
        return jdbc.query("SELECT * FROM reservation WHERE id=? FOR UPDATE", (rs,n) -> new LockedReservation(rs.getLong("id"), rs.getLong("equipment_id"), rs.getLong("user_id"), ReservationStatus.valueOf(rs.getString("status"))), id).getFirst();
    }
    @Transactional
    public Reservation cancel(long id, SessionUser user) {
        var row = lock(id, user);
        if (row.userId() != user.id()) throw BusinessException.notFound();
        requireStatus(row, ReservationStatus.RESERVED);
        int changed = jdbc.update("UPDATE reservation SET status='CANCELLED', cancelled_at=? WHERE id=? AND status='RESERVED'", Timestamp.from(clock.instant()), id);
        requireChanged(changed);
        jdbc.update("DELETE FROM slot_occupancy WHERE reservation_id=?", id);
        return get(id, user);
    }
    @Transactional
    public Reservation pickup(long id, SessionUser admin) {
        requireAdmin(admin);
        var row = lock(id, admin);
        requireStatus(row, ReservationStatus.RESERVED);
        try {
            jdbc.update("INSERT INTO active_loan (equipment_id,reservation_id) VALUES (?,?)", row.equipmentId(), id);
        } catch (DuplicateKeyException e) { throw BusinessException.conflict("该设备尚未归还，不能重复领用"); }
        requireChanged(jdbc.update("UPDATE reservation SET status='PICKED_UP', picked_up_at=?, picked_up_by=? WHERE id=? AND status='RESERVED'", Timestamp.from(clock.instant()), admin.id(), id));
        return get(id, admin);
    }
    @Transactional
    public Reservation returnEquipment(long id, SessionUser admin) {
        requireAdmin(admin);
        var row = lock(id, admin);
        requireStatus(row, ReservationStatus.PICKED_UP);
        requireChanged(jdbc.update("UPDATE reservation SET status='RETURNED', returned_at=?, returned_by=? WHERE id=? AND status='PICKED_UP'", Timestamp.from(clock.instant()), admin.id(), id));
        jdbc.update("DELETE FROM active_loan WHERE reservation_id=?", id);
        // 保留 slot_occupancy，提前归还不再次开放原时段。
        return get(id, admin);
    }
    private void requireAdmin(SessionUser user) {
        if (!user.role().equals("ADMIN")) throw new BusinessException(org.springframework.http.HttpStatus.FORBIDDEN, "只有管理员可以确认借还");
    }
    private void requireStatus(LockedReservation row, ReservationStatus expected) {
        if (row.status() != expected) throw BusinessException.conflict("预约状态已改变，不能执行此操作，请刷新列表");
    }
    private void requireChanged(int changed) { if (changed != 1) throw BusinessException.conflict("预约状态已改变，请刷新列表"); }
}
