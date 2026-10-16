package com.example.equipment;

import static org.assertj.core.api.Assertions.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.example.equipment.config.DemoDataInitializer;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.*;
import java.util.*;
import java.util.concurrent.*;
import java.util.function.IntFunction;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.testcontainers.containers.MySQLContainer;

/** 所有用例都经过真实 Spring Security、业务事务和 MySQL InnoDB，不使用 H2 或业务 mock。 */
@SpringBootTest(properties = "app.demo-data-enabled=false")
@AutoConfigureMockMvc
class BookingIntegrationTest {

    static MySQLContainer<?> mysql;

    @DynamicPropertySource
    static void database(DynamicPropertyRegistry registry) {
        String external = System.getenv("IT_DB_URL");
        if (external != null && !external.isBlank()) {
            if (!external.contains("equipment_booking_test")) {
                throw new IllegalStateException(
                    "集成测试只允许使用名称包含 equipment_booking_test 的专用数据库"
                );
            }
            registry.add("spring.datasource.url", () -> external);
            registry.add("spring.datasource.username", () -> System.getenv("IT_DB_USERNAME"));
            registry.add("spring.datasource.password", () -> System.getenv("IT_DB_PASSWORD"));
        } else {
            mysql = new MySQLContainer<>("mysql:8.4").withDatabaseName("equipment_booking_test");
            mysql.start();
            registry.add(
                "spring.datasource.url",
                () ->
                    mysql.getJdbcUrl() +
                    "&connectionTimeZone=UTC&forceConnectionTimeZoneToSession=true"
            );
            registry.add("spring.datasource.username", mysql::getUsername);
            registry.add("spring.datasource.password", mysql::getPassword);
        }
    }

    @AfterAll
    static void stopDatabase() {
        if (mysql != null) {
            mysql.stop();
        }
    }

    @TestConfiguration
    static class TimeConfig {

        @Bean
        @Primary
        Clock testClock() {
            return Clock.fixed(Instant.parse("2026-10-15T04:00:00Z"), ZoneId.of("Asia/Shanghai"));
        }
    }

    @Autowired
    MockMvc mvc;

    @Autowired
    JdbcTemplate jdbc;

    @Autowired
    ObjectMapper mapper;

    @Autowired
    PasswordEncoder encoder;

    MockHttpSession member1, member2, admin;

    @BeforeEach
    void prepare() throws Exception {
        jdbc.update("DELETE FROM active_loan");
        jdbc.update("DELETE FROM slot_occupancy");
        jdbc.update("DELETE FROM reservation");
        jdbc.update("DELETE FROM equipment");
        jdbc.update("DELETE FROM app_user");
        String hash = encoder.encode("Test123!");
        jdbc.update(
            "INSERT INTO app_user VALUES (1,'admin',?,'管理员','ADMIN'),(2,'member1',?,'成员甲','MEMBER'),(3,'member2',?,'成员乙','MEMBER')",
            hash,
            hash,
            hash
        );
        jdbc.update(
            "INSERT INTO equipment (id,asset_code,name,category,location,description,enabled) VALUES (1,'CAM-001','测试相机','相机','A01','测试说明',TRUE),(2,'PHN-001','测试手机','测试手机','C01','',TRUE)"
        );
        member1 = login("member1");
        member2 = login("member2");
        admin = login("admin");
    }

    MockHttpSession login(String username) throws Exception {
        var tokenResult = mvc.perform(get("/api/auth/csrf")).andExpect(status().isOk()).andReturn();
        var token = json(tokenResult);
        var result = mvc
            .perform(
                post("/api/auth/login")
                    .session((MockHttpSession) tokenResult.getRequest().getSession())
                    .header(token.get("headerName").asText(), token.get("token").asText())
                    .param("username", username)
                    .param("password", "Test123!")
            )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.username").value(username))
            .andReturn();
        return (MockHttpSession) result.getRequest().getSession();
    }

    JsonNode json(MvcResult result) throws Exception {
        return mapper.readTree(result.getResponse().getContentAsString());
    }

    String input(long equipment, String date, String slot) {
        return (
            "{\"equipmentId\":" +
            equipment +
            ",\"date\":\"" +
            date +
            "\",\"slot\":\"" +
            slot +
            "\"}"
        );
    }

    MockHttpServletRequestBuilder booking(
        MockHttpSession session,
        long equipment,
        String date,
        String slot
    ) {
        return post("/api/reservations")
            .session(session)
            .with(csrf())
            .contentType("application/json")
            .content(input(equipment, date, slot));
    }

