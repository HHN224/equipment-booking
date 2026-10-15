package com.example.equipment.common;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.dao.PessimisticLockingFailureException;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.http.converter.HttpMessageNotReadableException;
import java.util.Map;

@RestControllerAdvice
public class ApiExceptionHandler {
    private static final Logger log = LoggerFactory.getLogger(ApiExceptionHandler.class);
    @ExceptionHandler(BusinessException.class)
    ResponseEntity<?> business(BusinessException e) { return ResponseEntity.status(e.status).body(Map.of("message", e.getMessage())); }
    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<?> validation(MethodArgumentNotValidException e) {
        return ResponseEntity.badRequest().body(Map.of("message", e.getBindingResult().getFieldErrors().getFirst().getDefaultMessage()));
    }
    @ExceptionHandler({MethodArgumentTypeMismatchException.class, HttpMessageNotReadableException.class})
    ResponseEntity<?> format(Exception e) { return ResponseEntity.badRequest().body(Map.of("message", "请求格式有误，请检查日期、时段和必填内容")); }
    @ExceptionHandler(DataIntegrityViolationException.class)
    ResponseEntity<?> duplicate(Exception e) { return ResponseEntity.status(409).body(Map.of("message", "数据冲突，请刷新后重试")); }
    @ExceptionHandler(PessimisticLockingFailureException.class)
    ResponseEntity<?> busy(Exception e) { return ResponseEntity.status(409).body(Map.of("message", "设备正在被其他人操作，请稍后重试")); }
    @ExceptionHandler(AccessDeniedException.class)
    ResponseEntity<?> denied(Exception e) { return ResponseEntity.status(403).body(Map.of("message", "没有操作权限")); }
    @ExceptionHandler(Exception.class)
    ResponseEntity<?> unexpected(Exception e) {
        log.error("Unhandled API error", e);
        return ResponseEntity.internalServerError().body(Map.of("message", "服务暂时不可用，请稍后重试"));
    }
}
