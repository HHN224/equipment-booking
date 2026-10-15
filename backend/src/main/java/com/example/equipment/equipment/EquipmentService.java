package com.example.equipment.equipment;

import com.example.equipment.common.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.dao.DuplicateKeyException;
import java.sql.Statement;
import java.util.*;

@Service
public class EquipmentService {
    private final JdbcTemplate jdbc;
    private final NamedParameterJdbcTemplate named;
    public EquipmentService(JdbcTemplate jdbc) { this.jdbc = jdbc; this.named = new NamedParameterJdbcTemplate(jdbc); }
    public Equipment get(long id) {
        return jdbc.query("SELECT * FROM equipment WHERE id = ?", Equipment.MAPPER, id).stream().findFirst().orElseThrow(BusinessException::notFound);
    }
    // 所有设备相关写操作都先锁同一设备行，统一锁顺序：设备 → 预约。
    public Equipment lock(long id) {
        return jdbc.query("SELECT * FROM equipment WHERE id = ? FOR UPDATE", Equipment.MAPPER, id).stream().findFirst().orElseThrow(BusinessException::notFound);
    }
    public List<String> categories() { return jdbc.queryForList("SELECT DISTINCT category FROM equipment ORDER BY category", String.class); }
    public PageResult<Equipment> list(String name, String category, int page, int size) {
        PageResult.validate(page, size);
        var args = new HashMap<String, Object>();
        String where = " WHERE 1=1";
        if (name != null && !name.isBlank()) { where += " AND LOCATE(:name, name) > 0"; args.put("name", name.trim()); }
        if (category != null && !category.isBlank()) { where += " AND category = :category"; args.put("category", category); }
        long total = named.queryForObject("SELECT COUNT(*) FROM equipment" + where, args, Long.class);
        args.put("limit", size); args.put("offset", (page - 1) * size);
        return new PageResult<>(named.query("SELECT * FROM equipment" + where + " ORDER BY enabled DESC, id LIMIT :limit OFFSET :offset", args, Equipment.MAPPER), total, page, size);
    }
    @Transactional
    public Equipment create(EquipmentInput input) {
        var key = new GeneratedKeyHolder();
        try {
            jdbc.update(conn -> {
                var statement = conn.prepareStatement("INSERT INTO equipment (asset_code,name,category,location,description,enabled) VALUES (?,?,?,?,?,?)", Statement.RETURN_GENERATED_KEYS);
                statement.setString(1, input.assetCode().trim()); statement.setString(2, input.name().trim());
                statement.setString(3, input.category().trim()); statement.setString(4, input.location().trim());
                statement.setString(5, input.description().trim()); statement.setBoolean(6, input.enabled());
                return statement;
            }, key);
        } catch (DuplicateKeyException e) { throw BusinessException.conflict("设备编号已存在，请使用唯一编号"); }
        return get(Objects.requireNonNull(key.getKey()).longValue());
    }
    @Transactional
    public Equipment update(long id, EquipmentInput input) {
        lock(id);
        try {
            jdbc.update("UPDATE equipment SET asset_code=?, name=?, category=?, location=?, description=?, enabled=? WHERE id=?",
                input.assetCode().trim(), input.name().trim(), input.category().trim(), input.location().trim(), input.description().trim(), input.enabled(), id);
        } catch (DuplicateKeyException e) { throw BusinessException.conflict("设备编号已存在，请使用唯一编号"); }
        return get(id);
    }
}