    long book(MockHttpSession session, long equipment, String date, String slot) throws Exception {
        return json(
            mvc
                .perform(booking(session, equipment, date, slot))
                .andExpect(status().isOk())
                .andReturn()
        )
            .get("id")
            .asLong();
    }

    MvcResult act(MockHttpSession session, long id, String action) throws Exception {
        return mvc
            .perform(
                post(
                    (action.equals("cancel") ? "/api" : "/api/admin") +
                        "/reservations/" +
                        id +
                        "/" +
                        action
                )
                    .session(session)
                    .with(csrf())
            )
            .andReturn();
    }

    int count(String table) {
        return jdbc.queryForObject("SELECT COUNT(*) FROM " + table, Integer.class);
    }

    List<Integer> concurrently(int requests, IntFunction<Callable<Integer>> task) throws Exception {
        var executor = Executors.newFixedThreadPool(requests);
        var ready = new CountDownLatch(requests);
        var start = new CountDownLatch(1);
        try {
            var futures = new ArrayList<Future<Integer>>();
            for (int i = 0; i < requests; i++) {
                final int index = i;
                futures.add(
                    executor.submit(() -> {
                        ready.countDown();
                        if (!start.await(10, TimeUnit.SECONDS)) {
                            throw new IllegalStateException("start timeout");
                        }
                        return task.apply(index).call();
                    })
                );
            }
            assertThat(ready.await(10, TimeUnit.SECONDS)).isTrue();
            start.countDown();
            var results = new ArrayList<Integer>();
            for (var future : futures) {
                results.add(future.get(30, TimeUnit.SECONDS));
            }
            return results;
        } finally {
            start.countDown();
            executor.shutdownNow();
        }
    }

    @Test
    void memberBooksAdminPicksUpAndReturns() throws Exception {
        long id = book(member1, 1, "2026-10-16", "AM");
        assertThat(
            json(act(admin, id, "pickup"))
                .get("status")
                .asText()
        ).isEqualTo("PICKED_UP");
        var returned = act(admin, id, "return");
        assertThat(returned.getResponse().getStatus()).isEqualTo(200);
        assertThat(json(returned).get("status").asText()).isEqualTo("RETURNED");
        assertThat(json(returned).get("returnedAt").asText()).isEqualTo("2026-10-15T04:00:00Z");
        assertThat(count("active_loan")).isZero();
        assertThat(count("slot_occupancy")).isEqualTo(1);
    }

    @Test
    void cancellationReleasesSlotToAnotherMember() throws Exception {
        long id = book(member1, 1, "2026-10-16", "AM");
        assertThat(act(member1, id, "cancel").getResponse().getStatus()).isEqualTo(200);
        long next = book(member2, 1, "2026-10-16", "AM");
        assertThat(next).isNotEqualTo(id);
        assertThat(count("reservation")).isEqualTo(2);
        assertThat(count("slot_occupancy")).isEqualTo(1);
    }

    @Test
    void twelveConcurrentBookingsHaveExactlyOneWinnerAndNoOrphanRows() throws Exception {
        var statuses = concurrently(
            12,
            i -> () ->
                mvc
                    .perform(booking(i % 2 == 0 ? member1 : member2, 1, "2026-10-16", "AM"))
                    .andReturn()
                    .getResponse()
                    .getStatus()
        );
        assertThat(statuses).containsOnly(200, 409);
        assertThat(Collections.frequency(statuses, 200)).isEqualTo(1);
        assertThat(Collections.frequency(statuses, 409)).isEqualTo(11);
        assertThat(count("reservation")).isEqualTo(1);
        assertThat(count("slot_occupancy")).isEqualTo(1);
    }

    @Test
    void databaseUniqueConstraintRejectsDuplicateSlotWithoutApplicationLock() throws Exception {
        book(member1, 1, "2026-10-16", "AM");
        jdbc.update(
            "INSERT INTO reservation (id,equipment_id,user_id,reservation_date,slot,status) VALUES (999,1,3,'2026-10-16','AM','RESERVED')"
        );
        assertThatThrownBy(() ->
            jdbc.update("INSERT INTO slot_occupancy VALUES (1,'2026-10-16','AM',999)")
        ).isInstanceOf(DuplicateKeyException.class);
        assertThat(count("slot_occupancy")).isEqualTo(1);
    }

    @Test
    void duplicateBookingRollsBackReservationAndGivesReadableMessage() throws Exception {
        book(member1, 1, "2026-10-16", "AM");
        mvc.perform(booking(member1, 1, "2026-10-16", "AM"))
            .andExpect(status().isConflict())
            .andExpect(jsonPath("$.message").value("该时段刚刚被预约，请选择其他时段"));
        assertThat(count("reservation")).isEqualTo(1);
    }

