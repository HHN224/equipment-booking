package com.example.equipment.config;

import java.sql.Timestamp;
import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalTime;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionTemplate;

@Component
public class DemoDataInitializer implements ApplicationRunner {

    private final JdbcTemplate jdbc;
    private final PasswordEncoder encoder;
    private final TransactionTemplate transaction;
    private final Clock clock;
    private final boolean enabled;

    public DemoDataInitializer(
        JdbcTemplate jdbc,
        PasswordEncoder encoder,
        TransactionTemplate transaction,
        Clock clock,
        @Value("${app.demo-data-enabled}") boolean enabled
    ) {
        this.jdbc = jdbc;
        this.encoder = encoder;
        this.transaction = transaction;
        this.clock = clock;
        this.enabled = enabled;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (!enabled) {
            return;
        }

        transaction.executeWithoutResult(tx -> {
            if (
                Boolean.TRUE.equals(
                    jdbc.queryForObject(
                        "SELECT initialized FROM demo_seed WHERE id=1 FOR UPDATE",
                        Boolean.class
                    )
                )
            ) {
                return;
            }

            jdbc.update(
                "INSERT INTO app_user (id,username,password_hash,display_name,role) VALUES (1,'admin',?,'林老师','ADMIN'),(2,'member1',?,'陈小雨','MEMBER'),(3,'member2',?,'周明','MEMBER')",
                encoder.encode("Admin123!"),
                encoder.encode("Member123!"),
                encoder.encode("Member123!")
            );

            String[][] items = {
                {
                    "CAM-001",
                    "索尼 A7 IV",
                    "相机",
                    "器材室 · A01",
                    "全画幅微单。含 24–70mm 镜头、电池两块、存储卡及相机包。领用时请检查镜头与配件。"
                },
                {
                    "CAM-002",
                    "索尼 A7 IV",
                    "相机",
                    "器材室 · A02",
                    "同型号独立设备。含 24–70mm 镜头、电池两块。归还前请备份并清理个人文件。"
                },
                {
                    "CAM-003",
                    "佳能 EOS R6",
                    "相机",
                    "器材室 · A03",
                    "适合活动记录与人像拍摄。含 50mm 定焦镜头、充电器及肩带。"
                },
                {
                    "PRJ-001",
                    "爱普生 1080P 投影仪",
                    "投影仪",
                    "会议室 · B01",
                    "适合小组分享与作品展示。含 HDMI 线、遥控器、电源线。请关机散热后收纳。"
                },
                {
                    "PRJ-002",
                    "便携激光投影仪",
                    "投影仪",
                    "器材室 · B02",
                    "支持无线投屏，含便携支架与收纳包。正在维护，暂不接受新预约。"
                },
                {
                    "PHN-001",
                    "iPhone 15",
                    "测试手机",
                    "测试台 · C01",
                    "iOS 应用兼容性测试设备。请勿登录私人 Apple ID，归还时清理测试数据。"
                },
                {
                    "PHN-002",
                    "小米 14",
                    "测试手机",
                    "测试台 · C02",
                    "Android 应用与性能测试设备。含 USB-C 数据线和充电器。"
                },
                {
                    "AUD-001",
                    "Zoom H5 录音机",
                    "音频设备",
                    "器材室 · D01",
                    "用于访谈、播客与现场录音。含防风罩、存储卡和备用电池。"
                }
            };

            for (int i = 0; i < items.length; i++) {
                var x = items[i];
                jdbc.update(
                    "INSERT INTO equipment (id,asset_code,name,category,location,description,enabled) VALUES (?,?,?,?,?,?,?)",
                    i + 1,
                    x[0],
                    x[1],
                    x[2],
                    x[3],
                    x[4],
                    i != 4
                );
            }

            LocalDate today = LocalDate.now(clock);
            seedReservation(1, 1, 2, today.plusDays(1), "AM", "RESERVED");
            seedReservation(2, 4, 3, today, "PM", "PICKED_UP");
            seedReservation(3, 6, 2, today.minusDays(1), "AM", "RETURNED");
            seedReservation(4, 7, 3, today.plusDays(2), "PM", "CANCELLED");

            jdbc.update("UPDATE demo_seed SET initialized=TRUE WHERE id=1");
        });
    }

    private void seedReservation(
        long id,
        long equipmentId,
        long userId,
        LocalDate date,
        String slot,
        String status
    ) {
        var slotStart = date
            .atTime(slot.equals("AM") ? LocalTime.of(9, 0) : LocalTime.of(14, 0))
            .atZone(clock.getZone())
            .toInstant();
        var createdAt = clock.instant().minusSeconds(3600);
        if (slotStart.isBefore(createdAt)) {
            createdAt = slotStart.minusSeconds(86400);
        }

        jdbc.update(
            "INSERT INTO reservation (id,equipment_id,user_id,reservation_date,slot,status,created_at) VALUES (?,?,?,?,?,?,?)",
            id,
            equipmentId,
            userId,
            date,
            slot,
            status,
            Timestamp.from(createdAt)
        );

        if (!status.equals("CANCELLED")) {
            jdbc.update("INSERT INTO slot_occupancy VALUES (?,?,?,?)", equipmentId, date, slot, id);
        }

        if (status.equals("PICKED_UP") || status.equals("RETURNED")) {
            jdbc.update(
                "UPDATE reservation SET picked_up_at=?, picked_up_by=1 WHERE id=?",
                Timestamp.from(slotStart),
                id
            );
        }

        if (status.equals("PICKED_UP")) {
            jdbc.update("INSERT INTO active_loan VALUES (?,?)", equipmentId, id);
        }

        if (status.equals("RETURNED")) {
            jdbc.update(
                "UPDATE reservation SET returned_at=?, returned_by=1 WHERE id=?",
                Timestamp.from(slotStart.plusSeconds(9000)),
                id
            );
        }

        if (status.equals("CANCELLED")) {
            jdbc.update(
                "UPDATE reservation SET cancelled_at=? WHERE id=?",
                Timestamp.from(clock.instant()),
                id
            );
        }
    }
}
