package com.example.equipment;

import java.time.Clock;
import java.time.ZoneId;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;

@SpringBootApplication
public class EquipmentBookingApplication {

    public static void main(String[] args) {
        SpringApplication.run(EquipmentBookingApplication.class, args);
    }

    @Bean
    public Clock businessClock() {
        return Clock.system(ZoneId.of("Asia/Shanghai"));
    }
}