    @Test
    void databaseUniqueConstraintRejectsTwoActiveLoansForOneDevice() throws Exception {
        long a = book(member1, 1, "2026-10-16", "AM");
        long b = book(member2, 1, "2026-10-17", "PM");
        jdbc.update("INSERT INTO active_loan VALUES (1,?)", a);
        assertThatThrownBy(() ->
            jdbc.update("INSERT INTO active_loan VALUES (1,?)", b)
        ).isInstanceOf(DuplicateKeyException.class);
        assertThat(count("active_loan")).isEqualTo(1);
    }

    @Test
    void membersCannotReadOrModifyOthersReservations() throws Exception {
        long id = book(member1, 1, "2026-10-16", "AM");
        mvc.perform(get("/api/reservations/" + id).session(member2)).andExpect(
            status().isNotFound()
        );
        assertThat(act(member2, id, "cancel").getResponse().getStatus()).isEqualTo(404);
        mvc.perform(get("/api/reservations/mine").session(member2).param("userId", "2")).andExpect(
            jsonPath("$.total").value(0)
        );
        assertThat(count("slot_occupancy")).isEqualTo(1);
        assertThat(act(admin, id, "cancel").getResponse().getStatus()).isEqualTo(404);
    }

    @Test
    void membersCannotCallAnyAdminInterface() throws Exception {
        long id = book(member1, 1, "2026-10-16", "AM");
        mvc.perform(get("/api/admin/reservations").session(member1)).andExpect(
            status().isForbidden()
        );
        assertThat(act(member1, id, "pickup").getResponse().getStatus()).isEqualTo(403);
        assertThat(act(member1, id, "return").getResponse().getStatus()).isEqualTo(403);
        mvc.perform(
            post("/api/admin/equipment")
                .session(member1)
                .with(csrf())
                .contentType("application/json")
                .content(equipmentInput(true))
        ).andExpect(status().isForbidden());
        mvc.perform(
            put("/api/admin/equipment/1")
                .session(member1)
                .with(csrf())
                .contentType("application/json")
                .content(equipmentInput(false))
        ).andExpect(status().isForbidden());
    }

    @Test
    void availabilityDoesNotExposeMemberInformation() throws Exception {
        book(member1, 1, "2026-10-16", "AM");
        var result = mvc
            .perform(
                get("/api/equipment/1/availability").session(member2).param("date", "2026-10-16")
            )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.slots[0].occupied").value(true))
            .andReturn();
        assertThat(result.getResponse().getContentAsString()).doesNotContain(
            "member1",
            "成员甲",
            "userId",
            "reservationId",
            "username",
            "memberName"
        );
    }

    @Test
    void cancelledAndReturnedAreTerminalStates() throws Exception {
        long cancelled = book(member1, 1, "2026-10-16", "AM");
        act(member1, cancelled, "cancel");
        for (var action : List.of("pickup", "return", "cancel")) {
            assertThat(
                act(action.equals("cancel") ? member1 : admin, cancelled, action)
                    .getResponse()
                    .getStatus()
            ).isEqualTo(409);
        }
        long returned = book(member1, 1, "2026-10-16", "PM");
        act(admin, returned, "pickup");
        act(admin, returned, "return");
        for (var action : List.of("pickup", "return", "cancel")) {
            assertThat(
                act(action.equals("cancel") ? member1 : admin, returned, action)
                    .getResponse()
                    .getStatus()
            ).isEqualTo(409);
        }
    }

    @Test
    void twoAdminsCannotPickUpSameDeviceOnDifferentReservations() throws Exception {
        long a = book(member1, 1, "2026-10-16", "AM"),
            b = book(member2, 1, "2026-10-17", "PM");
        MockHttpSession secondAdmin = login("admin");
        var results = concurrently(
            2,
            i -> () ->
                act(i == 0 ? admin : secondAdmin, i == 0 ? a : b, "pickup")
                    .getResponse()
                    .getStatus()
        );
        assertThat(results).containsExactlyInAnyOrder(200, 409);
        assertThat(count("active_loan")).isEqualTo(1);
        assertThat(
            jdbc.queryForObject(
                "SELECT COUNT(*) FROM reservation WHERE status='PICKED_UP'",
                Integer.class
            )
        ).isEqualTo(1);
        long activeId = jdbc.queryForObject("SELECT reservation_id FROM active_loan", Long.class);
        act(admin, activeId, "return");
        assertThat(
            act(admin, activeId == a ? b : a, "pickup")
                .getResponse()
                .getStatus()
        ).isEqualTo(200);
    }

