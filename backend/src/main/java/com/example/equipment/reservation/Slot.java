package com.example.equipment.reservation;

import java.time.LocalTime;

public enum Slot {
    AM("上午", LocalTime.of(9, 0), LocalTime.of(12, 0)),
    PM("下午", LocalTime.of(14, 0), LocalTime.of(18, 0));

    public final String label;
    public final LocalTime start;
    public final LocalTime end;

    Slot(String label, LocalTime start, LocalTime end) {
        this.label = label;
        this.start = start;
        this.end = end;
    }
}
