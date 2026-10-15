package com.example.equipment.equipment;

import jakarta.validation.constraints.*;

public record EquipmentInput(
    @NotBlank(message="请填写设备编号") @Size(max=40, message="设备编号最多 40 字") String assetCode,
    @NotBlank(message="请填写设备名称") @Size(max=100, message="设备名称最多 100 字") String name,
    @NotBlank(message="请填写分类") @Size(max=40, message="分类最多 40 字") String category,
    @NotBlank(message="请填写存放位置") @Size(max=100, message="存放位置最多 100 字") String location,
    @NotNull(message="请填写设备说明") @Size(max=1000, message="设备说明最多 1000 字") String description,
    @NotNull(message="请选择是否开放预约") Boolean enabled) {}