    @Test
    void concurrentCancelAndPickupProduceOneValidState() throws Exception {
        long id = book(member1, 1, "2026-10-16", "AM");
        var results = concurrently(
            2,
            i -> () ->
                act(i == 0 ? member1 : admin, id, i == 0 ? "cancel" : "pickup")
                    .getResponse()
                    .getStatus()
        );
        assertThat(results).containsExactlyInAnyOrder(200, 409);
        String state = jdbc.queryForObject(
            "SELECT status FROM reservation WHERE id=?",
            String.class,
            id
        );
        assertThat(state).isIn("CANCELLED", "PICKED_UP");
        assertThat(count("slot_occupancy")).isEqualTo(state.equals("CANCELLED") ? 0 : 1);
        assertThat(count("active_loan")).isEqualTo(state.equals("CANCELLED") ? 0 : 1);
    }

    @Test
    void repeatedCancelCannotDeleteReplacementOccupancy() throws Exception {
        long id = book(member1, 1, "2026-10-16", "AM");
        act(member1, id, "cancel");
        book(member2, 1, "2026-10-16", "AM");
        assertThat(act(member1, id, "cancel").getResponse().getStatus()).isEqualTo(409);
        assertThat(count("slot_occupancy")).isEqualTo(1);
    }

    @Test
    void returnedSlotStaysOccupiedAndDoubleReturnIsRejected() throws Exception {
        long id = book(member1, 1, "2026-10-16", "AM");
        act(admin, id, "pickup");
        var results = concurrently(
            2,
            i -> () -> act(admin, id, "return").getResponse().getStatus()
        );
        assertThat(results).containsExactlyInAnyOrder(200, 409);
        mvc.perform(booking(member2, 1, "2026-10-16", "AM")).andExpect(status().isConflict());
        assertThat(count("active_loan")).isZero();
        assertThat(count("slot_occupancy")).isEqualTo(1);
    }

    String equipmentInput(boolean enabled) {
        return (
            "{\"assetCode\":\"CAM-001\",\"name\":\"相机\",\"category\":\"相机\",\"location\":\"A01\",\"description\":\"说明\",\"enabled\":" +
            enabled +
            "}"
        );
    }

    @Test
    void adminCanCreateAndEditEquipmentWithUniqueAssetCode() throws Exception {
        String input = equipmentInput(true).replace("CAM-001", "CAM-003");
        var created = mvc
            .perform(
                post("/api/admin/equipment")
                    .session(admin)
                    .with(csrf())
                    .contentType("application/json")
                    .content(input)
            )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.assetCode").value("CAM-003"))
            .andReturn();
        long id = json(created).get("id").asLong();
        mvc.perform(
            put("/api/admin/equipment/" + id)
                .session(admin)
                .with(csrf())
                .contentType("application/json")
                .content(equipmentInput(false).replace("CAM-001", "CAM-003"))
        )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.enabled").value(false));
        mvc.perform(get("/api/equipment/" + id).session(member1))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.enabled").value(false));
        mvc.perform(
            post("/api/admin/equipment")
                .session(admin)
                .with(csrf())
                .contentType("application/json")
                .content(input)
        ).andExpect(status().isConflict());
        assertThat(count("equipment")).isEqualTo(3);
    }

    @Test
    void disabledEquipmentRejectsNewBookingsButAllowsExistingLoanFlow() throws Exception {
        long id = book(member1, 1, "2026-10-16", "AM");
        mvc.perform(
            put("/api/admin/equipment/1")
                .session(admin)
                .with(csrf())
                .contentType("application/json")
                .content(equipmentInput(false))
        ).andExpect(status().isOk());
        mvc.perform(booking(member2, 1, "2026-10-16", "PM")).andExpect(status().isConflict());
        assertThat(act(admin, id, "pickup").getResponse().getStatus()).isEqualTo(200);
        assertThat(act(admin, id, "return").getResponse().getStatus()).isEqualTo(200);
    }

    @Test
    void dateWindowAndExactSlotEndUseShanghaiTime() throws Exception {
        mvc.perform(booking(member1, 1, "2026-10-15", "AM")).andExpect(status().isBadRequest()); // 恰好 12:00，上午已结束。
        book(member1, 1, "2026-10-15", "PM");
        book(member1, 1, "2026-11-14", "AM"); // 第 30 天允许。
        mvc.perform(booking(member1, 1, "2026-11-15", "AM")).andExpect(status().isBadRequest());
        mvc.perform(booking(member1, 1, "2026-10-14", "PM")).andExpect(status().isBadRequest());
        mvc.perform(get("/api/calendar").session(member1))
            .andExpect(jsonPath("$.today").value("2026-10-15"))
            .andExpect(jsonPath("$.timezone").value("Asia/Shanghai"));
    }

