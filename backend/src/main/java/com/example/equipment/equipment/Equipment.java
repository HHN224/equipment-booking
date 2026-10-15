package com.example.equipment.equipment;

import org.springframework.jdbc.core.RowMapper;

public record Equipment(long id, String assetCode, String name, String category, String location, String description, boolean enabled) {
    public static final RowMapper<Equipment> MAPPER = (rs, n) -> new Equipment(rs.getLong("id"), rs.getString("asset_code"),
        rs.getString("name"), rs.getString("category"), rs.getString("location"), rs.getString("description"), rs.getBoolean("enabled"));
}
