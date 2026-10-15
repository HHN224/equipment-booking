package com.example.equipment.config;

import com.example.equipment.auth.SessionUser;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.context.annotation.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.core.userdetails.*;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import java.io.IOException;
import java.util.Map;

@Configuration
@EnableMethodSecurity
public class SecurityConfig {
    @Bean PasswordEncoder passwordEncoder() { return new BCryptPasswordEncoder(); }
    @Bean UserDetailsService users(JdbcTemplate jdbc) {
        return username -> jdbc.query("SELECT * FROM app_user WHERE username = ?", (rs, n) ->
            new SessionUser(rs.getLong("id"), rs.getString("username"), rs.getString("password_hash"), rs.getString("display_name"), rs.getString("role")), username)
            .stream().findFirst().orElseThrow(() -> new UsernameNotFoundException("账号或密码错误"));
    }
    @Bean SecurityFilterChain security(HttpSecurity http, ObjectMapper mapper) throws Exception {
        // 保留 Spring Security 默认的 Session CSRF 防护；前端先获取 token 再提交。
        http.authorizeHttpRequests(auth -> auth
            .requestMatchers("/api/auth/csrf", "/api/auth/login").permitAll()
            .requestMatchers("/api/admin/**").hasRole("ADMIN")
            .anyRequest().authenticated())
            .requestCache(cache -> cache.disable())
            .formLogin(form -> form.loginProcessingUrl("/api/auth/login")
                .successHandler((req, res, auth) -> json(mapper, res, 200, ((SessionUser) auth.getPrincipal()).view()))
                .failureHandler((req, res, ex) -> json(mapper, res, 401, Map.of("message", "账号或密码错误"))))
            .logout(logout -> logout.logoutUrl("/api/auth/logout")
                .deleteCookies("JSESSIONID")
                .logoutSuccessHandler((req, res, auth) -> json(mapper, res, 200, Map.of("message", "已退出登录"))))
            .exceptionHandling(errors -> errors
                .authenticationEntryPoint((req, res, ex) -> json(mapper, res, 401, Map.of("message", "请先登录，或重新登录后重试")))
                .accessDeniedHandler((req, res, ex) -> json(mapper, res, 403, Map.of("message", "没有操作权限，或会话校验已失效，请刷新页面"))));
        return http.build();
    }
    private static void json(ObjectMapper mapper, HttpServletResponse response, int status, Object body) throws IOException {
        response.setStatus(status);
        response.setContentType("application/json;charset=UTF-8");
        mapper.writeValue(response.getWriter(), body);
    }
}