    @Test
    void filtersAndPaginationDoNotLeakOtherMembers() throws Exception {
        book(member1, 1, "2026-10-16", "AM");
        book(member1, 2, "2026-10-17", "AM");
        book(member2, 1, "2026-10-18", "AM");
        mvc.perform(get("/api/reservations/mine").session(member1).param("size", "1"))
            .andExpect(jsonPath("$.total").value(2))
            .andExpect(jsonPath("$.items.length()").value(1));
        mvc.perform(
            get("/api/admin/reservations")
                .session(admin)
                .param("date", "2026-10-16")
                .param("equipmentId", "1")
                .param("member", "成员甲")
                .param("status", "RESERVED")
        ).andExpect(jsonPath("$.total").value(1));
        mvc.perform(
            get("/api/equipment")
                .session(member1)
                .param("category", "测试手机")
                .param("name", "手机")
        ).andExpect(jsonPath("$.total").value(1));
    }

    @Test
    void realSessionLoginCsrfAndLogoutWork() throws Exception {
        mvc.perform(get("/api/equipment")).andExpect(status().isUnauthorized());
        mvc.perform(
            post("/api/reservations")
                .session(member1)
                .contentType("application/json")
                .content(input(1, "2026-10-16", "AM"))
        ).andExpect(status().isForbidden());
        var token = json(mvc.perform(get("/api/auth/csrf").session(member1)).andReturn());
        mvc.perform(
            post("/api/reservations")
                .session(member1)
                .header(token.get("headerName").asText(), token.get("token").asText())
                .contentType("application/json")
                .content(input(1, "2026-10-16", "AM"))
        ).andExpect(status().isOk());
        mvc.perform(post("/api/auth/logout").session(member1).with(csrf())).andExpect(
            status().isOk()
        );
        assertThat(member1.isInvalid()).isTrue();
        var badLogin = mvc
            .perform(
                post("/api/auth/login")
                    .with(csrf())
                    .param("username", "admin")
                    .param("password", "wrong")
            )
            .andExpect(status().isUnauthorized())
            .andReturn();
        assertThat(badLogin.getResponse().getContentAsString()).contains("账号或密码错误");
        assertThat(
            jdbc.queryForObject("SELECT password_hash FROM app_user WHERE id=1", String.class)
        )
            .startsWith("$2")
            .doesNotContain("Test123!");
    }

    @Test
    void malformedInputsReturnBusinessFriendlyErrors() throws Exception {
        mvc.perform(booking(member1, 1, "not-a-date", "AM")).andExpect(status().isBadRequest());
        mvc.perform(booking(member1, 1, "2026-10-16", "NIGHT")).andExpect(status().isBadRequest());
        mvc.perform(booking(member1, 0, "2026-10-16", "AM")).andExpect(status().isBadRequest());
        mvc.perform(booking(member1, 999, "2026-10-16", "AM")).andExpect(status().isNotFound());
        mvc.perform(get("/api/reservations/mine").session(member1).param("page", "0")).andExpect(
            status().isBadRequest()
        );
        mvc.perform(
            post("/api/admin/equipment")
                .session(admin)
                .with(csrf())
                .contentType("application/json")
                .content(equipmentInput(true))
        ).andExpect(status().isConflict());
    }

    @Test
    void demoSeedIsRepeatableAndDatesFollowBusinessClock() {
        jdbc.update("DELETE FROM equipment");
        jdbc.update("DELETE FROM app_user");
        jdbc.update("UPDATE demo_seed SET initialized=FALSE WHERE id=1");
        var initializer = new DemoDataInitializer(
            jdbc,
            encoder,
            new org.springframework.transaction.support.TransactionTemplate(
                new org.springframework.jdbc.datasource.DataSourceTransactionManager(
                    Objects.requireNonNull(jdbc.getDataSource())
                )
            ),
            Clock.fixed(Instant.parse("2026-10-15T04:00:00Z"), ZoneId.of("Asia/Shanghai")),
            true
        );
        initializer.run(null);
        initializer.run(null);
        assertThat(count("app_user")).isEqualTo(3);
        assertThat(count("equipment")).isEqualTo(8);
        assertThat(count("reservation")).isEqualTo(4);
        assertThat(
            jdbc.queryForObject(
                "SELECT reservation_date FROM reservation WHERE id=1",
                LocalDate.class
            )
        ).isEqualTo(LocalDate.parse("2026-10-16"));
        assertThat(count("active_loan")).isEqualTo(1);
        assertThat(count("slot_occupancy")).isEqualTo(3);
    }
}
