package com.example.equipment.equipment;

import com.example.equipment.common.PageResult;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api")
public class EquipmentController {
    private final EquipmentService service;
    public EquipmentController(EquipmentService service) { this.service = service; }
    @GetMapping("/equipment")
    public PageResult<Equipment> list(@RequestParam(required=false) String name, @RequestParam(required=false) String category,
        @RequestParam(defaultValue="1") int page, @RequestParam(defaultValue="8") int size) { return service.list(name, category, page, size); }
    @GetMapping("/equipment/categories") public List<String> categories() { return service.categories(); }
    @GetMapping("/equipment/{id}") public Equipment get(@PathVariable long id) { return service.get(id); }
    @PostMapping("/admin/equipment") @PreAuthorize("hasRole('ADMIN')")
    public Equipment create(@Valid @RequestBody EquipmentInput input) { return service.create(input); }
    @PutMapping("/admin/equipment/{id}") @PreAuthorize("hasRole('ADMIN')")
    public Equipment update(@PathVariable long id, @Valid @RequestBody EquipmentInput input) { return service.update(id, input); }
}
