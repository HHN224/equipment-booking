CREATE TABLE app_user (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(100) NOT NULL,
    display_name VARCHAR(80) NOT NULL,
    role VARCHAR(10) NOT NULL,
    CONSTRAINT ck_user_role CHECK (role IN ('ADMIN','MEMBER'))
) ENGINE=InnoDB;

CREATE TABLE equipment (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    asset_code VARCHAR(40) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(40) NOT NULL,
    location VARCHAR(100) NOT NULL,
    description VARCHAR(1000) NOT NULL DEFAULT '',
    enabled BOOLEAN NOT NULL DEFAULT TRUE
) ENGINE=InnoDB;

CREATE TABLE reservation (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    equipment_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    reservation_date DATE NOT NULL,
    slot VARCHAR(10) NOT NULL,
    status VARCHAR(16) NOT NULL,
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    cancelled_at TIMESTAMP(6) NULL,
    picked_up_at TIMESTAMP(6) NULL,
    returned_at TIMESTAMP(6) NULL,
    picked_up_by BIGINT NULL,
    returned_by BIGINT NULL,
    CONSTRAINT fk_reservation_equipment FOREIGN KEY (equipment_id) REFERENCES equipment(id),
    CONSTRAINT fk_reservation_user FOREIGN KEY (user_id) REFERENCES app_user(id),
    CONSTRAINT fk_pickup_admin FOREIGN KEY (picked_up_by) REFERENCES app_user(id),
    CONSTRAINT fk_return_admin FOREIGN KEY (returned_by) REFERENCES app_user(id),
    CONSTRAINT ck_slot CHECK (slot IN ('AM','PM')),
    CONSTRAINT ck_status CHECK (status IN ('RESERVED','PICKED_UP','RETURNED','CANCELLED')),
    UNIQUE KEY uq_reservation_slot_reference (id, equipment_id, reservation_date, slot),
    UNIQUE KEY uq_reservation_equipment_reference (id, equipment_id),
    INDEX ix_reservation_user (user_id, created_at),
    INDEX ix_reservation_filter (reservation_date, equipment_id, status)
) ENGINE=InnoDB;

-- 取消时删除；归还后保留。唯一键是预约防重的最后一道保障。
CREATE TABLE slot_occupancy (
    equipment_id BIGINT NOT NULL,
    reservation_date DATE NOT NULL,
    slot VARCHAR(10) NOT NULL,
    reservation_id BIGINT NOT NULL UNIQUE,
    PRIMARY KEY (equipment_id, reservation_date, slot),
    CONSTRAINT fk_occupancy_reservation FOREIGN KEY (reservation_id, equipment_id, reservation_date, slot)
      REFERENCES reservation(id, equipment_id, reservation_date, slot)
) ENGINE=InnoDB;

-- 无论预约日期/时段是否相同，一台实物最多只有一个未归还的领用。
CREATE TABLE active_loan (
    equipment_id BIGINT PRIMARY KEY,
    reservation_id BIGINT NOT NULL UNIQUE,
    CONSTRAINT fk_loan_reservation FOREIGN KEY (reservation_id, equipment_id) REFERENCES reservation(id, equipment_id)
) ENGINE=InnoDB;

CREATE TABLE demo_seed (id INT PRIMARY KEY, initialized BOOLEAN NOT NULL);
INSERT INTO demo_seed VALUES (1, FALSE);
