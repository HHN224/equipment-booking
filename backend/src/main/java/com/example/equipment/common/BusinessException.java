package com.example.equipment.common;

import org.springframework.http.HttpStatus;

public class BusinessException extends RuntimeException {
    public final HttpStatus status;
    public BusinessException(HttpStatus status, String message) { super(message); this.status = status; }
    public static BusinessException conflict(String message) { return new BusinessException(HttpStatus.CONFLICT, message); }
    public static BusinessException badRequest(String message) { return new BusinessException(HttpStatus.BAD_REQUEST, message); }
    public static BusinessException notFound() { return new BusinessException(HttpStatus.NOT_FOUND, "记录不存在或无权访问"); }
}
