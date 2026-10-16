package com.example.equipment.auth;

import java.util.Collection;
import java.util.List;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

public record SessionUser(
    long id,
    String username,
    String password,
    String displayName,
    String role
) implements UserDetails {
    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of(new SimpleGrantedAuthority("ROLE_" + role));
    }

    @Override
    public String getUsername() {
        return username;
    }

    @Override
    public String getPassword() {
        return password;
    }

    public UserView view() {
        return new UserView(id, username, displayName, role);
    }

    public record UserView(
        long id,
        String username,
        String displayName,
        String role
    ) {}
}
