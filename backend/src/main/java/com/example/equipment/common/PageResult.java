package com.example.equipment.common;

import java.util.List;

public record PageResult<T>(
    List<T> items,
    long total,
    int page,
    int size
) {
    public static void validate(int page, int size) {
        if (page < 1 || page > 100000 || size < 1 || size > 100) {
            throw BusinessException.badRequest("分页参数不正确");
        }
    }
}
